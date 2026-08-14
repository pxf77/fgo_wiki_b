import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  servantClasses,
  type CardColor,
  type NoblePhantasmScope,
  type ServantClass,
} from "@fgo-wiki/domain";
import type { AtlasServantCandidate } from "./normalize-atlas.js";
import {
  assertCnReleaseEvidenceManifest,
  type CnReleaseEvidenceEntry,
  type CnReleaseEvidenceManifest,
  type CnReleaseGateReport,
} from "./release-gate.js";
import {
  assertCnStrengtheningSource,
  type CnStrengtheningSourceManifest,
} from "./strengthening-source.js";

export type CatalogReleaseStatus = "passed" | "missing_source";
export type CatalogStrengtheningStatus =
  | "not_strengthened"
  | "evidenced"
  | "missing_event"
  | "unassessed";

export interface CnClassCoverageSummary {
  className: ServantClass;
  atlasCandidates: number;
  passedReleases: number;
  missingReleaseSources: number;
  atlasStrengthenedNps: number;
  evidencedReleasedNps: number;
  missingStrengtheningEvents: number;
}

export interface CnClassCatalogNoblePhantasm {
  atlasSourceId: number;
  name: string;
  color: CardColor;
  scope: NoblePhantasmScope;
  atlasStrengthened: boolean;
  hitCount?: number;
  targetId?: string;
  strengtheningStatus: CatalogStrengtheningStatus;
}

export interface CnClassCatalogCandidate {
  atlasId: number;
  collectionNo: number;
  name: string;
  originalName?: string;
  className: ServantClass;
  rarity: 1 | 2 | 3 | 4 | 5;
  releaseStatus: CatalogReleaseStatus;
  servantId?: string;
  noblePhantasms: CnClassCatalogNoblePhantasm[];
  releaseSourceDraft?: {
    collectionNo: number;
    displayName: string;
    aliases: string[];
    expected: {
      className: ServantClass;
      rarity: 1 | 2 | 3 | 4 | 5;
    };
    release: null;
    overrides: {
      charge: null;
      tags: string[];
      role: string[];
      noblePhantasms: Array<{
        atlasSourceId: number;
        id: string;
        name: string;
        color: CardColor;
        scope: NoblePhantasmScope;
        hitCount?: number;
        targetTraits: string[];
        effects: string[];
        strengthened: false;
      }>;
    };
  };
}

export interface CnMissingStrengtheningCandidate {
  className: ServantClass;
  collectionNo: number;
  servantId: string;
  atlasSourceId: number;
  targetId: string;
  name: string;
  color: CardColor;
  scope: NoblePhantasmScope;
}

export interface CnClassCatalogReport {
  schemaVersion: 1;
  generatedAt: string;
  classes: CnClassCoverageSummary[];
  candidates: CnClassCatalogCandidate[];
  missingStrengtheningEvents: CnMissingStrengtheningCandidate[];
}

function releaseEntryByCollectionNo(
  manifest: CnReleaseEvidenceManifest,
): Map<number, CnReleaseEvidenceEntry> {
  return new Map(
    manifest.entries.map((entry) => [entry.collectionNo, entry] as const),
  );
}

function releasedNpEventKeys(
  manifest: CnStrengtheningSourceManifest,
): Set<string> {
  return new Set(
    manifest.events.flatMap((event) =>
      event.status === "released" && event.target.type === "noble_phantasm"
        ? [`${event.servantId}:${event.target.targetId}`]
        : [],
    ),
  );
}

function createReleaseDraft(
  candidate: AtlasServantCandidate,
): NonNullable<CnClassCatalogCandidate["releaseSourceDraft"]> {
  return {
    collectionNo: candidate.collectionNo,
    displayName: candidate.name,
    aliases: [],
    expected: {
      className: candidate.className,
      rarity: candidate.rarity,
    },
    release: null,
    overrides: {
      charge: null,
      tags: [],
      role: [],
      noblePhantasms: candidate.noblePhantasms.map((np, index) => ({
        atlasSourceId: np.sourceId,
        id: `${candidate.className}-${candidate.collectionNo}-np-${index + 1}`,
        name: np.name,
        color: np.color,
        scope: np.scope,
        ...(np.hitCount !== undefined ? { hitCount: np.hitCount } : {}),
        targetTraits: [],
        effects: [],
        strengthened: false,
      })),
    },
  };
}

export function buildCnClassCatalog(
  candidates: readonly AtlasServantCandidate[],
  releaseSource: CnReleaseEvidenceManifest,
  releaseGate: CnReleaseGateReport,
  strengtheningSource: CnStrengtheningSourceManifest,
  generatedAt = new Date().toISOString(),
): CnClassCatalogReport {
  const releaseEntries = releaseEntryByCollectionNo(releaseSource);
  const passedServants = new Set(
    releaseGate.passed.map((entry) => entry.servantId),
  );
  const releasedEvents = releasedNpEventKeys(strengtheningSource);
  const missingStrengtheningEvents: CnMissingStrengtheningCandidate[] = [];

  const catalogCandidates = candidates.map<CnClassCatalogCandidate>((candidate) => {
    const releaseEntry = releaseEntries.get(candidate.collectionNo);
    const releasePassed =
      releaseEntry !== undefined && passedServants.has(releaseEntry.servantId);
    const curatedByAtlasSourceId = new Map(
      releaseEntry?.overrides.noblePhantasms.flatMap((np) =>
        np.atlasSourceId === undefined
          ? []
          : [[np.atlasSourceId, np] as const],
      ) ?? [],
    );

    const noblePhantasms = candidate.noblePhantasms.map<CnClassCatalogNoblePhantasm>(
      (np) => {
        const curated = curatedByAtlasSourceId.get(np.sourceId);
        let strengtheningStatus: CatalogStrengtheningStatus = "not_strengthened";

        if (np.strengthened) {
          if (
            releaseEntry === undefined ||
            !passedServants.has(releaseEntry.servantId) ||
            curated === undefined
          ) {
            strengtheningStatus = "unassessed";
          } else if (releasedEvents.has(`${releaseEntry.servantId}:${curated.id}`)) {
            strengtheningStatus = "evidenced";
          } else {
            strengtheningStatus = "missing_event";
            missingStrengtheningEvents.push({
              className: candidate.className,
              collectionNo: candidate.collectionNo,
              servantId: releaseEntry.servantId,
              atlasSourceId: np.sourceId,
              targetId: curated.id,
              name: np.name,
              color: np.color,
              scope: np.scope,
            });
          }
        }

        return {
          atlasSourceId: np.sourceId,
          name: np.name,
          color: np.color,
          scope: np.scope,
          atlasStrengthened: np.strengthened,
          ...(np.hitCount !== undefined ? { hitCount: np.hitCount } : {}),
          ...(curated ? { targetId: curated.id } : {}),
          strengtheningStatus,
        };
      },
    );

    return {
      atlasId: candidate.atlasId,
      collectionNo: candidate.collectionNo,
      name: candidate.name,
      ...(candidate.originalName
        ? { originalName: candidate.originalName }
        : {}),
      className: candidate.className,
      rarity: candidate.rarity,
      releaseStatus: releasePassed ? "passed" : "missing_source",
      ...(releasePassed && releaseEntry
        ? { servantId: releaseEntry.servantId }
        : { releaseSourceDraft: createReleaseDraft(candidate) }),
      noblePhantasms,
    };
  });

  const classes = servantClasses.flatMap((className) => {
    const classCandidates = catalogCandidates.filter(
      (candidate) => candidate.className === className,
    );
    if (classCandidates.length === 0) return [];

    const passedCandidates = classCandidates.filter(
      (candidate) => candidate.releaseStatus === "passed",
    );
    const assessedNps = passedCandidates.flatMap(
      (candidate) => candidate.noblePhantasms,
    );
    const atlasStrengthenedNps = assessedNps.filter(
      (np) => np.atlasStrengthened,
    );

    return [
      {
        className,
        atlasCandidates: classCandidates.length,
        passedReleases: passedCandidates.length,
        missingReleaseSources:
          classCandidates.length - passedCandidates.length,
        atlasStrengthenedNps: atlasStrengthenedNps.length,
        evidencedReleasedNps: atlasStrengthenedNps.filter(
          (np) => np.strengtheningStatus === "evidenced",
        ).length,
        missingStrengtheningEvents: atlasStrengthenedNps.filter(
          (np) => np.strengtheningStatus === "missing_event",
        ).length,
      },
    ];
  });

  return {
    schemaVersion: 1,
    generatedAt,
    classes,
    candidates: catalogCandidates,
    missingStrengtheningEvents,
  };
}

function assertReleaseGateReport(value: unknown): asserts value is CnReleaseGateReport {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("CN release gate report must be an object");
  }
  const report = value as Record<string, unknown>;
  if (!Array.isArray(report.passed) || !Array.isArray(report.blocked)) {
    throw new TypeError("CN release gate report passed/blocked arrays are required");
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeCnClassCatalogFile(
  candidatePath: string,
  releaseSourcePath: string,
  releaseGateReportPath: string,
  strengtheningSourcePath: string,
  outputPath: string,
): Promise<CnClassCatalogReport> {
  const candidateValue: unknown = JSON.parse(await readFile(candidatePath, "utf8"));
  if (!Array.isArray(candidateValue)) {
    throw new TypeError("Atlas normalized candidates must be an array");
  }

  const releaseSourceValue: unknown = JSON.parse(
    await readFile(releaseSourcePath, "utf8"),
  );
  assertCnReleaseEvidenceManifest(releaseSourceValue);

  const releaseGateValue: unknown = JSON.parse(
    await readFile(releaseGateReportPath, "utf8"),
  );
  assertReleaseGateReport(releaseGateValue);

  const strengtheningSourceValue: unknown = JSON.parse(
    await readFile(strengtheningSourcePath, "utf8"),
  );
  assertCnStrengtheningSource(strengtheningSourceValue);

  const report = buildCnClassCatalog(
    candidateValue as AtlasServantCandidate[],
    releaseSourceValue,
    releaseGateValue,
    strengtheningSourceValue,
  );
  await writeJson(outputPath, report);
  return report;
}
