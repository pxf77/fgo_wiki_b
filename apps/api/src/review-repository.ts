import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  DatasetSourceVersions,
  OfficialSource,
  ReviewBlockedCandidate,
  ReviewDashboard,
  ReviewReleaseSource,
  ReviewStrengtheningSource,
  ServantClass,
  StrengtheningStatus,
  StrengtheningTarget,
} from "@fgo-wiki/domain";
import type { DataRepository } from "./repository.js";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

function repositoryPath(value: string): string {
  return resolve(repositoryRoot, value);
}

export interface ReviewFileConfig {
  normalizationReportPath: string;
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
  approved: Array<{ servantId: string }>;
  blocked: ReviewBlockedCandidate[];
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

export interface ReviewRepository {
  getDashboard(): Promise<ReviewDashboard>;
}

export interface FileReviewRepositoryOptions {
  files: ReviewFileConfig;
  dataRepository: DataRepository;
  now?: () => Date;
}

export class ReviewDataUnavailableError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ReviewDataUnavailableError";
  }
}

async function readJson<T>(path: string): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ReviewDataUnavailableError(
      `Review data is unavailable at ${path}: ${detail}`,
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

export function loadReviewFileConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ReviewFileConfig {
  return {
    normalizationReportPath: repositoryPath(
      environment.ATLAS_NORMALIZATION_REPORT_PATH ??
        "data/reports/atlas-normalization.json",
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

export function createFileReviewRepository(
  options: FileReviewRepositoryOptions,
): ReviewRepository {
  const now = options.now ?? (() => new Date());

  return {
    async getDashboard(): Promise<ReviewDashboard> {
      const [
        normalization,
        releaseSource,
        releaseGate,
        strengtheningSource,
        strengtheningGate,
      ] = await Promise.all([
        readJson<AtlasNormalizationReport>(
          options.files.normalizationReportPath,
        ),
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
      const approvedServants = new Set(
        releaseGate.approved.map((entry) => entry.servantId),
      );
      const appliedEvents = new Set(
        strengtheningGate.applied.map((entry) => entry.eventId),
      );

      const releaseSources = releaseSource.entries
        .map<ReviewReleaseSource>((entry) => ({
          collectionNo: entry.collectionNo,
          servantId: entry.servantId,
          displayName: entry.displayName,
          className: entry.expected.className,
          rarity: entry.expected.rarity,
          status: entry.release.status,
          releasedAt: entry.release.releasedAt,
          evidence: entry.release.evidence,
          gateStatus: approvedServants.has(entry.servantId)
            ? "approved"
            : "not_applied",
        }))
        .sort((left, right) => left.collectionNo - right.collectionNo);

      const strengtheningSources = strengtheningSource.events
        .map<ReviewStrengtheningSource>((entry) => ({
          id: entry.id,
          servantId: entry.servantId,
          status: entry.status,
          target: entry.target,
          releasedAt: entry.releasedAt,
          evidence: entry.evidence,
          summary: [...entry.summary],
          gateStatus: appliedEvents.has(entry.id)
            ? "applied"
            : "not_applied",
        }))
        .sort(
          (left, right) =>
            Date.parse(left.releasedAt) - Date.parse(right.releasedAt) ||
            left.id.localeCompare(right.id),
        );

      const reviewedSourceVersions: DatasetSourceVersions = {
        releaseEvidence: releaseSource.version,
        strengtheningEvidence: strengtheningSource.version,
      };
      const gateSourceVersions: DatasetSourceVersions = {
        releaseEvidence: releaseGate.evidenceVersion,
        strengtheningEvidence: strengtheningGate.evidenceVersion,
      };
      const publishedSourceVersions = snapshot.metadata.sourceVersions;
      const pendingSourceVersions = sourceVersionKeys().filter(
        (key) =>
          publishedSourceVersions?.[key] !== reviewedSourceVersions[key],
      );
      const blockers: string[] = [];

      for (const key of sourceVersionKeys()) {
        if (gateSourceVersions[key] !== reviewedSourceVersions[key]) {
          blockers.push(
            `${key} gate version ${gateSourceVersions[key]} does not match reviewed source ${reviewedSourceVersions[key]}`,
          );
        }
      }

      const unappliedReleaseCount = releaseSources.filter(
        (entry) => entry.gateStatus === "not_applied",
      ).length;
      if (unappliedReleaseCount > 0) {
        blockers.push(
          `${unappliedReleaseCount} reviewed release source entries are not applied`,
        );
      }

      const unappliedStrengtheningCount = strengtheningSources.filter(
        (entry) => entry.gateStatus === "not_applied",
      ).length;
      if (unappliedStrengtheningCount > 0) {
        blockers.push(
          `${unappliedStrengtheningCount} reviewed strengthening events are not applied`,
        );
      }

      const publicationStatus =
        snapshot.metadata.sourceStatus === "bootstrap"
          ? "bootstrap"
          : blockers.length > 0
            ? "blocked"
            : pendingSourceVersions.length > 0
              ? "pending_publication"
              : "ready";

      return {
        generatedAt: now().toISOString(),
        counts: {
          atlasCandidates: normalization.acceptedCount,
          approvedReleases: releaseGate.approved.length,
          blockedCandidates: releaseGate.blocked.length,
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
          reviewedSourceVersions,
          gateSourceVersions,
          ...(publishedSourceVersions
            ? { publishedSourceVersions }
            : {}),
          pendingSourceVersions,
          blockers,
        },
        blockedCandidates: [...releaseGate.blocked].sort(
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

export function createReviewRepository(
  dataRepository: DataRepository,
  environment: NodeJS.ProcessEnv = process.env,
): ReviewRepository {
  return createFileReviewRepository({
    files: loadReviewFileConfig(environment),
    dataRepository,
  });
}
