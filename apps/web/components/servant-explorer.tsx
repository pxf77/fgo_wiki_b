"use client";

import { useMemo, useState } from "react";
import {
  bootstrapSnapshot,
  type CardColor,
  type NoblePhantasmScope,
  type RankingMode,
} from "@fgo-wiki/domain";
import { filterServants, type ServantFilter } from "@fgo-wiki/filter-engine";
import { findRanking } from "@fgo-wiki/ranking-engine";
import { ServantCard } from "@fgo-wiki/shared-ui";

export function ServantExplorer() {
  const [query, setQuery] = useState("");
  const [color, setColor] = useState<CardColor | "all">("all");
  const [scope, setScope] = useState<NoblePhantasmScope | "all">("all");
  const [strengthening, setStrengthening] = useState<"all" | "strengthened" | "base">(
    "all",
  );
  const [minimumCharge, setMinimumCharge] = useState(0);
  const [mode, setMode] = useState<RankingMode>("farming_90pp");

  const filtered = useMemo(() => {
    const filter: ServantFilter = {
      classes: ["archer"],
      releasedOnly: true,
      minSelfCharge: minimumCharge,
    };
    if (query) filter.query = query;
    if (color !== "all") filter.npColors = [color];
    if (scope !== "all") filter.npScopes = [scope];
    if (strengthening !== "all") {
      filter.npStrengthened = strengthening === "strengthened";
    }
    return filterServants(bootstrapSnapshot.servants, filter);
  }, [color, minimumCharge, query, scope, strengthening]);

  const ranking = findRanking(bootstrapSnapshot.rankings, mode);
  const rankingByServant = new Map(ranking?.entries.map((entry) => [entry.servantId, entry]));

  return (
    <section className="explorer" aria-labelledby="explorer-title">
      <header className="section-heading">
        <div>
          <p className="eyebrow">可复现筛选条件</p>
          <h2 id="explorer-title">弓阶强度图鉴</h2>
        </div>
        <span>{filtered.length} 名从者</span>
      </header>

      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <label>
          名称或标签
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="芭万·希 / 魔性 / 变则"
          />
        </label>
        <label>
          宝具色卡
          <select value={color} onChange={(event) => setColor(event.target.value as CardColor | "all")}>
            <option value="all">全部</option>
            <option value="quick">Quick</option>
            <option value="arts">Arts</option>
            <option value="buster">Buster</option>
          </select>
        </label>
        <label>
          宝具范围
          <select value={scope} onChange={(event) => setScope(event.target.value as NoblePhantasmScope | "all")}>
            <option value="all">全部</option>
            <option value="single">单体</option>
            <option value="aoe">全体</option>
            <option value="support">辅助</option>
          </select>
        </label>
        <label>
          强化状态
          <select
            value={strengthening}
            onChange={(event) =>
              setStrengthening(event.target.value as "all" | "strengthened" | "base")
            }
          >
            <option value="all">全部</option>
            <option value="strengthened">已强化宝具</option>
            <option value="base">未强化宝具</option>
          </select>
        </label>
        <label>
          最低自充
          <select value={minimumCharge} onChange={(event) => setMinimumCharge(Number(event.target.value))}>
            <option value={0}>不限</option>
            <option value={30}>30%</option>
            <option value={50}>50%</option>
            <option value={60}>60%</option>
          </select>
        </label>
        <label>
          榜单模式
          <select value={mode} onChange={(event) => setMode(event.target.value as RankingMode)}>
            <option value="farming_90pp">90++ / 变则</option>
            <option value="high_difficulty">高难</option>
          </select>
        </label>
      </form>

      <div className="servant-grid">
        {filtered.map((servant) => (
          <ServantCard
            key={servant.id}
            servant={servant}
            ranking={rankingByServant.get(servant.id)}
            className="servant-card"
          />
        ))}
      </div>

      {filtered.length === 0 ? <p className="empty-state">没有符合当前条件的国服从者。</p> : null}
    </section>
  );
}
