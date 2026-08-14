import type { DatasetSnapshot } from "@fgo-wiki/domain";

export function selectPreferredSnapshot(
  bundled: DatasetSnapshot,
  cached: DatasetSnapshot | undefined,
): DatasetSnapshot {
  if (!cached) return bundled;
  if (
    bundled.metadata.sourceStatus === "reviewed" &&
    cached.metadata.sourceStatus !== "reviewed"
  ) {
    return bundled;
  }
  if (
    cached.metadata.sourceStatus === "reviewed" &&
    bundled.metadata.sourceStatus !== "reviewed"
  ) {
    return cached;
  }
  if (cached.metadata.datasetVersion === bundled.metadata.datasetVersion) {
    return cached;
  }

  return Date.parse(cached.metadata.publishedAt) >
    Date.parse(bundled.metadata.publishedAt)
    ? cached
    : bundled;
}
