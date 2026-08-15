// HTTP boundary tests.
import assert from "node:assert/strict";
import test from "node:test";
import {
  bootstrapSnapshot,
  type DataStatusDashboard,
} from "@fgo-wiki/domain";
import { buildApp } from "./app.js";
import type { ApiConfig } from "./config.js";
import type { DataStatusRepository } from "./data-status-repository.js";
import type { DataRepository } from "./repository.js";

const config: ApiConfig = {
  host: "127.0.0.1",
  port: 3001,
  corsOrigins: ["http://localhost:3000"],
  dataSource: "bootstrap",
  snapshotPath: "",
};

const repository: DataRepository = {
  getSnapshot: () => bootstrapSnapshot,
};

test("filters servants through the HTTP boundary", async () => {
  const app = await buildApp({ config, repository });
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/servants?class=archer&npColor=quick&npScope=single&npStrengthened=true",
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(
    (response.json() as Array<{ id: string }>).map((servant) => servant.id),
    ["archer-baobhan-sith"],
  );
  await app.close();
});

test("serves a class-scoped dataset instead of the global snapshot", async () => {
  const app = await buildApp({ config, repository });
  const response = await app.inject({ method: "GET", url: "/api/v1/classes/archer" });
  assert.equal(response.statusCode, 200);
  const snapshot = response.json() as typeof bootstrapSnapshot;
  assert.ok(snapshot.servants.length > 0);
  assert.ok(snapshot.servants.every((servant) => servant.className === "archer"));
  const ids = new Set(snapshot.servants.map((servant) => servant.id));
  assert.ok(
    snapshot.rankings.every((ranking) =>
      ranking.entries.every((entry) => ids.has(entry.servantId)),
    ),
  );
  assert.equal(response.headers["cache-control"], "public, max-age=60");
  await app.close();
});

test("serves the read-only data-status endpoint without caching", async () => {
  const dashboard: DataStatusDashboard = {
    generatedAt: "2026-08-14T00:00:00.000Z",
    counts: {
      atlasCandidates: 4,
      passedReleases: 3,
      missingSourceCandidates: 1,
      strengtheningEvents: 1,
      rankingEntries: 4,
    },
    normalization: {
      inputCount: 5,
      acceptedCount: 4,
      skippedCount: 1,
      warningCount: 0,
    },
    publication: {
      status: "ready",
      datasetVersion: "2026-08-13-r1",
      sourceStatus: "reviewed",
      sourceManifestVersions: {
        releaseEvidence: "release-r1",
        strengtheningEvidence: "strengthening-r1",
      },
      gateSourceVersions: {
        releaseEvidence: "release-r1",
        strengtheningEvidence: "strengthening-r1",
      },
      publishedSourceVersions: {
        releaseEvidence: "release-r1",
        strengtheningEvidence: "strengthening-r1",
      },
      staleSourceVersions: [],
      blockers: [],
    },
    classCoverage: [
      {
        className: "archer",
        atlasCandidates: 4,
        passedReleases: 3,
        missingReleaseSources: 1,
        atlasStrengthenedNps: 1,
        evidencedReleasedNps: 1,
        missingStrengtheningEvents: 0,
      },
    ],
    missingSourceCandidates: [],
    releaseSources: [],
    strengtheningSources: [],
    rankings: [],
  };
  const dataStatusRepository: DataStatusRepository = {
    getDashboard: async () => dashboard,
  };
  const app = await buildApp({ config, repository, dataStatusRepository });
  const response = await app.inject({
    method: "GET",
    url: "/api/internal/data-status",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.deepEqual(response.json(), dashboard);

  const retiredRoute = await app.inject({
    method: "GET",
    url: "/api/internal/review/dashboard",
  });
  assert.equal(retiredRoute.statusCode, 404);
  await app.close();
});
