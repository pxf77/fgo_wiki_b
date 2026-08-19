// Read-only CN data-status dashboard.
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DataStatusDashboard,
  DatasetSourceVersions,
} from "@fgo-wiki/domain";
import { fetchDataStatus } from "./data-status-api.js";

const publicationLabels = {
  ready: "已同步",
  stale: "待重新生成",
  blocked: "数据阻断",
  bootstrap: "开发数据",
} as const;

const gateLabels = {
  passed: "校验通过",
  applied: "已应用",
  pending: "待处理",
} as const;

const sourceVersionLabels: Array<{
  key: keyof DatasetSourceVersions;
  label: string;
}> = [
  { key: "atlasCn", label: "Atlas" },
  { key: "releaseEvidence", label: "实装" },
  { key: "strengtheningEvidence", label: "强化" },
  { key: "publicationPolicy", label: "发布策略" },
  { key: "capabilityRules", label: "能力规则" },
  { key: "rankingFormula", label: "排名公式" },
];

function SourceVersions({
  values,
}: {
  values: DatasetSourceVersions | undefined;
}) {
  if (!values) return <span className="muted">无</span>;
  return (
    <dl className="versions">
      {sourceVersionLabels.map(({ key, label }) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>{values[key]}</dd>
        </div>
      ))}
    </dl>
  );
}

export function App() {
  const [dashboard, setDashboard] = useState<DataStatusDashboard>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setDashboard(await fetchDataStatus());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const missingSourceCandidates = useMemo(() => {
    const token = query.trim().toLocaleLowerCase("zh-CN");
    if (!dashboard || !token) return dashboard?.missingSourceCandidates ?? [];
    return dashboard.missingSourceCandidates.filter((entry) =>
      `${entry.collectionNo} ${entry.atlasId} ${entry.name} ${entry.reason}`
        .toLocaleLowerCase("zh-CN")
        .includes(token),
    );
  }, [dashboard, query]);

  if (!dashboard && loading) {
    return (
      <main className="shell">
        <p className="state">正在读取数据状态……</p>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="shell">
        <section className="state error">
          <h1>数据状态不可用</h1>
          <p>{error ?? "未知错误"}</p>
          <button type="button" onClick={() => void load()}>
            重新读取
          </button>
        </section>
      </main>
    );
  }

  const publication = dashboard.publication;

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">
            内部只读工具 · GitHub Pull Request 是唯一人工审核入口
          </p>
          <h1>FGO 国服数据状态台</h1>
          <p>
            汇总 Atlas 规范化、事实源、确定性门禁和当前发布快照。
            本页面只展示派生状态，不保存审批结果，也不直接修改事实源或榜单。
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {loading ? "刷新中…" : "刷新"}
        </button>
      </header>

      {error ? <p className="notice">{error}</p> : null}

      <section className="summary" aria-label="数据状态汇总">
        <article>
          <span>Atlas 候选</span>
          <strong>{dashboard.counts.atlasCandidates}</strong>
        </article>
        <article>
          <span>通过实装门禁</span>
          <strong>{dashboard.counts.passedReleases}</strong>
        </article>
        <article>
          <span>待补来源</span>
          <strong>{dashboard.counts.missingSourceCandidates}</strong>
        </article>
        <article>
          <span>强化事件</span>
          <strong>{dashboard.counts.strengtheningEvents}</strong>
        </article>
        <article>
          <span>榜单条目</span>
          <strong>{dashboard.counts.rankingEntries}</strong>
        </article>
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">业务数据扩展</p>
            <h2>职介覆盖率</h2>
          </div>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>职介</th>
                <th>Atlas 候选</th>
                <th>实装来源</th>
                <th>实装缺口</th>
                <th>Atlas 已强化宝具</th>
                <th>带日期证据</th>
                <th>Atlas 当前状态</th>
                <th>强化缺口</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.classCoverage.map((coverage) => (
                <tr key={coverage.className}>
                  <td>{coverage.className}</td>
                  <td>{coverage.atlasCandidates}</td>
                  <td>
                    {coverage.passedReleases}/{coverage.atlasCandidates}
                  </td>
                  <td>{coverage.missingReleaseSources}</td>
                  <td>{coverage.atlasStrengthenedNps}</td>
                  <td>{coverage.evidencedReleasedNps}</td>
                  <td>{coverage.atlasCurrentStrengthenedNps}</td>
                  <td>{coverage.missingStrengtheningEvents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel publication">
        <header>
          <div>
            <p className="eyebrow">数据发布状态</p>
            <h2>{publicationLabels[publication.status]}</h2>
          </div>
          <span className={`badge publication-${publication.status}`}>
            {publication.status}
          </span>
        </header>
        <div className="publication-grid">
          <div>
            <h3>当前快照</h3>
            <p>{publication.datasetVersion}</p>
            <small>{publication.sourceStatus}</small>
          </div>
          <div>
            <h3>事实源版本</h3>
            <SourceVersions values={publication.sourceManifestVersions} />
          </div>
          <div>
            <h3>门禁版本</h3>
            <SourceVersions values={publication.gateSourceVersions} />
          </div>
          <div>
            <h3>已发布版本</h3>
            <SourceVersions values={publication.publishedSourceVersions} />
          </div>
        </div>
        {publication.staleSourceVersions.length ? (
          <p className="notice">
            快照待同步：{publication.staleSourceVersions.join("、")}
          </p>
        ) : null}
        {publication.blockers.length ? (
          <ul className="blockers">
            {publication.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Atlas 候选</p>
            <h2>待补实装来源</h2>
          </div>
          <label className="search">
            筛选
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="编号、名称或原因"
            />
          </label>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>collectionNo</th>
                <th>Atlas ID</th>
                <th>名称</th>
                <th>原因</th>
              </tr>
            </thead>
            <tbody>
              {missingSourceCandidates.map((entry) => (
                <tr key={`${entry.collectionNo}-${entry.atlasId}`}>
                  <td>{entry.collectionNo}</td>
                  <td>{entry.atlasId}</td>
                  <td>{entry.name}</td>
                  <td>{entry.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!missingSourceCandidates.length ? (
          <p className="empty">没有符合条件的候选。</p>
        ) : null}
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">事实源</p>
            <h2>国服实装来源</h2>
          </div>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>编号</th>
                <th>从者</th>
                <th>职介/稀有度</th>
                <th>日期</th>
                <th>门禁状态</th>
                <th>来源</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.releaseSources.map((entry) => (
                <tr key={entry.servantId}>
                  <td>{entry.collectionNo}</td>
                  <td>{entry.displayName}</td>
                  <td>
                    {entry.className} · {entry.rarity}★
                  </td>
                  <td>{entry.releasedAt}</td>
                  <td>
                    <span className={`badge status-${entry.gateStatus}`}>
                      {gateLabels[entry.gateStatus]}
                    </span>
                  </td>
                  <td>
                    <a
                      href={entry.evidence.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {entry.evidence.title}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">事实源</p>
            <h2>国服强化事件</h2>
          </div>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>从者</th>
                <th>目标</th>
                <th>状态</th>
                <th>日期</th>
                <th>门禁状态</th>
                <th>来源</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.strengtheningSources.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.servantId}</td>
                  <td>{entry.target.targetName}</td>
                  <td>{entry.status}</td>
                  <td>{entry.releasedAt}</td>
                  <td>
                    <span className={`badge status-${entry.gateStatus}`}>
                      {gateLabels[entry.gateStatus]}
                    </span>
                  </td>
                  <td>
                    <a
                      href={entry.evidence.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {entry.evidence.title}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Git 管理榜单</p>
            <h2>当前榜单快照</h2>
          </div>
        </header>
        <div className="ranking-grid">
          {dashboard.rankings.map((ranking) => (
            <article key={ranking.mode}>
              <strong>{ranking.mode}</strong>
              <span>{ranking.entryCount} 条</span>
              <small>
                {ranking.asOf} · r{ranking.revision}
              </small>
            </article>
          ))}
        </div>
      </section>

      <footer>
        生成时间：{new Date(dashboard.generatedAt).toLocaleString("zh-CN")}
      </footer>
    </main>
  );
}
