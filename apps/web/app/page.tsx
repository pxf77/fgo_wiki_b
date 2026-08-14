import { ServantExplorer } from "../components/servant-explorer";
import { loadBuildSnapshot } from "../lib/build-snapshot";

export default async function HomePage() {
  const snapshot = await loadBuildSnapshot();
  const releasedArcherCount = snapshot.servants.filter(
    (servant) => servant.className === "archer" && servant.release.status === "released",
  ).length;
  const statusLabel =
    snapshot.metadata.sourceStatus === "reviewed"
      ? "国服事实快照"
      : "Bootstrap 开发快照";

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">FGO 简中服 · 非官方玩家工具</p>
          <h1>强度不是一个总分，先确定你要解决的关卡。</h1>
          <p className="lead">
            当前快照收录 {releasedArcherCount} 名弓阶从者，并支持宝具范围、Q/A/B、自充与
            90++ / 高难模式筛选。
          </p>
        </div>
        <dl className="release-card">
          <div>
            <dt>数据版本</dt>
            <dd>{snapshot.metadata.datasetVersion}</dd>
          </div>
          <div>
            <dt>榜单修订</dt>
            <dd>r{snapshot.metadata.rankingRevision}</dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd>{statusLabel}</dd>
          </div>
        </dl>
      </section>
      <ServantExplorer snapshot={snapshot} />
      <footer>
        <p>榜单评价与客观数据分层维护；国服实装状态最终以国服官方公告门禁为准。</p>
      </footer>
    </main>
  );
}
