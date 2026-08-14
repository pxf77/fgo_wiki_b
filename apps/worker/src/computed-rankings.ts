import type {
  NoblePhantasm,
  RankingEntry,
  RankingMode,
  RankingSnapshot,
  Servant,
  Tier,
} from "@fgo-wiki/domain";

interface RawEntry {
  servant: Servant;
  raw: number;
}

const cardModifier = {
  quick: 0.8,
  arts: 1,
  buster: 1.5,
} as const;

function attackingNoblePhantasms(servant: Servant): NoblePhantasm[] {
  return servant.noblePhantasms.filter(
    (np) => np.scope === "single" || np.scope === "aoe" || np.scope === "special",
  );
}

function npMultiplier(np: NoblePhantasm, npLevel: 1 | 2 | 3 | 4 | 5): number {
  const values = np.damageMultipliers;
  if (!values?.length) return 0;
  return values[Math.min(npLevel - 1, values.length - 1)] ?? values.at(-1) ?? 0;
}

function damageProxy(servant: Servant, npLevel: 1 | 2 | 3 | 4 | 5): number {
  const atk = servant.atkMax ?? servant.rarity * 2_000;
  return Math.max(
    0,
    ...attackingNoblePhantasms(servant).map(
      (np) => atk * npMultiplier(np, npLevel) * cardModifier[np.color],
    ),
  );
}

function utilityWeight(servant: Servant): number {
  let value = servant.charge.self * 1.1 + servant.charge.team * 1.6;
  value += (servant.charge.target ?? 0) * 1.2;
  if (servant.noblePhantasms.some((np) => np.scope === "support")) value += 30;
  if (servant.noblePhantasms.some((np) => np.strengthened)) value += 10;
  if (servant.noblePhantasms.length > 1) value += 20;
  if (servant.role.includes("plug_in")) value += 20;
  return value;
}

function rawScore(
  servant: Servant,
  mode: RankingMode,
  npLevel: 1 | 2 | 3 | 4 | 5,
): number {
  const damage = damageProxy(servant, npLevel);
  const utility = utilityWeight(servant);
  const atk = servant.atkMax ?? servant.rarity * 2_000;

  if (mode === "np1_value" || mode === "np5_value") {
    return damage * (1 + Math.min(100, servant.charge.self + servant.charge.team) / 300);
  }
  if (mode === "farming_90pp") {
    const multiNpBonus = servant.noblePhantasms.length > 1 ? 0.2 * damage : 0;
    return damage + utility * atk * 4 + multiNpBonus;
  }
  if (mode === "high_difficulty") {
    return damage * 0.7 + utility * atk * 7;
  }
  return utility * atk * 5 + damage * 0.2;
}

function tierForIndex(index: number, total: number): Tier {
  const percentile = total <= 1 ? 0 : index / total;
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
  if (servant.charge.self >= 50) values.push(`${servant.charge.self}% 自充`);
  else if (servant.charge.self > 0) values.push(`${servant.charge.self}% 自充`);
  if (servant.charge.team > 0) values.push(`${servant.charge.team}% 群充`);
  if (servant.noblePhantasms.length > 1) values.push("多宝具形态");
  if (servant.noblePhantasms.some((np) => np.strengthened)) values.push("已开放宝具强化");
  if (servant.noblePhantasms.some((np) => (np.specialAttackMultiplier ?? 1) > 1)) {
    values.push("具备条件特攻");
  }
  return values.length ? values : ["基础输出结构完整"];
}

function weaknesses(servant: Servant): string[] {
  const values: string[] = [];
  if (servant.charge.self === 0 && servant.charge.team === 0) values.push("缺少主动 NP 充能");
  if (servant.noblePhantasms.every((np) => np.scope === "support")) values.push("非直接攻击宝具");
  return values;
}

function conditions(servant: Servant): string[] {
  return servant.noblePhantasms.some((np) => (np.specialAttackMultiplier ?? 1) > 1)
    ? ["命中特攻条件时伤害上限更高"]
    : [];
}

function computedEntries(
  servants: readonly Servant[],
  mode: RankingMode,
  npLevel: 1 | 2 | 3 | 4 | 5,
): RankingEntry[] {
  const rawEntries: RawEntry[] = servants.map((servant) => ({
    servant,
    raw: rawScore(servant, mode, npLevel),
  }));
  rawEntries.sort(
    (left, right) =>
      right.raw - left.raw || left.servant.name.localeCompare(right.servant.name, "zh-CN"),
  );
  const min = Math.min(...rawEntries.map((entry) => entry.raw));
  const max = Math.max(...rawEntries.map((entry) => entry.raw));

  return rawEntries.map(({ servant, raw }, index) => ({
    servantId: servant.id,
    tier: tierForIndex(index, rawEntries.length),
    score: normalizedScore(raw, min, max),
    conditions: conditions(servant),
    strengths: strengths(servant),
    weaknesses: weaknesses(servant),
    rationale:
      mode === "np1_value" || mode === "np5_value"
        ? `数据榜：按 ATK、宝具倍率、色卡修正与充能能力计算 NP${npLevel} 泛用输出代理分。`
        : `规则榜：按 NP${npLevel} 输出代理、充能、多宝具与基础功能计算；人工榜单条目会覆盖该结果。`,
    confidence: "computed",
  }));
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
      craftEssenceProfile: mode === "farming_90pp" ? "event_50" : "none",
      eventDamageBonus: false,
    },
    entries: computedEntries(servants, mode, npLevel),
  };
}

function mergeSnapshot(
  computed: RankingSnapshot,
  editorial: RankingSnapshot | undefined,
): RankingSnapshot {
  if (!editorial) return computed;
  const entries = new Map(computed.entries.map((entry) => [entry.servantId, entry] as const));
  for (const entry of editorial.entries) entries.set(entry.servantId, entry);
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
  const farmingNpLevel = editorialByMode.get("farming_90pp")?.assumptions.npLevel ?? 1;
  const highDifficultyNpLevel =
    editorialByMode.get("high_difficulty")?.assumptions.npLevel ?? 1;
  const generated = [
    computedSnapshot(servants, "farming_90pp", asOf, revision, farmingNpLevel),
    computedSnapshot(
      servants,
      "high_difficulty",
      asOf,
      revision,
      highDifficultyNpLevel,
    ),
    computedSnapshot(servants, "np1_value", asOf, revision, 1),
    computedSnapshot(servants, "np5_value", asOf, revision, 5),
  ].map((ranking) => mergeSnapshot(ranking, editorialByMode.get(ranking.mode)));

  const generatedModes = new Set(generated.map((ranking) => ranking.mode));
  return [
    ...generated,
    ...editorialRankings.filter((ranking) => !generatedModes.has(ranking.mode)),
  ];
}
