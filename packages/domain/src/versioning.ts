import type { DatasetMetadata, DatasetSourceVersions } from "./model.js";

const sourceVersionPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;
const datasetVersionPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/;
const rankingDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const datasetSourceVersionKeys = [
  "atlasCn",
  "releaseEvidence",
  "strengtheningEvidence",
  "publicationPolicy",
  "capabilityRules",
  "rankingFormula",
] as const;

export type DatasetSourceVersionKey =
  (typeof datasetSourceVersionKeys)[number];

export interface DatasetVersionInput {
  rankingAsOf: string;
  rankingRevision: number;
  sourceStatus: DatasetMetadata["sourceStatus"];
  sourceVersions?: DatasetSourceVersions;
}

export function assertSourceVersionToken(
  value: unknown,
  context: string,
): asserts value is string {
  if (typeof value !== "string" || !sourceVersionPattern.test(value)) {
    throw new TypeError(
      `${context} must be a path-safe version token using letters, numbers, dot, underscore or hyphen (max 96 characters)`,
    );
  }
}

export function assertDatasetSourceVersions(
  value: unknown,
  context = "sourceVersions",
): asserts value is DatasetSourceVersions {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be an object`);
  }
  const sourceVersions = value as Record<string, unknown>;
  for (const key of datasetSourceVersionKeys) {
    assertSourceVersionToken(sourceVersions[key], `${context}.${key}`);
  }
}

export function assertDatasetVersion(
  value: unknown,
  context = "datasetVersion",
): asserts value is string {
  if (typeof value !== "string" || !datasetVersionPattern.test(value)) {
    throw new TypeError(
      `${context} must be a path-safe dataset version (max 256 characters)`,
    );
  }
}

export function createDatasetVersion(input: DatasetVersionInput): string {
  if (!rankingDatePattern.test(input.rankingAsOf)) {
    throw new TypeError("rankingAsOf must use YYYY-MM-DD");
  }
  if (!Number.isInteger(input.rankingRevision) || input.rankingRevision <= 0) {
    throw new TypeError("rankingRevision must be a positive integer");
  }

  const rankingVersion = `${input.rankingAsOf}-r${input.rankingRevision}`;
  if (input.sourceStatus === "bootstrap") {
    const version = `${rankingVersion}--bootstrap`;
    assertDatasetVersion(version);
    return version;
  }

  if (!input.sourceVersions) {
    throw new TypeError("Reviewed dataset version requires sourceVersions");
  }
  assertDatasetSourceVersions(input.sourceVersions);

  const source = input.sourceVersions;
  const version =
    `${rankingVersion}` +
    `--atlas-${source.atlasCn}` +
    `--rel-${source.releaseEvidence}` +
    `--str-${source.strengtheningEvidence}` +
    `--pub-${source.publicationPolicy}` +
    `--cap-${source.capabilityRules}` +
    `--rank-${source.rankingFormula}`;
  assertDatasetVersion(version);
  return version;
}
