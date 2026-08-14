import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapSnapshot } from "@fgo-wiki/domain";
import { createReviewRepository, loadReviewFileConfig } from "./review-repository.js";

test("loads review files relative to the repository root", () => {
  const config = loadReviewFileConfig({});
  assert.match(config.releaseSourcePath, /data[\\/]cn-release-evidence/);
  assert.match(
    config.strengtheningSourcePath,
    /data[\\/]cn-strengthening-evidence/,
  );
});

test("projects prepared worker reports into a ready review dashboard", async () => {
  const snapshot = structuredClone(bootstrapSnapshot);
  snapshot.metadata.sourceStatus = "reviewed";
  snapshot.metadata.sourceVersions = {
    releaseEvidence: "2026-08-13-r1",
    strengtheningEvidence: "2026-08-13-strengthening-r1",
  };

  const repository = createReviewRepository(
    { getSnapshot: () => snapshot },
    {},
  );
  const dashboard = await repository.getDashboard();

  assert.equal(dashboard.publication.status, "ready");
  assert.deepEqual(dashboard.publication.pendingSourceVersions, []);
  assert.equal(dashboard.counts.atlasCandidates, 4);
  assert.equal(dashboard.counts.approvedReleases, 3);
  assert.equal(dashboard.counts.blockedCandidates, 1);
  assert.equal(dashboard.counts.strengtheningEvents, 1);
  assert.ok(
    dashboard.releaseSources.every((entry) => entry.gateStatus === "approved"),
  );
  assert.ok(
    dashboard.strengtheningSources.every(
      (entry) => entry.gateStatus === "applied",
    ),
  );
});
