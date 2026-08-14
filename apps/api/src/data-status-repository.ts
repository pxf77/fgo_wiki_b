import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  DataClassCoverage,
  DataMissingSourceCandidate,
  DataReleaseSource,
  DataStatusDashboard,
  DataStrengtheningSource,
  DatasetSourceVersions,
  OfficialSource,
  ServantClass,
  StrengtheningStatus,
  StrengtheningTarget,
} from "@fgo-wiki/domain";
import type { DataRepository } from "./repository.js";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

function repositoryPath(value: string): string {
  return resolve(repositoryRoot, value);
}

export interface DataStatusFileConfig {
  normalizationReportPath: string;
  classCatalogReportPath: string;
  releaseSourcePath: string;
  releaseGateReportPath: string;
  strengtheningSourcePath: string;
  strengtheningGateReportPath: string;
}

interface AtlasNormalizationReport {
  inputCount: number;
  acceptedCount: number;
  skipped: unknown[];
  warnings: unknown[];
}

interface ClassCatalogReport {
  classes: DataClassCoverage[];
}

interface ReleaseSourceEntry {
  collectionNo: number;
  servantId: string;
  displayName: string;
  expected: {
    className: ServantClass;
    rarity: 1 | 2 | 3 | 4 | 5;
  };
  release: {
    status: "released" | "announced";
    releasedAt: string;
    evidence: OfficialSource;
  };
}

interface ReleaseSourceManifest {
  version: string;
  entries: ReleaseSourceEntry[];
}

interface ReleaseGateReport {
  evidenceVersion: string;
  passed: Array<{ servantId: string }>;
  blocked: DataMissingSourceCandidate[];
}

interface StrengtheningSourceEntry {
  id: string;
  servantId: string;
  status: StrengtheningStatus;
  target: StrengtheningTarget;
  releasedAt: string;
  evidence: OfficialSource;
  summary: string[];
}

interface StrengtheningSourceManifest {
  version: string;
  events: StrengtheningSourceEntry[];
}

interface StrengtheningGateReport {
  evidenceVersion: string;
  applied: Array<{ eventId: string }>;
}

export interface DataStatusRepository {
  getDashboard(): Promise<DataStatusDashboard>;
}

export interface FileDataStatusRepositoryOptions {
  files: DataStatusFileConfig;
  dataRepository: DataRepository;
  now?: () => Date;
}

export class DataStatusUnavailableError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DataStatusUnavailableError";
  }
}

async function readJson<T>(path: string): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new DataStatusUnavailableError(
      `Data status input is unavailable at ${path}: ${detail}`,
    );
  }
}

function sourceVersionKeys(): Array<keyof DatasetSourceVersions> {
  return ["releaseEvidence", "strengtheningEvidence"];
}

function countRankingEntries(
  rankings: readonly { entries: readonly unknown[] }[],
): number {
  return rankings.reduce((total, ranking) => total + ranking.entries.length, 0);
}

export function loadDataStatusFileConfig(
  environment: NodeJS.ProcessEnv = process.env,
): DataStatusFileConfig {
  return {
    normalizationReportPath: repositoryPath(
      environment.ATLAS_NORMALIZATION_REPORT_PATH ??
        "data/reports/atlas-normalization.json",
    ),
    classCatalogReportPath: repositoryPath(
      environment.CN_CLASS_CATALOG_REPORT_PATH ??
        "data/reports/cn-class-catalog.json",
    ),
    releaseSourcePath: repositoryPath(
      environment.CN_RELEASE_EVIDENCE_PATH ??
        "data/cn-release-evidence.json",
    ),
    releaseGateReportPath: repositoryPath(
      environment.CN_RELEASE_GATE_REPORT_PATH ??
        "data/reports/cn-release-gate.json",
    ),
    strengtheningSourcePath: repositoryPath(
      environment.CN_STRENGTHENING_EVIDENCE_PATH ??
        "data/cn-strengthening-evidence.json",
    ),
    strengtheningGateReportPath: repositoryPath(
      environment.CN_STRENGTHENING_GATE_REPORT_PATH ??
        "data/reports/cn-strengthening-gate.json",
    ),
  };
}

export function createFileDataStatusRepository(
  options: FileDataStatusRepositoryOptions,
): DataStatusRepository {
  const now = options.now ?? (() => new Date());

  return {
    async getDashboard(): Promise<DataStatusDashboard> {
      const [
        normalization,
        classCatalog,
        releaseSource,
        releaseGate,
        strengtheningSource,
        strengtheningGate,
      ] = await Promise.all([
        readJson<AtlasNormalizationReport>(
          options.files.normalizationReportPath,
        ),
        readJson<ClassCatalogReport>(options.files.classCatalogReportPath),
        readJson<ReleaseSourceManifest>(options.files.releaseSourcePath),
        readJson<ReleaseGateReport>(options.files.releaseGateReportPath),
        readJson<StrengtheningSourceManifest>(
          options.files.strengtheningSourcePath,
        ),
        readJson<StrengtheningGateReport>(
          options.files.strengtheningGateReportPath,
        ),
      ]);

      const snapshot = options.dataRepository.getSnapshot();
      const passedServants = new Set(
        releaseGate.passed.map((entry) => entry.servantId),
      );
      const appliedEvents = new Set(
        strengtheningGate.applied.map((entry) => entry.eventId),
      );

      const releaseSources = releaseSource.entries
        .map<DataReleaseSource>((entry) => ({
          collectionNo: entry.collectionNo,
          servantId: entry.servantId,
          displayName: entry.displayName,
          className: entry.expected.className,
          rarity: entry.expected.rarity,
          status: entry.release.status,
          releasedAt: entry.release.releasedAt,
          evidence: entry.release.evidence,
          gateStatus: passedServants.has(entry.servantId)
            ? "passed"
            : "pending",
        }))
        .sort((left, right) => left.collectionNo - right.collectionNo);

      const strengtheningSources = strengtheningSource.events
        .map<DataStrengtheningSource>((entry) => ({
          id: entry.id,
          servantId: entry.servantId,
          status: entry.status,
          target: entry.target,
          releasedAt: entry.releasedAt,
          evidence: entry.evidence,
          summary: [...entry.summary],
          gateStatus: appliedEvents.has(entry.id) ? "applied" : "pending",
        }))
        .sort(
          (left, right) =>
            Date.parse(left.releasedAt) - Date.parse(right.releasedAt) ||
            left.id.localeCompare(right.id),
        );

      const sourceManifestVersions: DatasetSourceVersions = {
        releaseEvidence: releaseSource.version,
        strengtheningEvidence: strengtheningSource.version,
      };
      const gateSourceVersions: DatasetSourceVersions = {
        releaseEvidence: releaseGate.evidenceVersion,
        strengtheningEvidence: strengtheningGate.evidenceVersion,
      };
      const publishedSourceVersions = snapshot.metadata.sourceVersions;
      const staleSourceVersions = sourceVersionKeys().filter(
        (key) =>
          publishedSourceVersions?.[key] !== sourceManifestVersions[key],
      );
      const blockers: string[] = [];

      for (const key of sourceVersionKeys()) {
        if (gateSourceVersions[key] !== sourceManifestVersions[key]) {
          blockers.push(
            `${key} gate version ${gateSourceVersions[key]} does not match source manifest ${sourceManifestVersions[key]}`,
          );
        }
      }

      const pendingReleaseCount = releaseSources.filter(
        (entry) => entry.gateStatus === "pending",
      ).length;
      if (pendingReleaseCount > 0) {
        blockers.push(
          `${pendingReleaseCount} release source entries have not passed the gate`,
        );
      }

      const pendingStrengtheningCount = strengtheningSources.filter(
        (entry) => entry.gateStatus === "pending",
      ).length;
      if (pendingStrengtheningCount > 0) {
        blockers.push(
          `${pendingStrengtheningCount} strengthening events have not been applied`,
        );
      }

      const publicationStatus =
        snapshot.metadata.sourceStatus === "bootstrap"
          ? "bootstrap"
          : blockers.length > 0
            ? "blocked"
            : staleSourceVersions.length > 0
              ? "stale"
              : "ready";

      return {
        generatedAt: now().toISOString(),
        counts: {
          atlasCandidates: normalization.acceptedCount,
          passedReleases: releaseGate.passed.length,
          missingSourceCandidates: releaseGate.blocked.length,
          strengtheningEvents: strengtheningSource.events.length,
          rankingEntries: countRankingEntries(snapshot.rankings),
        },
        normalization: {
          inputCount: normalization.inputCount,
          acceptedCount: normalization.acceptedCount,
          skippedCount: normalization.skipped.length,
          warningCount: normalization.warnings.length,
        },
        publication: {
          status: publicationStatus,
          datasetVersion: snapshot.metadata.datasetVersion,
          sourceStatus: snapshot.metadata.sourceStatus,
          sourceManifestVersions,
          gateSourceVersions,
          ...(publishedSourceVersions
            ? { publishedSourceVersions }
            : {}),
          staleSourceVersions,
          blockers,
        },
        classCoverage: [...classCatalog.classes],
        missingSourceCandidates: [...releaseGate.blocked].sort(
          (left, right) => left.collectionNo - right.collectionNo,
        ),
        releaseSources,
        strengtheningSources,
        rankings: snapshot.rankings.map((ranking) => ({
          mode: ranking.mode,
          asOf: ranking.asOf,
          revision: ranking.revision,
          entryCount: ranking.entries.length,
        })),
      };
    },
  };
}

export function createDataStatusRepository(
  dataRepository: DataRepository,
  environment: NodeJS.ProcessEnv = process.env,
): DataStatusRepository {
  return createFileDataStatusRepository({
    files: loadDataStatusFileConfig(environment),
    dataRepository,
  });
}
