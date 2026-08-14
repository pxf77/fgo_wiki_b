// HTTP boundary tests.
import assert from "node:assert/strict";
import test from "node:test";
import {
  bootstrapSnapshot,
  type ReviewDashboard,
} from "@fgo-wiki/domain";
import { buildApp } from "./app.js";
import type { ApiConfig } from "./config.js";
import type { DataRepository } from "./repository.js";
import type { ReviewRepository } from "./review-repository.js";

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

test("serves the read-only review dashboard without caching", async () => {
  const dashboard: ReviewDashboard = {
    generatedAt: "2026-08-14T00:00:00.000Z",
    counts: {
      atlasCandidates: 4,
      approvedReleases: 3,
      blockedCandidates: 1,
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
      reviewedSourceVersions: {
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
      pendingSourceVersions: [],
      blockers: [],
    },
    blockedCandidates: [],
    releaseSources: [],
    strengtheningSources: [],
    rankings: [],
  };
  const reviewRepository: ReviewRepository = {
    getDashboard: async () => dashboard,
  };
  const app = await buildApp({ config, repository, reviewRepository });
  const response = await app.inject({
    method: "GET",
    url: "/api/internal/review/dashboard",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.deepEqual(response.json(), dashboard);
  await app.close();
});
