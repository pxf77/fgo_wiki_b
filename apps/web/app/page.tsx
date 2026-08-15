import Link from "next/link";
import type { ServantClass } from "@fgo-wiki/domain";
import { classLabels } from "../lib/class-labels";
import { loadBuildCatalog } from "../lib/build-snapshot";

export default async function HomePage() {
  const catalog = await loadBuildCatalog();
  const counts = new Map<ServantClass, number>();
  for (const servant of catalog.servants) {
    counts.set(servant.className, (counts.get(servant.className) ?? 0) + 1);
  }
  const classes = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">FGO 简中服 · 非官方玩家工具</p>
          <h1>国服全职阶强度图鉴。</h1>
          <p className="lead">
            当前快照收录 {catalog.servants.length} 名从者，按职阶提供 90++、高难、辅助、NP1 与 NP5 数据榜。
          </p>
        </div>
        <dl className="release-card">
          <div><dt>数据版本</dt><dd>{catalog.metadata.datasetVersion}</dd></div>
          <div><dt>榜单修订</dt><dd>r{catalog.metadata.rankingRevision}</dd></div>
          <div><dt>职阶</dt><dd>{classes.length}</dd></div>
        </dl>
      </section>
      <section className="explorer" aria-labelledby="classes-title">
        <header className="section-heading">
          <div><p className="eyebrow">按职阶进入</p><h2 id="classes-title">国服职阶索引</h2></div>
          <span>{catalog.servants.length} 名从者</span>
        </header>
        <div className="servant-grid">
          {classes.map(([className, count]) => (
            <Link key={className} href={`/classes/${className}/`} className="servant-card">
              <header><strong>{count}</strong><span>名从者</span></header>
              <h3>{classLabels[className]}</h3>
              <p>查看该职阶完整筛选、规则榜与人工覆盖评价。</p>
              <div>90++ · 高难 · Support · NP1 · NP5</div>
            </Link>
          ))}
        </div>
      </section>
      <footer><p>Atlas CN 客观事实与 Git 管理的人工评价分层维护。</p></footer>
    </main>
  );
}
