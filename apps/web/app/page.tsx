import { bootstrapSnapshot } from "@fgo-wiki/domain";
import { ServantExplorer } from "../components/servant-explorer";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">FGO 简中服 · 非官方玩家工具</p>
          <h1>强度不是一个总分，先确定你要解决的关卡。</h1>
          <p className="lead">
            当前垂直切片覆盖弓阶，并支持宝具范围、Q/A/B、自充与 90++ / 高难模式筛选。
          </p>
        </div>
        <dl className="release-card">
          <div>
            <dt>数据版本</dt>
            <dd>{bootstrapSnapshot.metadata.datasetVersion}</dd>
          </div>
          <div>
            <dt>榜单修订</dt>
            <dd>r{bootstrapSnapshot.metadata.rankingRevision}</dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd>弓阶启动快照</dd>
          </div>
        </dl>
      </section>
      <ServantExplorer />
      <footer>
        <p>榜单评价与客观数据分层维护；国服实装状态最终以国服官方公告门禁为准。</p>
      </footer>
    </main>
  );
}
