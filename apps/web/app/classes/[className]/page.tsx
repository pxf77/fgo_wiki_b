import Link from "next/link";
import { notFound } from "next/navigation";
import { servantClasses, type ServantClass } from "@fgo-wiki/domain";
import { ServantExplorer } from "../../../components/servant-explorer";
import { classLabels } from "../../../lib/class-labels";
import { loadBuildCatalog, loadBuildClassSnapshot } from "../../../lib/build-snapshot";

export async function generateStaticParams() {
  const catalog = await loadBuildCatalog();
  return [...new Set(catalog.servants.map((servant) => servant.className))].map((className) => ({ className }));
}

export default async function ClassPage({ params }: { params: Promise<{ className: string }> }) {
  const { className: raw } = await params;
  if (!servantClasses.includes(raw as ServantClass)) notFound();
  const className = raw as ServantClass;
  const snapshot = await loadBuildClassSnapshot(className);
  if (snapshot.servants.length === 0) notFound();

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><Link href="/">全职阶</Link> · {classLabels[className]}</p>
          <h1>{classLabels[className]}强度图鉴</h1>
          <p className="lead">当前收录 {snapshot.servants.length} 名从者。规则评分与人工评价明确区分。</p>
        </div>
        <dl className="release-card">
          <div><dt>数据版本</dt><dd>{snapshot.metadata.datasetVersion}</dd></div>
          <div><dt>职阶</dt><dd>{classLabels[className]}</dd></div>
          <div><dt>从者</dt><dd>{snapshot.servants.length}</dd></div>
        </dl>
      </section>
      <ServantExplorer snapshot={snapshot} className={className} classLabel={classLabels[className]} />
      <footer><p><Link href="/">返回全职阶索引</Link></p></footer>
    </main>
  );
}
