"use client";

import { useMemo, useState } from "react";
import type {
  CardColor,
  DatasetSnapshot,
  NoblePhantasmScope,
  RankingMode,
  ServantClass,
} from "@fgo-wiki/domain";
import { filterServants, type ServantFilter } from "@fgo-wiki/filter-engine";
import { findRanking, sortRankingEntries } from "@fgo-wiki/ranking-engine";
import { ServantCard } from "@fgo-wiki/shared-ui";

export interface ServantExplorerProps {
  snapshot: DatasetSnapshot;
  className: ServantClass;
  classLabel: string;
}

export function ServantExplorer({ snapshot, className, classLabel }: ServantExplorerProps) {
  const [query, setQuery] = useState("");
  const [color, setColor] = useState<CardColor | "all">("all");
  const [scope, setScope] = useState<NoblePhantasmScope | "all">("all");
  const [strengthening, setStrengthening] = useState<"all" | "strengthened" | "base">("all");
  const [minimumCharge, setMinimumCharge] = useState(0);
  const [mode, setMode] = useState<RankingMode>("farming_90pp");

  const ranking = useMemo(() => findRanking(snapshot.rankings, mode), [mode, snapshot.rankings]);
  const rankingByServant = useMemo(
    () => new Map(ranking?.entries.map((entry) => [entry.servantId, entry])),
    [ranking],
  );
  const rankingOrder = useMemo(
    () => new Map(sortRankingEntries(ranking?.entries ?? []).map((entry, index) => [entry.servantId, index])),
    [ranking],
  );

  const filtered = useMemo(() => {
    const filter: ServantFilter = {
      classes: [className],
      releasedOnly: true,
      minSelfCharge: minimumCharge,
    };
    if (query) filter.query = query;
    if (color !== "all") filter.npColors = [color];
    if (scope !== "all") filter.npScopes = [scope];
    if (strengthening !== "all") filter.npStrengthened = strengthening === "strengthened";
    return filterServants(snapshot.servants, filter).sort(
      (left, right) =>
        (rankingOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (rankingOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
        left.name.localeCompare(right.name, "zh-CN"),
    );
  }, [className, color, minimumCharge, query, rankingOrder, scope, snapshot.servants, strengthening]);

  return (
    <section className="explorer" aria-labelledby="explorer-title">
      <header className="section-heading">
        <div><p className="eyebrow">国服当前数据 · 可复现筛选</p><h2 id="explorer-title">{classLabel}</h2></div>
        <span>{filtered.length} 名从者</span>
      </header>
      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <label>名称或标签<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名称 / 单体 / 50自充" /></label>
        <label>宝具色卡<select value={color} onChange={(event) => setColor(event.target.value as CardColor | "all")}><option value="all">全部</option><option value="quick">Quick</option><option value="arts">Arts</option><option value="buster">Buster</option></select></label>
        <label>宝具范围<select value={scope} onChange={(event) => setScope(event.target.value as NoblePhantasmScope | "all")}><option value="all">全部</option><option value="single">单体</option><option value="aoe">全体</option><option value="support">辅助</option></select></label>
        <label>强化状态<select value={strengthening} onChange={(event) => setStrengthening(event.target.value as "all" | "strengthened" | "base")}><option value="all">全部</option><option value="strengthened">已强化宝具</option><option value="base">未强化宝具</option></select></label>
        <label>最低自充<select value={minimumCharge} onChange={(event) => setMinimumCharge(Number(event.target.value))}><option value={0}>不限</option><option value={20}>20%</option><option value={30}>30%</option><option value={50}>50%</option><option value={80}>80%</option></select></label>
        <label>榜单模式<select value={mode} onChange={(event) => setMode(event.target.value as RankingMode)}><option value="farming_90pp">90++ / 变则</option><option value="high_difficulty">高难</option><option value="support">辅助</option><option value="np1_value">NP1 数据榜</option><option value="np5_value">NP5 数据榜</option></select></label>
      </form>
      <p className="ranking-note">
        {ranking?.origin === "computed" ? "当前模式为确定性规则/数据榜。" : ranking?.origin === "mixed" ? "人工评级覆盖已核验条目，其余从者使用透明规则评分补齐。" : "当前模式使用人工维护榜单。"}
      </p>
      <div className="servant-grid">
        {filtered.map((servant) => (
          <div key={servant.id} className="servant-shell">
            <ServantCard servant={servant} ranking={rankingByServant.get(servant.id)} className="servant-card" />
            <a className="detail-link" href={`/servants/${servant.id}/`}>查看数据、来源与各模式评价</a>
          </div>
        ))}
      </div>
      {filtered.length === 0 ? <p className="empty-state">没有符合当前条件的国服从者。</p> : null}
    </section>
  );
}
