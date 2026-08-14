import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapSnapshot } from "@fgo-wiki/domain";
import {
  createDataStatusRepository,
  loadDataStatusFileConfig,
} from "./data-status-repository.js";

test("loads data-status files relative to the repository root", () => {
  const config = loadDataStatusFileConfig({});
  assert.match(config.releaseSourcePath, /data[\\/]cn-release-evidence/);
  assert.match(
    config.strengtheningSourcePath,
    /data[\\/]cn-strengthening-evidence/,
  );
  assert.match(config.classCatalogReportPath, /cn-class-catalog/);
});

test("projects prepared worker reports into a ready data-status dashboard", async () => {
  const snapshot = structuredClone(bootstrapSnapshot);
  snapshot.metadata.sourceStatus = "reviewed";
  snapshot.metadata.sourceVersions = {
    releaseEvidence: "2026-08-14-r2",
    strengtheningEvidence: "2026-08-13-strengthening-r1",
  };

  const repository = createDataStatusRepository(
    { getSnapshot: () => snapshot },
    {},
  );
  const dashboard = await repository.getDashboard();

  assert.equal(dashboard.publication.status, "ready");
  assert.deepEqual(dashboard.publication.staleSourceVersions, []);
  assert.equal(dashboard.counts.atlasCandidates, 4);
  assert.equal(dashboard.counts.passedReleases, 3);
  assert.equal(dashboard.counts.missingSourceCandidates, 1);
  assert.equal(dashboard.counts.strengtheningEvents, 1);
  assert.deepEqual(dashboard.classCoverage, [
    {
      className: "archer",
      atlasCandidates: 4,
      passedReleases: 3,
      missingReleaseSources: 1,
      atlasStrengthenedNps: 1,
      evidencedReleasedNps: 1,
      missingStrengtheningEvents: 0,
    },
  ]);
  assert.ok(
    dashboard.releaseSources.every((entry) => entry.gateStatus === "passed"),
  );
  assert.ok(
    dashboard.strengtheningSources.every(
      (entry) => entry.gateStatus === "applied",
    ),
  );
});

test("marks a reviewed snapshot stale when source manifests moved", async () => {
  const snapshot = structuredClone(bootstrapSnapshot);
  snapshot.metadata.sourceStatus = "reviewed";
  snapshot.metadata.sourceVersions = {
    releaseEvidence: "release-old",
    strengtheningEvidence: "strengthening-old",
  };

  const repository = createDataStatusRepository(
    { getSnapshot: () => snapshot },
    {},
  );
  const dashboard = await repository.getDashboard();

  assert.equal(dashboard.publication.status, "stale");
  assert.deepEqual(dashboard.publication.staleSourceVersions, [
    "releaseEvidence",
    "strengtheningEvidence",
  ]);
  assert.deepEqual(dashboard.publication.blockers, []);
});
