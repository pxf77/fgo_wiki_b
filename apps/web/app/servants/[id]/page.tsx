import Link from "next/link";
import { notFound } from "next/navigation";
import { sortRankingEntries } from "@fgo-wiki/ranking-engine";
import { servantFaceUrl } from "@fgo-wiki/shared-ui";
import { classLabels } from "../../../lib/class-labels";
import { loadBuildCatalog, loadBuildServantSnapshot } from "../../../lib/build-snapshot";

export async function generateStaticParams() {
  const catalog = await loadBuildCatalog();
  return catalog.servants.map((servant) => ({ id: servant.id }));
}

export default async function ServantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await loadBuildServantSnapshot(id).catch(() => undefined);
  if (!snapshot) notFound();
  const servant = snapshot.servants[0];
  if (!servant) notFound();
  const rankingRows = snapshot.rankings
    .map((ranking) => ({ ranking, entry: sortRankingEntries(ranking.entries)[0] }))
    .filter((row) => row.entry !== undefined);
  const evidence = servant.release.evidence;
  const faceUrl = servantFaceUrl(servant);

  return (
    <main className="detail-page">
      <Link className="back-link" href={`/classes/${servant.className}/`}>← 返回 {classLabels[servant.className]}</Link>
      <header className="detail-hero">
        <div className="detail-identity">
          {faceUrl ? (
            <img className="detail-avatar" src={faceUrl} alt={`${servant.name}头像`} decoding="async" />
          ) : null}
          <div>
            <p className="eyebrow">{servant.rarity}★ {classLabels[servant.className]} · {servant.profile ?? "未分类"}</p>
            <h1>{servant.name}</h1>
            {servant.aliases.length ? <p className="lead">别名：{servant.aliases.join(" / ")}</p> : null}
          </div>
        </div>
        <dl className="release-card">
          <div><dt>数据版本</dt><dd>{snapshot.metadata.datasetVersion}</dd></div>
          <div><dt>数据来源</dt><dd>{servant.release.source === "atlas_cn" ? "Atlas Academy CN" : "国服人工核验"}</dd></div>
          <div><dt>NP 充能</dt><dd>自充 {servant.charge.self}% · 群充 {servant.charge.team}%</dd></div>
        </dl>
      </header>

      <section className="detail-section">
        <h2>宝具</h2>
        <div className="detail-grid">
          {servant.noblePhantasms.map((np) => (
            <article key={np.id} className="detail-card">
              <p className="eyebrow">{np.color.toUpperCase()} · {np.scope}</p>
              <h3>{np.name}</h3>
              <p>{np.strengthened ? "当前 CN 数据：已强化" : "当前 CN 数据：基础状态"}</p>
              {np.damageMultipliers?.length ? <p>NP1 / NP5 倍率：{np.damageMultipliers[0]}% / {np.damageMultipliers.at(-1)}%</p> : null}
              {np.hitCount ? <p>Hit：{np.hitCount}</p> : null}
              {np.effects.length ? <p>{np.effects.join(" · ")}</p> : null}
            </article>
          ))}
        </div>
      </section>

      {servant.capabilities ? (
        <section className="detail-section">
          <h2>能力画像</h2>
          <article className="source-card">
            <p>攻击 {servant.capabilities.offense} · 辅助 {servant.capabilities.support} · 生存 {servant.capabilities.survival} · 控制 {servant.capabilities.control}</p>
            <p>弱化处理 {servant.capabilities.cleanse} · 穿透 {servant.capabilities.pierce} · 减 CD {servant.capabilities.cooldown} · 暴击 {servant.capabilities.critical}</p>
          </article>
        </section>
      ) : null}

      <section className="detail-section">
        <h2>当前评价</h2>
        <div className="detail-grid">
          {rankingRows.map(({ ranking, entry }) => (
            <article key={ranking.mode} className="detail-card">
              <p className="eyebrow">{ranking.mode}</p>
              <h3>{entry!.tier}{entry!.score !== undefined ? ` · ${entry!.score}` : ""}</h3>
              <p>{entry!.rationale}</p><p>置信度：{entry!.confidence}</p>
              {entry!.conditions.length ? <p>条件：{entry!.conditions.join("；")}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="detail-section">
        <h2>数据来源</h2>
        {evidence ? (
          <article className="source-card"><strong>{evidence.title}</strong><p>{evidence.publisher} · {evidence.publishedAt}</p><a href={evidence.url} target="_blank" rel="noreferrer">打开国服来源</a></article>
        ) : (
          <article className="source-card"><strong>Atlas Academy CN 区域数据</strong><p>当前 roster 与客观字段来自 CN export；未伪造独立公告或历史强化日期。</p></article>
        )}
      </section>
    </main>
  );
}
