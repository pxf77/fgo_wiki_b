import { useEffect, useMemo, useState } from "react";
import { FgoWikiApiClient } from "@fgo-wiki/api-client";
import {
  assertDatasetSnapshot,
  type CardColor,
  type DatasetSnapshot,
  type NoblePhantasmScope,
  type ServantClass,
} from "@fgo-wiki/domain";
import { filterServants, type ServantFilter } from "@fgo-wiki/filter-engine";
import { findRanking } from "@fgo-wiki/ranking-engine";
import { ServantCard } from "@fgo-wiki/shared-ui";
import { BrowserSnapshotStore } from "@fgo-wiki/snapshot-client";
import { loadBundledCatalog, loadBundledClassSnapshot } from "./bundled-snapshot";
import { selectPreferredSnapshot } from "./startup-snapshot";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const storeFor = (className: ServantClass) => new BrowserSnapshotStore(`fgo-wiki:mobile-dataset:${className}`);

export function App() {
  const [availableClasses, setAvailableClasses] = useState<ServantClass[]>(["archer"]);
  const [selectedClass, setSelectedClass] = useState<ServantClass>("archer");
  const [snapshot, setSnapshot] = useState<DatasetSnapshot>();
  const [color, setColor] = useState<CardColor | "all">("all");
  const [scope, setScope] = useState<NoblePhantasmScope | "all">("all");
  const [favorites, setFavorites] = useState<string[]>(() => {
    const value = localStorage.getItem("fgo-wiki:favorites");
    return value ? (JSON.parse(value) as string[]) : [];
  });
  const [message, setMessage] = useState("正在载入内置国服事实数据…");

  useEffect(() => {
    void loadBundledCatalog()
      .then((catalog) => {
        const classes = [...new Set(catalog.servants.map((servant) => servant.className))];
        setAvailableClasses(classes);
        if (!classes.includes(selectedClass) && classes[0]) setSelectedClass(classes[0]);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "目录读取失败"));
  }, []);

  useEffect(() => {
    let active = true;
    setSnapshot(undefined);
    setMessage(`正在载入 ${selectedClass} 离线数据…`);
    void (async () => {
      try {
        const bundled = await loadBundledClassSnapshot(selectedClass);
        const cached = await storeFor(selectedClass).get().catch(() => undefined);
        if (!active) return;
        const preferred = selectPreferredSnapshot(bundled, cached);
        setSnapshot(preferred);
        setMessage(`${selectedClass} 已就绪 · ${preferred.metadata.datasetVersion}`);
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "内置数据读取失败");
      }
    })();
    return () => { active = false; };
  }, [selectedClass]);

  const servants = useMemo(() => {
    if (!snapshot) return [];
    const filter: ServantFilter = { classes: [selectedClass], releasedOnly: true };
    if (color !== "all") filter.npColors = [color];
    if (scope !== "all") filter.npScopes = [scope];
    return filterServants(snapshot.servants, filter);
  }, [color, scope, selectedClass, snapshot]);

  const ranking = snapshot ? findRanking(snapshot.rankings, "farming_90pp") : undefined;
  const rankingByServant = new Map(ranking?.entries.map((entry) => [entry.servantId, entry]));

  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("fgo-wiki:favorites", JSON.stringify(next));
  }

  async function refreshDataset() {
    if (!snapshot) return;
    if (!apiBaseUrl) {
      setMessage("未配置 VITE_API_BASE_URL，继续使用离线快照");
      return;
    }
    setMessage(`正在检查 ${selectedClass} 数据更新…`);
    try {
      const client = new FgoWikiApiClient({ baseUrl: apiBaseUrl });
      const latest = await client.getClassDataset(selectedClass);
      assertDatasetSnapshot(latest);
      if (latest.metadata.sourceStatus !== "reviewed") throw new Error("更新端未发布 reviewed 国服事实快照");
      const preferred = selectPreferredSnapshot(snapshot, latest);
      if (preferred === snapshot && latest.metadata.datasetVersion !== snapshot.metadata.datasetVersion) {
        setMessage(`当前版本 ${snapshot.metadata.datasetVersion} 不旧于更新端`);
        return;
      }
      await storeFor(selectedClass).put(latest);
      setSnapshot(latest);
      setMessage(`已更新 ${selectedClass} 到 ${latest.metadata.datasetVersion}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新失败");
    }
  }

  return (
    <main>
      <header className="mobile-header">
        <div><p>FGO 简中服 · 全职阶离线决策工具</p><h1>灵基决策站</h1></div>
        <button disabled={!snapshot} onClick={() => void refreshDataset()}>检查更新</button>
      </header>
      <section className="status-card"><strong>{snapshot?.metadata.datasetVersion ?? "载入中"}</strong><span>{message}</span></section>
      <section className="mobile-filters">
        <label>职阶<select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value as ServantClass)}>{availableClasses.map((className) => <option key={className} value={className}>{className}</option>)}</select></label>
        <label>色卡<select value={color} onChange={(event) => setColor(event.target.value as CardColor | "all")}><option value="all">全部</option><option value="quick">Quick</option><option value="arts">Arts</option><option value="buster">Buster</option></select></label>
        <label>宝具<select value={scope} onChange={(event) => setScope(event.target.value as NoblePhantasmScope | "all")}><option value="all">全部</option><option value="single">单体</option><option value="aoe">全体</option><option value="support">辅助</option></select></label>
      </section>
      {!snapshot ? <p className="mobile-loading">正在载入离线数据…</p> : null}
      <section className="mobile-list">
        {servants.map((servant) => (
          <div key={servant.id} className="mobile-card-shell">
            <button className="favorite" onClick={() => toggleFavorite(servant.id)}>{favorites.includes(servant.id) ? "已收藏" : "收藏"}</button>
            <ServantCard servant={servant} ranking={rankingByServant.get(servant.id)} className="mobile-servant-card" />
          </div>
        ))}
      </section>
    </main>
  );
}
