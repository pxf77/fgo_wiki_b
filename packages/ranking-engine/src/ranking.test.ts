import assert from "node:assert/strict";
import test from "node:test";
import type { RankingEntry } from "@fgo-wiki/domain";
import { calculateDimensionScore, sortRankingEntries } from "./ranking.js";

test("sorts tiers before optional scores", () => {
  const entries: RankingEntry[] = [
    {
      servantId: "t1",
      tier: "T1",
      score: 99,
      conditions: [],
      strengths: [],
      weaknesses: [],
      rationale: "",
      confidence: "provisional",
    },
    {
      servantId: "t0",
      tier: "T0",
      score: 10,
      conditions: [],
      strengths: [],
      weaknesses: [],
      rationale: "",
      confidence: "provisional",
    },
  ];

  assert.equal(sortRankingEntries(entries)[0]?.servantId, "t0");
});

test("calculates a weighted dimension score", () => {
  assert.equal(
    calculateDimensionScore(
      { damage: 90, charge: 60 },
      { damage: 2, charge: 1 },
    ),
    80,
  );
});
