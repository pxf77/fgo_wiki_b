import assert from "node:assert/strict";
import test from "node:test";
import type { AtlasServantCandidate } from "./normalize-atlas.js";
import type { CnReleaseEvidenceManifest } from "./release-gate.js";
import type { CnProductPolicy } from "./product-policy.js";
import { applyCnPublicationGate } from "./publication-gate.js";

const candidates: AtlasServantCandidate[] = [
  {
    atlasId: 304380,
    collectionNo: 438,
    name: "已复核边界从者",
    className: "archer",
    rarity: 5,
    noblePhantasms: [],
  },
  {
    atlasId: 304390,
    collectionNo: 439,
    name: "有人工来源的新从者",
    className: "archer",
    rarity: 5,
    noblePhantasms: [
      {
        sourceId: 1043901,
        name: "人工来源宝具",
        color: "buster",
        scope: "single",
        strengthened: false,
      },
    ],
  },
  {
    atlasId: 304400,
    collectionNo: 440,
    name: "待复核上游新从者",
    className: "archer",
    rarity: 5,
    noblePhantasms: [],
  },
];

const policy: CnProductPolicy = {
  schemaVersion: 1,
  region: "CN",
  publicationPolicyVersion: "publication-v1",
  autoPublishCollectionNoThrough: 438,
  capabilityRulesVersion: "capability-v1",
  rankingFormulaVersion: "ranking-v2",
};

const evidence: CnReleaseEvidenceManifest = {
  schemaVersion: 1,
  version: "release-r1",
  region: "CN",
  reviewedAt: "2026-08-15T00:00:00.000Z",
  autoPublishClasses: ["archer"],
  entries: [
    {
      collectionNo: 439,
      servantId: "archer-curated-439",
      displayName: "有人工来源的新从者",
      aliases: [],
      expected: { className: "archer", rarity: 5 },
      release: {
        status: "released",
        releasedAt: "2026-08-15",
        evidence: {
          title: "从者介绍",
          publisher: "命运-冠位指定",
          url: "https://game.bilibili.com/fgo/news.html",
          publishedAt: "2026-08-15",
        },
      },
      overrides: {
        charge: { self: 30, team: 0 },
        tags: ["Buster"],
        role: ["main_dps"],
        noblePhantasms: [
          {
            id: "curated-439-np",
            atlasSourceId: 1043901,
            name: "人工来源宝具",
            color: "buster",
            scope: "single",
            strengthened: false,
            effects: [],
          },
        ],
      },
    },
  ],
};

test("holds upstream additions beyond the reviewed publication ceiling", () => {
  const { servants, report } = applyCnPublicationGate(
    candidates,
    evidence,
    policy,
  );

  assert.deepEqual(
    servants.map((servant) => servant.id),
    ["archer-c438", "archer-curated-439"],
  );
  assert.deepEqual(
    report.blocked.map((entry) => entry.collectionNo),
    [440],
  );
  assert.match(report.blocked[0]!.reason, /reviewed auto-publication ceiling 438/);
});
