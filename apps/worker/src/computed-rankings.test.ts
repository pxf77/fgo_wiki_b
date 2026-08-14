import assert from "node:assert/strict";
import test from "node:test";
import type { RankingSnapshot, Servant } from "@fgo-wiki/domain";
import { buildCompleteRankings } from "./computed-rankings.js";

const servants: Servant[] = [
  {
    id: "archer-a", name: "A", aliases: [], className: "archer", rarity: 5, atkMax: 12000,
    release: { region: "CN", status: "released", source: "atlas_cn" },
    noblePhantasms: [{ id: "a-np", name: "A NP", color: "buster", scope: "single", strengthened: false, effects: [], damageMultipliers: [600, 800, 900, 950, 1000] }],
    charge: { self: 50, team: 0 }, tags: [], role: ["main_dps"], updatedAt: "2026-08-14",
  },
  {
    id: "archer-b", name: "B", aliases: [], className: "archer", rarity: 3, atkMax: 7000,
    release: { region: "CN", status: "released", source: "atlas_cn" },
    noblePhantasms: [{ id: "b-np", name: "B NP", color: "arts", scope: "single", strengthened: true, effects: [], damageMultipliers: [900, 1200, 1350, 1425, 1500] }],
    charge: { self: 30, team: 0 }, tags: [], role: ["main_dps"], updatedAt: "2026-08-14",
  },
];

const editorial: RankingSnapshot = {
  id: "editorial-90pp", region: "CN", mode: "farming_90pp", asOf: "2026-08-14", revision: 2,
  assumptions: { npLevel: 1, swapAllowed: true, craftEssenceProfile: "event_50", eventDamageBonus: false },
  entries: [{ servantId: "archer-b", tier: "T0", conditions: [], strengths: ["人工覆盖"], weaknesses: [], rationale: "人工结论覆盖规则榜。", confidence: "high" }],
};

test("builds complete NP1/NP5 rankings and merges editorial entries", () => {
  const rankings = buildCompleteRankings(servants, [editorial], "2026-08-14", 2);
  const np1 = rankings.find((ranking) => ranking.mode === "np1_value");
  const np5 = rankings.find((ranking) => ranking.mode === "np5_value");
  const farming = rankings.find((ranking) => ranking.mode === "farming_90pp");
  assert.equal(np1?.entries.length, 2);
  assert.equal(np5?.entries.length, 2);
  assert.equal(np1?.origin, "computed");
  assert.equal(farming?.origin, "mixed");
  assert.equal(farming?.entries.find((entry) => entry.servantId === "archer-b")?.confidence, "high");
  assert.ok(farming?.entries.some((entry) => entry.servantId === "archer-a" && entry.confidence === "computed"));
});
