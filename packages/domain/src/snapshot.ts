import type { DatasetSnapshot } from "./model.js";

export function assertDatasetSnapshot(value: unknown): asserts value is DatasetSnapshot {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Dataset snapshot must be an object");
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.metadata !== "object" || candidate.metadata === null) {
    throw new TypeError("Dataset snapshot metadata is required");
  }
  if (!Array.isArray(candidate.servants)) {
    throw new TypeError("Dataset snapshot servants must be an array");
  }
  if (!Array.isArray(candidate.rankings)) {
    throw new TypeError("Dataset snapshot rankings must be an array");
  }
  if (!Array.isArray(candidate.changelog)) {
    throw new TypeError("Dataset snapshot changelog must be an array");
  }

  const metadata = candidate.metadata as Record<string, unknown>;
  if (metadata.region !== "CN" || typeof metadata.datasetVersion !== "string") {
    throw new TypeError("Dataset snapshot metadata is invalid");
  }
}
