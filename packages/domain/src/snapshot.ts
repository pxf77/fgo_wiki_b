import type { DatasetSnapshot } from "./model.js";
import {
  assertDatasetVersion,
  assertSourceVersionToken,
} from "./versioning.js";

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertSourceVersions(value: unknown): void {
  const sourceVersions = asRecord(value, "Dataset snapshot metadata.sourceVersions");
  assertSourceVersionToken(
    sourceVersions.releaseEvidence,
    "Dataset snapshot metadata.sourceVersions.releaseEvidence",
  );
  assertSourceVersionToken(
    sourceVersions.strengtheningEvidence,
    "Dataset snapshot metadata.sourceVersions.strengtheningEvidence",
  );
}

export function assertDatasetSnapshot(value: unknown): asserts value is DatasetSnapshot {
  const candidate = asRecord(value, "Dataset snapshot");
  const metadata = asRecord(candidate.metadata, "Dataset snapshot metadata");

  if (!Array.isArray(candidate.servants)) {
    throw new TypeError("Dataset snapshot servants must be an array");
  }
  if (!Array.isArray(candidate.rankings)) {
    throw new TypeError("Dataset snapshot rankings must be an array");
  }
  if (!Array.isArray(candidate.changelog)) {
    throw new TypeError("Dataset snapshot changelog must be an array");
  }

  if (metadata.region !== "CN") {
    throw new TypeError("Dataset snapshot metadata.region must be CN");
  }
  assertDatasetVersion(
    metadata.datasetVersion,
    "Dataset snapshot metadata.datasetVersion",
  );
  if (metadata.sourceStatus !== "bootstrap" && metadata.sourceStatus !== "reviewed") {
    throw new TypeError("Dataset snapshot metadata.sourceStatus is invalid");
  }
  if (metadata.sourceVersions !== undefined) {
    assertSourceVersions(metadata.sourceVersions);
  }
  if (metadata.sourceStatus === "reviewed" && metadata.sourceVersions === undefined) {
    throw new TypeError(
      "Reviewed dataset snapshot metadata.sourceVersions is required",
    );
  }
}
