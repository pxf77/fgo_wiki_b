import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { bootstrapSnapshot } from "@fgo-wiki/domain";
import { loadBuildSnapshot } from "./build-snapshot.js";

async function temporaryDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), "fgo-web-snapshot-"));
}

function reviewedSnapshot() {
  const snapshot = structuredClone(bootstrapSnapshot);
  snapshot.metadata.datasetVersion =
    "2026-08-13-r1--rel-release-r1--str-strengthening-r1";
  snapshot.metadata.sourceStatus = "reviewed";
  snapshot.metadata.sourceVersions = {
    releaseEvidence: "release-r1",
    strengtheningEvidence: "strengthening-r1",
  };
  return snapshot;
}

test("loads a reviewed snapshot for static Web generation", async (context) => {
  const directory = await temporaryDirectory();
  context.after(() => rm(directory, { recursive: true, force: true }));
  const snapshotPath = join(directory, "snapshot.json");
  await writeFile(snapshotPath, JSON.stringify(reviewedSnapshot()), "utf8");

  const snapshot = await loadBuildSnapshot({
    snapshotPath,
    allowBootstrapData: false,
  });

  assert.equal(snapshot.metadata.sourceStatus, "reviewed");
  assert.equal(snapshot.metadata.sourceVersions?.releaseEvidence, "release-r1");
});

test("fails a Web build when the generated snapshot is missing", async (context) => {
  const directory = await temporaryDirectory();
  context.after(() => rm(directory, { recursive: true, force: true }));

  await assert.rejects(
    loadBuildSnapshot({
      snapshotPath: join(directory, "missing.json"),
      allowBootstrapData: false,
    }),
    /Run pnpm snapshot:build before pnpm build/,
  );
});

test("allows Bootstrap data only through the explicit development flag", async (context) => {
  const directory = await temporaryDirectory();
  context.after(() => rm(directory, { recursive: true, force: true }));
  const snapshotPath = join(directory, "snapshot.json");
  await writeFile(snapshotPath, JSON.stringify(bootstrapSnapshot), "utf8");

  await assert.rejects(
    loadBuildSnapshot({ snapshotPath, allowBootstrapData: false }),
    /requires a reviewed snapshot/,
  );
  const snapshot = await loadBuildSnapshot({
    snapshotPath,
    allowBootstrapData: true,
  });
  assert.equal(snapshot.metadata.sourceStatus, "bootstrap");
});
