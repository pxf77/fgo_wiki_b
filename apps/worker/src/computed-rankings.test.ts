import assert from "node:assert/strict";
import test from "node:test";
import type {
  RankingSnapshot,
  Servant,
  ServantClass,
} from "@fgo-wiki/domain";
import { buildCompleteRankings } from "./computed-rankings.js";

const servants: Servant[] = [
  {
    id: "archer-a",
    name: "A",
    aliases: [],
    className: "archer",
    rarity: 5,
    atkMax: 12000,
    release: { region: "CN", status: "released", source: "atlas_cn" },
    noblePhantasms: [
      {
        id: "a-np",
        name: "A NP",
        color: "buster",
        scope: "single",
        strengthened: false,
        effects: [],
        damageMultipliers: [600, 800, 900, 950, 1000],
      },
    ],
    charge: { self: 50, team: 0 },
    tags: [],
    role: ["main_dps"],
    updatedAt: "2026-08-14",
  },
  {
    id: "archer-b",
    name: "B",
    aliases: [],
    className: "archer",
    rarity: 3,
    atkMax: 7000,
    release: { region: "CN", status: "released", source: "atlas_cn" },
    noblePhantasms: [
      {
        id: "b-np",
        name: "B NP",
        color: "arts",
        scope: "single",
        strengthened: true,
        effects: [],
        damageMultipliers: [900, 1200, 1350, 1425, 1500],
      },
    ],
    charge: { self: 30, team: 0 },
    tags: [],
    role: ["main_dps"],
    updatedAt: "2026-08-14",
  },
];

const editorial: RankingSnapshot = {
  id: "editorial-90pp",
  region: "CN",
  mode: "farming_90pp",
  asOf: "2026-08-14",
  revision: 2,
  assumptions: {
    npLevel: 1,
    swapAllowed: true,
    craftEssenceProfile: "event_50",
    eventDamageBonus: false,
  },
  entries: [
    {
      servantId: "archer-b",
      tier: "T0",
      conditions: [],
      strengths: ["人工覆盖"],
      weaknesses: [],
      rationale: "人工结论覆盖规则榜。",
      confidence: "high",
    },
  ],
};

function ranking(
  rankings: readonly RankingSnapshot[],
  mode: RankingSnapshot["mode"],
): RankingSnapshot {
  const value = rankings.find((candidate) => candidate.mode === mode);
  if (!value) throw new Error(`Missing ranking ${mode}`);
  return value;
}

function attacker(
  id: string,
  name: string,
  options: {
    className?: ServantClass;
    atkMax?: number;
    specialAttackMultiplier?: number;
  } = {},
): Servant {
  return {
    id,
    name,
    aliases: [],
    className: options.className ?? "archer",
    rarity: 5,
    atkMax: options.atkMax ?? 10_000,
    release: { region: "CN", status: "released", source: "atlas_cn" },
    noblePhantasms: [
      {
        id: `${id}-np`,
        name: `${name} NP`,
        color: "buster",
        scope: "single",
        strengthened: false,
        effects: [],
        damageMultipliers: [600, 800, 900, 950, 1000],
        ...(options.specialAttackMultiplier !== undefined
          ? { specialAttackMultiplier: options.specialAttackMultiplier }
          : {}),
      },
    ],
    charge: { self: 0, team: 0 },
    profile: "attacker_single",
    capabilities: {
      offense: 0,
      support: 0,
      survival: 0,
      control: 0,
      cleanse: 0,
      pierce: 0,
      cooldown: 0,
      critical: 0,
    },
    tags: [],
    role: ["main_dps"],
    updatedAt: "2026-08-14",
  };
}

function support(id: string, name: string, atkMax: number): Servant {
  return {
    id,
    name,
    aliases: [],
    className: "caster",
    rarity: 5,
    atkMax,
    release: { region: "CN", status: "released", source: "atlas_cn" },
    noblePhantasms: [
      {
        id: `${id}-np`,
        name: `${name} NP`,
        color: "arts",
        scope: "support",
        strengthened: false,
        effects: [],
      },
    ],
    charge: { self: 0, team: 30 },
    profile: "support",
    capabilities: {
      offense: 20,
      support: 50,
      survival: 20,
      control: 0,
      cleanse: 10,
      pierce: 0,
      cooldown: 10,
      critical: 10,
    },
    tags: [],
    role: ["support"],
    updatedAt: "2026-08-14",
  };
}

test("builds complete NP1/NP5 rankings and merges editorial entries", () => {
  const rankings = buildCompleteRankings(
    servants,
    [editorial],
    "2026-08-14",
    2,
  );
  const np1 = ranking(rankings, "np1_value");
  const np5 = ranking(rankings, "np5_value");
  const farming = ranking(rankings, "farming_90pp");
  assert.equal(np1.entries.length, 2);
  assert.equal(np5.entries.length, 2);
  assert.equal(np1.origin, "computed");
  assert.equal(farming.origin, "mixed");
  assert.equal(
    farming.entries.find((entry) => entry.servantId === "archer-b")
      ?.confidence,
    "high",
  );
  assert.ok(
    farming.entries.some(
      (entry) =>
        entry.servantId === "archer-a" &&
        entry.confidence === "computed",
    ),
  );
});

test("keeps NP data rankings neutral to conditional special attack", () => {
  const neutral = attacker("neutral", "Neutral");
  const conditional = attacker("conditional", "Conditional", {
    specialAttackMultiplier: 2,
  });
  const rankings = buildCompleteRankings(
    [neutral, conditional],
    [],
    "2026-08-14",
    1,
  );

  const np1 = ranking(rankings, "np1_value");
  assert.equal(
    np1.entries.find((entry) => entry.servantId === neutral.id)?.score,
    np1.entries.find((entry) => entry.servantId === conditional.id)
      ?.score,
  );

  const farming = ranking(rankings, "farming_90pp");
  assert.ok(
    (farming.entries.find(
      (entry) => entry.servantId === conditional.id,
    )?.score ?? 0) >
      (farming.entries.find(
        (entry) => entry.servantId === neutral.id,
      )?.score ?? 0),
  );
});

test("does not use attacker ATK as an auxiliary support multiplier", () => {
  const lowAttack = support("support-low", "Support Low", 5_000);
  const highAttack = support("support-high", "Support High", 15_000);
  const supportRanking = ranking(
    buildCompleteRankings(
      [lowAttack, highAttack],
      [],
      "2026-08-14",
      1,
    ),
    "support",
  );
  assert.equal(
    supportRanking.entries.find(
      (entry) => entry.servantId === lowAttack.id,
    )?.score,
    supportRanking.entries.find(
      (entry) => entry.servantId === highAttack.id,
    )?.score,
  );
});

test("does not force a one-servant class into T0", () => {
  const onlyBeast = attacker("only-beast", "Only Beast", {
    className: "beast",
  });
  const farming = ranking(
    buildCompleteRankings([onlyBeast], [], "2026-08-14", 1),
    "farming_90pp",
  );
  assert.equal(farming.entries[0]?.tier, "T1");
});
