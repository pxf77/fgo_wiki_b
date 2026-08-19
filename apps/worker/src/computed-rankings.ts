import type {
  NoblePhantasm,
  RankingEntry,
  RankingMode,
  RankingSnapshot,
  Servant,
  ServantCapabilities,
  ServantClass,
  ServantProfile,
  Tier,
} from "@fgo-wiki/domain";

interface RawEntry {
  servant: Servant;
  raw: number;
}

const cardModifier = { quick: 0.8, arts: 1, buster: 1.5 } as const;
const referenceAttack = 10_000;
const emptyCapabilities: ServantCapabilities = {
  offense: 0,
  support: 0,
  survival: 0,
  control: 0,
  cleanse: 0,
  pierce: 0,
  cooldown: 0,
  critical: 0,
};

function capabilities(servant: Servant): ServantCapabilities {
  return servant.capabilities ?? emptyCapabilities;
}

function attackingNoblePhantasms(servant: Servant): NoblePhantasm[] {
  return servant.noblePhantasms.filter((np) => np.scope !== "support");
}

function profile(servant: Servant): ServantProfile {
  if (servant.profile) return servant.profile;
  const attacks = attackingNoblePhantasms(servant);
  if (attacks.length === 0) return "support";
  if (
    attacks.some((np) => np.scope === "single") &&
    attacks.some((np) => np.scope === "aoe")
  ) {
    return "hybrid";
  }
  return attacks.some((np) => np.scope === "aoe")
    ? "attacker_aoe"
    : "attacker_single";
}

function npMultiplier(
  np: NoblePhantasm,
  npLevel: 1 | 2 | 3 | 4 | 5,
): number {
  const values = np.damageMultipliers;
  if (!values?.length) return 0;
  return (
    values[Math.min(npLevel - 1, values.length - 1)] ??
    values.at(-1) ??
    0
  );
}

function specialAttackWeight(mode: RankingMode): number {
  if (mode === "farming_90pp") return 0.25;
  if (mode === "high_difficulty") return 0.4;
  if (mode === "farming") return 0.2;
  return 0;
}

function scenarioSpecialAttackMultiplier(
  np: NoblePhantasm,
  weight: number,
): number {
  const maximum = Math.max(1, np.specialAttackMultiplier ?? 1);
  return 1 + (maximum - 1) * weight;
}

function damageProxy(
  servant: Servant,
  npLevel: 1 | 2 | 3 | 4 | 5,
  specialWeight: number,
): number {
  const atk = servant.atkMax ?? servant.rarity * 2_000;
  return Math.max(
    0,
    ...attackingNoblePhantasms(servant).map(
      (np) =>
        atk *
        npMultiplier(np, npLevel) *
        cardModifier[np.color] *
        scenarioSpecialAttackMultiplier(np, specialWeight),
    ),
  );
}

function chargeScore(servant: Servant): number {
  return (
    servant.charge.self * 1.1 +
    servant.charge.team * 1.8 +
    (servant.charge.target ?? 0) * 1.4
  );
}

function supportScore(servant: Servant): number {
  const cap = capabilities(servant);
  return (
    servant.charge.team * 2.2 +
    (servant.charge.target ?? 0) * 1.8 +
    cap.support * 2 +
    cap.offense * 1.2 +
    cap.critical +
    cap.survival * 0.8 +
    cap.cleanse +
    cap.cooldown * 1.5
  );
}

function highDifficultyUtility(servant: Servant): number {
  const cap = capabilities(servant);
  return (
    chargeScore(servant) +
    cap.survival * 2.2 +
    cap.control * 1.8 +
    cap.cleanse * 1.8 +
    cap.pierce * 1.5 +
    cap.cooldown * 1.2 +
    cap.support
  );
}

function rawScore(
  servant: Servant,
  mode: RankingMode,
  npLevel: 1 | 2 | 3 | 4 | 5,
): number {
  const damage = damageProxy(
    servant,
    npLevel,
    specialAttackWeight(mode),
  );
  const p = profile(servant);
  if (mode === "np1_value" || mode === "np5_value") {
    return (
      damage *
      (1 +
        Math.min(100, servant.charge.self + servant.charge.team) / 300)
    );
  }
  if (mode === "support") {
    return supportScore(servant) * referenceAttack;
  }
  if (mode === "farming_90pp") {
    const multiNpBonus =
      servant.noblePhantasms.length > 1 ? 0.2 * damage : 0;
    const plugin =
      supportScore(servant) *
      referenceAttack *
      (p === "support" ? 8 : p === "hybrid" ? 5 : 2);
    return (
      damage +
      chargeScore(servant) * referenceAttack * 4 +
      plugin +
      multiNpBonus
    );
  }
  if (mode === "high_difficulty") {
    const roleWeight = p === "support" ? 8 : p === "hybrid" ? 6 : 4;
    return (
      damage * 0.55 +
      highDifficultyUtility(servant) * referenceAttack * roleWeight
    );
  }
  return (
    supportScore(servant) * referenceAttack * 5 +
    damage * 0.2
  );
}

function tierForIndex(index: number, total: number): Tier {
  if (total <= 1) return "T1";
  if (total <= 4) {
    return (["T1", "T1.5", "T2", "T3"] as const)[
      Math.min(index, 3)
    ]!;
  }
  if (total < 10) {
    const percentile = index / (total - 1);
    if (index === 0) return "T0.5";
    if (percentile < 0.4) return "T1";
    if (percentile < 0.65) return "T1.5";
    if (percentile < 0.9) return "T2";
    return "T3";
  }

  const percentile = index / total;
  if (percentile < 0.1) return "T0";
  if (percentile < 0.25) return "T0.5";
  if (percentile < 0.45) return "T1";
  if (percentile < 0.65) return "T1.5";
  if (percentile < 0.82) return "T2";
  return "T3";
}

function normalizedScore(raw: number, min: number, max: number): number {
  if (max <= min) return 100;
  return Math.round(50 + ((raw - min) / (max - min)) * 50);
}

function strengths(servant: Servant): string[] {
  const values: string[] = [];
  const cap = capabilities(servant);
  if (servant.charge.self > 0) {
    values.push(`${servant.charge.self}% 自充`);
  }
  if (servant.charge.team > 0) {
    values.push(`${servant.charge.team}% 群充`);
  }
  if ((servant.charge.target ?? 0) > 0) {
    values.push(`${servant.charge.target}% 单体充能`);
  }
  if (servant.noblePhantasms.length > 1) {
    values.push("多宝具形态");
  }
  if (servant.noblePhantasms.some((np) => np.strengthened)) {
    values.push("当前宝具已强化");
  }
  if (
    servant.noblePhantasms.some(
      (np) => (np.specialAttackMultiplier ?? 1) > 1,
    )
  ) {
    values.push("具备条件特攻");
  }
  if (cap.support >= 20) values.push("团队辅助能力");
  if (cap.survival >= 20) values.push("生存能力");
  if (cap.control >= 10) values.push("控制能力");
  if (cap.pierce >= 10) values.push("机制穿透");
  return values.length ? values : ["基础结构完整"];
}

function weaknesses(servant: Servant): string[] {
  const values: string[] = [];
  if (
    servant.charge.self === 0 &&
    servant.charge.team === 0 &&
    !servant.charge.target
  ) {
    values.push("缺少主动 NP 充能");
  }
  if (attackingNoblePhantasms(servant).length === 0) {
    values.push("非直接攻击宝具");
  }
  return values;
}

function conditions(servant: Servant): string[] {
  return servant.noblePhantasms.some(
    (np) => (np.specialAttackMultiplier ?? 1) > 1,
  )
    ? ["命中特攻条件时伤害上限更高"]
    : [];
}

function eligible(servant: Servant, mode: RankingMode): boolean {
  if (mode === "np1_value" || mode === "np5_value") {
    return attackingNoblePhantasms(servant).length > 0;
  }
  if (mode === "support") {
    const p = profile(servant);
    return p === "support" || p === "hybrid";
  }
  return true;
}

function rationale(
  mode: RankingMode,
  npLevel: number,
  servant: Servant,
): string {
  if (mode === "np1_value" || mode === "np5_value") {
    return (
      `数据榜：按 ATK、宝具倍率、色卡与充能计算 NP${npLevel} ` +
      "中性输出代理分，不默认命中特攻条件；纯辅助宝具不进入该榜。"
    );
  }
  if (mode === "support") {
    return (
      "辅助规则榜：仅纳入 support / hybrid 角色，按团队/单体充能、" +
      `攻辅 Buff、生存、弱化处理与减 CD 能力计算；角色画像为 ${profile(servant)}。`
    );
  }
  if (mode === "high_difficulty") {
    return (
      "高难规则榜：综合输出、生存、控制、弱化处理、机制穿透和充能，" +
      "条件特攻按 40% 场景权重计入；人工条目覆盖规则结果。"
    );
  }
  return (
    `90++ 规则榜：综合 NP${npLevel} 输出、充能、多核与插件能力，` +
    "条件特攻按 25% 场景权重计入；人工条目覆盖规则结果。"
  );
}

function entriesForClass(
  servants: readonly Servant[],
  className: ServantClass,
  mode: RankingMode,
  npLevel: 1 | 2 | 3 | 4 | 5,
): RankingEntry[] {
  const rawEntries: RawEntry[] = servants
    .filter(
      (servant) =>
        servant.className === className && eligible(servant, mode),
    )
    .map((servant) => ({
      servant,
      raw: rawScore(servant, mode, npLevel),
    }));
  rawEntries.sort(
    (left, right) =>
      right.raw - left.raw ||
      left.servant.name.localeCompare(right.servant.name, "zh-CN"),
  );
  if (rawEntries.length === 0) return [];
  const min = Math.min(...rawEntries.map((entry) => entry.raw));
  const max = Math.max(...rawEntries.map((entry) => entry.raw));
  const scenarioWeight = specialAttackWeight(mode);
  return rawEntries.map(({ servant, raw }, index) => ({
    servantId: servant.id,
    tier: tierForIndex(index, rawEntries.length),
    score: normalizedScore(raw, min, max),
    dimensions: {
      damage: Math.min(
        100,
        Math.round(
          damageProxy(servant, npLevel, scenarioWeight) / 100_000,
        ),
      ),
      charge: Math.min(100, Math.round(chargeScore(servant))),
      utility: Math.min(100, Math.round(supportScore(servant) / 3)),
      survivability: capabilities(servant).survival,
      stability: Math.min(
        100,
        50 +
          capabilities(servant).cleanse +
          capabilities(servant).control,
      ),
    },
    conditions: conditions(servant),
    strengths: strengths(servant),
    weaknesses: weaknesses(servant),
    rationale: rationale(mode, npLevel, servant),
    confidence: "computed",
  }));
}

function computedEntries(
  servants: readonly Servant[],
  mode: RankingMode,
  npLevel: 1 | 2 | 3 | 4 | 5,
): RankingEntry[] {
  const classes = [
    ...new Set(servants.map((servant) => servant.className)),
  ];
  return classes.flatMap((className) =>
    entriesForClass(servants, className, mode, npLevel),
  );
}

function computedSnapshot(
  servants: readonly Servant[],
  mode: RankingMode,
  asOf: string,
  revision: number,
  npLevel: 1 | 2 | 3 | 4 | 5,
): RankingSnapshot {
  return {
    id: `cn-${asOf}-${mode}-computed-r${revision}`,
    region: "CN",
    mode,
    asOf,
    revision,
    origin: "computed",
    assumptions: {
      npLevel,
      swapAllowed: true,
      craftEssenceProfile:
        mode === "farming_90pp" ? "event_50" : "none",
      eventDamageBonus: false,
    },
    entries: computedEntries(servants, mode, npLevel),
  };
}

function mergeSnapshot(
  computed: RankingSnapshot,
  editorial: RankingSnapshot | undefined,
): RankingSnapshot {
  if (!editorial || editorial.entries.length === 0) return computed;
  const entries = new Map(
    computed.entries.map((entry) => [entry.servantId, entry] as const),
  );
  for (const entry of editorial.entries) {
    entries.set(entry.servantId, entry);
  }
  return {
    ...computed,
    id: editorial.id,
    asOf: editorial.asOf,
    revision: editorial.revision,
    assumptions: editorial.assumptions,
    origin: "mixed",
    entries: [...entries.values()],
  };
}

export function buildCompleteRankings(
  servants: readonly Servant[],
  editorialRankings: readonly RankingSnapshot[],
  asOf: string,
  revision: number,
): RankingSnapshot[] {
  const editorialByMode = new Map(
    editorialRankings.map((ranking) => [ranking.mode, ranking] as const),
  );
  const farmingNpLevel =
    editorialByMode.get("farming_90pp")?.assumptions.npLevel ?? 1;
  const highDifficultyNpLevel =
    editorialByMode.get("high_difficulty")?.assumptions.npLevel ?? 1;
  const generated = [
    computedSnapshot(
      servants,
      "farming_90pp",
      asOf,
      revision,
      farmingNpLevel,
    ),
    computedSnapshot(
      servants,
      "high_difficulty",
      asOf,
      revision,
      highDifficultyNpLevel,
    ),
    computedSnapshot(servants, "support", asOf, revision, 1),
    computedSnapshot(servants, "np1_value", asOf, revision, 1),
    computedSnapshot(servants, "np5_value", asOf, revision, 5),
  ].map((ranking) =>
    mergeSnapshot(ranking, editorialByMode.get(ranking.mode)),
  );
  const generatedModes = new Set(
    generated.map((ranking) => ranking.mode),
  );
  return [
    ...generated,
    ...editorialRankings.filter(
      (ranking) => !generatedModes.has(ranking.mode),
    ),
  ];
}
