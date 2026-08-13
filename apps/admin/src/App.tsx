import { useState } from "react";
import { bootstrapSnapshot } from "@fgo-wiki/domain";
import { sortRankingEntries } from "@fgo-wiki/ranking-engine";

type Decision = "pending" | "approved" | "rejected";

export function App() {
  const ranking = bootstrapSnapshot.rankings.find((item) => item.mode === "farming_90pp");
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  if (!ranking) return <main>暂无待审核榜单。</main>;

  return (
    <main>
      <header className="hero">
        <p>内部工具 · 需要独立鉴权后部署</p>
        <h1>国服榜单审核队列</h1>
        <span>{ranking.asOf} · revision {ranking.revision}</span>
      </header>
      <section className="queue">
        {sortRankingEntries(ranking.entries).map((entry) => {
          const servant = bootstrapSnapshot.servants.find((item) => item.id === entry.servantId);
          const decision = decisions[entry.servantId] ?? "pending";
          return (
            <article key={entry.servantId}>
              <div>
                <strong>{entry.tier}</strong>
                <h2>{servant?.name ?? entry.servantId}</h2>
                <p>{entry.rationale}</p>
                <small>状态：{decision}</small>
              </div>
              <div className="actions">
                <button onClick={() => setDecisions({ ...decisions, [entry.servantId]: "approved" })}>
                  通过
                </button>
                <button onClick={() => setDecisions({ ...decisions, [entry.servantId]: "rejected" })}>
                  不通过
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
