import assert from "node:assert/strict";
import test from "node:test";
import type { Servant } from "@fgo-wiki/domain";
import type { CnStrengtheningSourceManifest } from "./strengthening-source.js";
import { applyCnStrengtheningGate } from "./strengthening-gate.js";

const servants: Servant[] = [
  {
    id: "archer-baobhan-sith",
    atlasId: 304100,
    name: "妖精骑士崔斯坦（芭万·希）",
    aliases: ["芭万·希"],
    className: "archer",
    rarity: 4,
    release: {
      region: "CN",
      status: "released",
      releasedAt: "2023-11-09",
      evidenceUrl: "https://www.bilibili.com/video/BV1ie411X7C8/",
    },
    noblePhantasms: [
      {
        id: "baobhan-sith-quick-single",
        name: "痛幻的哭奏",
        color: "quick",
        scope: "single",
        strengthened: false,
        effects: ["必中"],
      },
    ],
    strengthenings: [],
    charge: { self: 60, team: 0 },
    tags: ["Quick"],
    role: ["main_dps"],
    updatedAt: "2026-08-13",
  },
];

const manifest: CnStrengtheningSourceManifest = {
  schemaVersion: 1,
  version: "strengthening-test-r1",
  region: "CN",
  reviewedAt: "2026-08-13T00:00:00.000Z",
  events: [
    {
      id: "cn-2025-10-31-baobhan-sith-np",
      servantId: "archer-baobhan-sith",
      status: "released",
      target: {
        type: "noble_phantasm",
        targetId: "baobhan-sith-quick-single",
        targetName: "痛幻的哭奏",
      },
      releasedAt: "2025-10-31",
      evidence: {
        title: "「Lostbelt No.6」通关应援纪念活动",
        publisher: "命运-冠位指定",
        url: "https://game.bilibili.com/fgo/news.html",
        publishedAt: "2025-10-31",
      },
      summary: ["宝具强化"],
    },
    {
      id: "cn-2026-09-01-baobhan-sith-skill-announced",
      servantId: "archer-baobhan-sith",
      status: "announced",
      target: {
        type: "skill",
        targetId: "skill-2-v2",
        targetName: "技能二强化",
        slot: 2,
      },
      releasedAt: "2026-09-01",
      evidence: {
        title: "强化预告",
        publisher: "命运-冠位指定",
        url: "https://game.bilibili.com/fgo/news.html",
        publishedAt: "2026-08-12",
      },
      summary: ["仅作为已公告事件进入时间线"],
    },
  ],
};

test("derives Noble Phantasm strengthening and publishes a timeline", () => {
  const { servants: result, report } = applyCnStrengtheningGate(servants, manifest);
  assert.equal(result[0]?.noblePhantasms[0]?.strengthened, true);
  assert.deepEqual(
    result[0]?.strengthenings?.map((event) => [event.id, event.status]),
    [
      ["cn-2025-10-31-baobhan-sith-np", "released"],
      ["cn-2026-09-01-baobhan-sith-skill-announced", "announced"],
    ],
  );
  assert.equal(report.applied.length, 2);
});

test("rejects an unknown Noble Phantasm target", () => {
  const invalid = structuredClone(manifest);
  const target = invalid.events[0]!.target;
  if (target.type === "noble_phantasm") {
    target.targetId = "missing-np";
  }
  assert.throws(() => applyCnStrengtheningGate(servants, invalid), /unknown NP/);
});

test("rejects strengthening state before the dedicated gate", () => {
  const invalidServants = structuredClone(servants);
  invalidServants[0]!.noblePhantasms[0]!.strengthened = true;
  assert.throws(
    () => applyCnStrengtheningGate(invalidServants, manifest),
    /premarks a strengthened NP/,
  );
});
