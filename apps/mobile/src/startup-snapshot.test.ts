import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapSnapshot, type DatasetSnapshot } from "@fgo-wiki/domain";
import { selectPreferredSnapshot } from "./startup-snapshot.js";

function makeSnapshot(
  datasetVersion: string,
  publishedAt: string,
  sourceStatus: DatasetSnapshot["metadata"]["sourceStatus"] = "reviewed",
): DatasetSnapshot {
  const snapshot = structuredClone(bootstrapSnapshot);
  snapshot.metadata.datasetVersion = datasetVersion;
  snapshot.metadata.publishedAt = publishedAt;
  snapshot.metadata.sourceStatus = sourceStatus;
  if (sourceStatus === "reviewed") {
    snapshot.metadata.sourceVersions = {
      releaseEvidence: "release-r1",
      strengtheningEvidence: "strengthening-r1",
    };
  } else {
    delete snapshot.metadata.sourceVersions;
  }
  return snapshot;
}

test("uses the bundled snapshot when no cache exists", () => {
  const bundled = makeSnapshot("bundled", "2026-08-14T00:00:00.000Z");
  assert.equal(selectPreferredSnapshot(bundled, undefined), bundled);
});

test("uses a newer cached snapshot", () => {
  const bundled = makeSnapshot("bundled", "2026-08-14T00:00:00.000Z");
  const cached = makeSnapshot("cached", "2026-08-15T00:00:00.000Z");
  assert.equal(selectPreferredSnapshot(bundled, cached), cached);
});

test("does not let an older cache downgrade a newly installed bundle", () => {
  const bundled = makeSnapshot("bundled", "2026-08-15T00:00:00.000Z");
  const cached = makeSnapshot("cached", "2026-08-14T00:00:00.000Z");
  assert.equal(selectPreferredSnapshot(bundled, cached), bundled);
});

test("does not let a Bootstrap cache replace reviewed bundled data", () => {
  const bundled = makeSnapshot("reviewed", "2026-08-14T00:00:00.000Z");
  const cached = makeSnapshot(
    "bootstrap",
    "2026-08-15T00:00:00.000Z",
    "bootstrap",
  );
  assert.equal(selectPreferredSnapshot(bundled, cached), bundled);
});

test("prefers reviewed cache over an explicit development bundle", () => {
  const bundled = makeSnapshot(
    "bootstrap",
    "2026-08-15T00:00:00.000Z",
    "bootstrap",
  );
  const cached = makeSnapshot("reviewed", "2026-08-14T00:00:00.000Z");
  assert.equal(selectPreferredSnapshot(bundled, cached), cached);
});

test("reuses cache storage for the same dataset identity", () => {
  const bundled = makeSnapshot("same-version", "2026-08-15T00:00:00.000Z");
  const cached = makeSnapshot("same-version", "2026-08-14T00:00:00.000Z");
  assert.equal(selectPreferredSnapshot(bundled, cached), cached);
});
