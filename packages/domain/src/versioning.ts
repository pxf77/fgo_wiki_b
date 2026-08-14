import type { DatasetMetadata, DatasetSourceVersions } from "./model.js";

const sourceVersionPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;
const datasetVersionPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/;
const rankingDatePattern = /^\d{4}-\d{2}-\d{2}$/;

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
  assertSourceVersionToken(
    input.sourceVersions.releaseEvidence,
    "sourceVersions.releaseEvidence",
  );
  assertSourceVersionToken(
    input.sourceVersions.strengtheningEvidence,
    "sourceVersions.strengtheningEvidence",
  );

  const version = `${rankingVersion}--rel-${input.sourceVersions.releaseEvidence}--str-${input.sourceVersions.strengtheningEvidence}`;
  assertDatasetVersion(version);
  return version;
}
