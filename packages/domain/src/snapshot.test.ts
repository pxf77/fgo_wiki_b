import assert from "node:assert/strict";
import test from "node:test";
import {
  bootstrapSnapshot,
  createDatasetVersion,
  type DatasetSourceVersions,
} from "./index.js";
import { assertDatasetSnapshot } from "./snapshot.js";

const reviewedSourceVersions: DatasetSourceVersions = {
  atlasCn: "cn-20260815T000000Z-abcdef123456",
  releaseEvidence: "release-r2",
  strengtheningEvidence: "strengthening-r3",
  publicationPolicy: "publication-v1",
  capabilityRules: "capability-v1",
  rankingFormula: "ranking-v2",
};

function reviewedSnapshot() {
  const snapshot = structuredClone(bootstrapSnapshot);
  snapshot.metadata.sourceStatus = "reviewed";
  snapshot.metadata.sourceVersions = { ...reviewedSourceVersions };
  snapshot.metadata.datasetVersion = createDatasetVersion({
    rankingAsOf: "2026-08-13",
    rankingRevision: 1,
    sourceStatus: "reviewed",
    sourceVersions: reviewedSourceVersions,
  });
  return snapshot;
}

test("accepts a deeply valid reviewed snapshot", () => {
  assert.doesNotThrow(() => assertDatasetSnapshot(reviewedSnapshot()));
});

test("rejects an invalid nested Noble Phantasm field", () => {
  const snapshot = reviewedSnapshot();
  snapshot.servants[0]!.noblePhantasms[0]!.color = "blue" as "quick";
  assert.throws(
    () => assertDatasetSnapshot(snapshot),
    /noblePhantasms\[0\]\.color is invalid/,
  );
});

test("rejects duplicate servant identities", () => {
  const snapshot = reviewedSnapshot();
  snapshot.servants.push(structuredClone(snapshot.servants[0]!));
  assert.throws(
    () => assertDatasetSnapshot(snapshot),
    /servant ids must not contain duplicates/,
  );
});

test("rejects a ranking entry for an unknown servant", () => {
  const snapshot = reviewedSnapshot();
  snapshot.rankings[0]!.entries[0]!.servantId = "unknown-servant";
  assert.throws(
    () => assertDatasetSnapshot(snapshot),
    /references unknown servant unknown-servant/,
  );
});

test("requires every source identity on reviewed data", () => {
  const snapshot = reviewedSnapshot();
  delete (snapshot.metadata.sourceVersions as unknown as Record<string, unknown>)
    .rankingFormula;
  assert.throws(
    () => assertDatasetSnapshot(snapshot),
    /sourceVersions\.rankingFormula/,
  );
});
