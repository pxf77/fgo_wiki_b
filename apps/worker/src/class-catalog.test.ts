import assert from "node:assert/strict";
import test from "node:test";
import type { AtlasServantCandidate } from "./normalize-atlas.js";
import type {
  CnReleaseEvidenceManifest,
  CnReleaseGateReport,
} from "./release-gate.js";
import type { CnStrengtheningSourceManifest } from "./strengthening-source.js";
import { buildCnClassCatalog } from "./class-catalog.js";

const candidates: AtlasServantCandidate[] = [
  {
    atlasId: 303110,
    collectionNo: 311,
    name: "妖精骑士崔斯坦",
    className: "archer",
    rarity: 4,
    noblePhantasms: [
      {
        sourceId: 1031101,
        name: "痛幻的哭奏",
        color: "quick",
        scope: "single",
        strengthened: true,
        hitCount: 6,
      },
    ],
  },
  {
    atlasId: 303940,
    collectionNo: 394,
    name: "托勒密",
    className: "archer",
    rarity: 5,
    noblePhantasms: [
      {
        sourceId: 1039401,
        name: "月は知らず、久遠の光",
        color: "buster",
        scope: "single",
        strengthened: true,
        hitCount: 3,
      },
    ],
  },
  {
    atlasId: 309990,
    collectionNo: 999,
    name: "待补来源从者",
    className: "archer",
    rarity: 5,
    noblePhantasms: [
      {
        sourceId: 1099901,
        name: "测试宝具",
        color: "arts",
        scope: "aoe",
        strengthened: true,
      },
    ],
  },
];

const releaseSource: CnReleaseEvidenceManifest = {
  schemaVersion: 1,
  version: "release-r1",
  region: "CN",
  reviewedAt: "2026-08-14T00:00:00.000Z",
  entries: [
    {
      collectionNo: 311,
      servantId: "archer-baobhan-sith",
      displayName: "妖精骑士崔斯坦（芭万·希）",
      aliases: ["芭万·希"],
      expected: { className: "archer", rarity: 4 },
      release: {
        status: "released",
        releasedAt: "2023-11-09",
        evidence: {
          title: "从者介绍",
          publisher: "命运-冠位指定",
          url: "https://www.bilibili.com/video/BV1ie411X7C8/",
          publishedAt: "2023-11-09",
        },
      },
      overrides: {
        charge: { self: 60, team: 0 },
        tags: ["Quick"],
        role: ["main_dps"],
        noblePhantasms: [
          {
            id: "baobhan-sith-quick-single",
            atlasSourceId: 1031101,
            name: "痛幻的哭奏",
            color: "quick",
            scope: "single",
            strengthened: false,
            hitCount: 6,
            effects: ["必中"],
          },
        ],
      },
    },
    {
      collectionNo: 394,
      servantId: "archer-ptolemy",
      displayName: "托勒密",
      aliases: [],
      expected: { className: "archer", rarity: 5 },
      release: {
        status: "released",
        releasedAt: "2024-10-24",
        evidence: {
          title: "从者介绍",
          publisher: "命运-冠位指定",
          url: "https://www.bilibili.com/video/BV1Y31KYfEbp/",
          publishedAt: "2024-10-24",
        },
      },
      overrides: {
        charge: { self: 50, team: 0 },
        tags: ["Buster"],
        role: ["main_dps"],
        noblePhantasms: [
          {
            id: "ptolemy-buster-single",
            atlasSourceId: 1039401,
            name: "月は知らず、久遠の光",
            color: "buster",
            scope: "single",
            strengthened: false,
            hitCount: 3,
            effects: ["无视防御"],
          },
        ],
      },
    },
  ],
};

const releaseGate: CnReleaseGateReport = {
  evidenceVersion: "release-r1",
  reviewedAt: "2026-08-14T00:00:00.000Z",
  passed: [
    {
      collectionNo: 311,
      servantId: "archer-baobhan-sith",
      atlasId: 303110,
      status: "released",
      evidenceUrl: "https://www.bilibili.com/video/BV1ie411X7C8/",
    },
    {
      collectionNo: 394,
      servantId: "archer-ptolemy",
      atlasId: 303940,
      status: "released",
      evidenceUrl: "https://www.bilibili.com/video/BV1Y31KYfEbp/",
    },
  ],
  blocked: [
    {
      collectionNo: 999,
      atlasId: 309990,
      name: "待补来源从者",
      reason: "no CN release source entry",
    },
  ],
};

const strengtheningSource: CnStrengtheningSourceManifest = {
  schemaVersion: 1,
  version: "strengthening-r1",
  region: "CN",
  reviewedAt: "2026-08-14T00:00:00.000Z",
  events: [
    {
      id: "cn-baobhan-np",
      servantId: "archer-baobhan-sith",
      status: "released",
      target: {
        type: "noble_phantasm",
        targetId: "baobhan-sith-quick-single",
        targetName: "痛幻的哭奏",
      },
      releasedAt: "2025-10-31",
      evidence: {
        title: "强化活动",
        publisher: "命运-冠位指定",
        url: "https://game.bilibili.com/fgo/news.html",
        publishedAt: "2025-10-31",
      },
      summary: ["宝具强化"],
    },
  ],
};

test("builds class coverage and distinguishes dated evidence from Atlas current state", () => {
  const report = buildCnClassCatalog(
    candidates,
    releaseSource,
    releaseGate,
    strengtheningSource,
    "2026-08-14T00:00:00.000Z",
  );

  assert.deepEqual(report.classes, [
    {
      className: "archer",
      atlasCandidates: 3,
      passedReleases: 2,
      missingReleaseSources: 1,
      atlasStrengthenedNps: 2,
      evidencedReleasedNps: 2,
      missingStrengtheningEvents: 0,
    },
  ]);
  assert.equal(report.candidates[0]?.noblePhantasms[0]?.strengtheningStatus, "evidenced");
  assert.equal(report.candidates[1]?.noblePhantasms[0]?.strengtheningStatus, "atlas_current");
  assert.equal(report.candidates[2]?.releaseStatus, "missing_source");
  assert.deepEqual(
    report.candidates[2]?.releaseSourceDraft?.overrides.noblePhantasms[0],
    {
      atlasSourceId: 1099901,
      id: "archer-999-np-1",
      name: "测试宝具",
      color: "arts",
      scope: "aoe",
      targetTraits: [],
      effects: [],
      strengthened: false,
    },
  );
  assert.deepEqual(report.missingStrengtheningEvents, []);
});
