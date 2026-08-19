import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { bootstrapSnapshot } from "@fgo-wiki/domain";
import { loadMobileBuildSnapshot } from "./build-snapshot.js";

const reviewedVersion =
  "2026-08-13-r1--atlas-fixture-atlas-v1--rel-release-r1--str-strengthening-r1--pub-publication-v1--cap-capability-v1--rank-ranking-v2";

async function createReviewedSnapshotFile(): Promise<{
  directory: string;
  path: string;
}> {
  const directory = await mkdtemp(
    join(tmpdir(), "fgo-mobile-snapshot-"),
  );
  const path = join(directory, "snapshot.json");
  const snapshot = structuredClone(bootstrapSnapshot);
  snapshot.metadata = {
    ...snapshot.metadata,
    datasetVersion: reviewedVersion,
    sourceStatus: "reviewed",
    sourceVersions: {
      atlasCn: "fixture-atlas-v1",
      releaseEvidence: "release-r1",
      strengtheningEvidence: "strengthening-r1",
      publicationPolicy: "publication-v1",
      capabilityRules: "capability-v1",
      rankingFormula: "ranking-v2",
    },
  };
  await writeFile(
    path,
    `${JSON.stringify(snapshot)}\n`,
    "utf8",
  );
  return { directory, path };
}

test("loads reviewed data for the embedded mobile bundle", async () => {
  const fixture = await createReviewedSnapshotFile();
  try {
    const snapshot = await loadMobileBuildSnapshot({
      snapshotPath: fixture.path,
      repositoryRoot: fixture.directory,
    });
    assert.equal(snapshot.metadata.sourceStatus, "reviewed");
    assert.equal(
      snapshot.metadata.datasetVersion,
      reviewedVersion,
    );
  } finally {
    await rm(fixture.directory, {
      recursive: true,
      force: true,
    });
  }
});

test("fails the mobile build when the generated snapshot is missing", async () => {
  const directory = await mkdtemp(
    join(tmpdir(), "fgo-mobile-missing-"),
  );
  try {
    await assert.rejects(
      loadMobileBuildSnapshot({
        snapshotPath: join(directory, "missing.json"),
        repositoryRoot: directory,
      }),
      /Mobile build snapshot not found/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("allows Bootstrap data only through the explicit development flag", async () => {
  const directory = await mkdtemp(
    join(tmpdir(), "fgo-mobile-bootstrap-"),
  );
  const path = join(directory, "snapshot.json");
  await writeFile(
    path,
    `${JSON.stringify(bootstrapSnapshot)}\n`,
    "utf8",
  );
  try {
    await assert.rejects(
      loadMobileBuildSnapshot({
        snapshotPath: path,
        repositoryRoot: directory,
      }),
      /requires a reviewed snapshot/,
    );
    const snapshot = await loadMobileBuildSnapshot({
      snapshotPath: path,
      repositoryRoot: directory,
      allowBootstrapData: true,
    });
    assert.equal(snapshot.metadata.sourceStatus, "bootstrap");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
