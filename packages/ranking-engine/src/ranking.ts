import type {
  RankingDimensions,
  RankingEntry,
  RankingMode,
  RankingSnapshot,
  Tier,
} from "@fgo-wiki/domain";

const tierOrder: Record<Tier, number> = {
  EX: 0,
  T0: 1,
  "T0.5": 2,
  T1: 3,
  "T1.5": 4,
  T2: 5,
  T3: 6,
};

export function sortRankingEntries(entries: readonly RankingEntry[]): RankingEntry[] {
  return [...entries].sort((left, right) => {
    const tierDifference = tierOrder[left.tier] - tierOrder[right.tier];
    if (tierDifference !== 0) {
      return tierDifference;
    }
    return (right.score ?? 0) - (left.score ?? 0);
  });
}

export function findRanking(
  rankings: readonly RankingSnapshot[],
  mode: RankingMode,
): RankingSnapshot | undefined {
  return rankings.find((ranking) => ranking.mode === mode);
}

export function filterRankingByServants(
  ranking: RankingSnapshot,
  servantIds: ReadonlySet<string>,
): RankingSnapshot {
  return {
    ...ranking,
    entries: sortRankingEntries(
      ranking.entries.filter((entry) => servantIds.has(entry.servantId)),
    ),
  };
}

export function calculateDimensionScore(
  dimensions: Partial<RankingDimensions>,
  weights: Partial<RankingDimensions>,
): number {
  const keys = Object.keys(weights) as Array<keyof RankingDimensions>;
  const totalWeight = keys.reduce((sum, key) => sum + (weights[key] ?? 0), 0);
  if (totalWeight === 0) {
    return 0;
  }

  const weighted = keys.reduce(
    (sum, key) => sum + (dimensions[key] ?? 0) * (weights[key] ?? 0),
    0,
  );
  return Math.round((weighted / totalWeight) * 100) / 100;
}
