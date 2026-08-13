import { useEffect, useMemo, useState } from "react";
import { FgoWikiApiClient } from "@fgo-wiki/api-client";
import {
  bootstrapSnapshot,
  type CardColor,
  type DatasetSnapshot,
  type NoblePhantasmScope,
} from "@fgo-wiki/domain";
import { filterServants, type ServantFilter } from "@fgo-wiki/filter-engine";
import { findRanking } from "@fgo-wiki/ranking-engine";
import { ServantCard } from "@fgo-wiki/shared-ui";
import { BrowserSnapshotStore } from "@fgo-wiki/snapshot-client";

const store = new BrowserSnapshotStore("fgo-wiki:mobile-dataset");
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export function App() {
  const [snapshot, setSnapshot] = useState<DatasetSnapshot>(bootstrapSnapshot);
  const [color, setColor] = useState<CardColor | "all">("all");
  const [scope, setScope] = useState<NoblePhantasmScope | "all">("all");
  const [favorites, setFavorites] = useState<string[]>(() => {
    const value = localStorage.getItem("fgo-wiki:favorites");
    return value ? (JSON.parse(value) as string[]) : [];
  });
  const [message, setMessage] = useState("离线数据已就绪");

  useEffect(() => {
    void store.get().then((cached) => {
      if (cached) setSnapshot(cached);
    });
  }, []);

  const servants = useMemo(() => {
    const filter: ServantFilter = { classes: ["archer"], releasedOnly: true };
    if (color !== "all") filter.npColors = [color];
    if (scope !== "all") filter.npScopes = [scope];
    return filterServants(snapshot.servants, filter);
  }, [color, scope, snapshot]);

  const ranking = findRanking(snapshot.rankings, "farming_90pp");
  const rankingByServant = new Map(ranking?.entries.map((entry) => [entry.servantId, entry]));

  function toggleFavorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((item) => item !== id)
      : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("fgo-wiki:favorites", JSON.stringify(next));
  }

  async function refreshDataset() {
    if (!apiBaseUrl) {
      setMessage("未配置 VITE_API_BASE_URL，继续使用离线快照");
      return;
    }

    setMessage("正在检查国服数据更新…");
    try {
      const client = new FgoWikiApiClient({ baseUrl: apiBaseUrl });
      const latest = await client.getLatestDataset();
      await store.put(latest);
      setSnapshot(latest);
      setMessage(`已更新到 ${latest.metadata.datasetVersion}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新失败");
    }
  }

  return (
    <main>
      <header className="mobile-header">
        <div>
          <p>FGO 简中服 · 离线决策工具</p>
          <h1>灵基决策站</h1>
        </div>
        <button onClick={() => void refreshDataset()}>检查更新</button>
      </header>

      <section className="status-card">
        <strong>{snapshot.metadata.datasetVersion}</strong>
        <span>{message}</span>
      </section>

      <section className="mobile-filters">
        <label>
          色卡
          <select value={color} onChange={(event) => setColor(event.target.value as CardColor | "all")}>
            <option value="all">全部</option>
            <option value="quick">Quick</option>
            <option value="arts">Arts</option>
            <option value="buster">Buster</option>
          </select>
        </label>
        <label>
          宝具
          <select value={scope} onChange={(event) => setScope(event.target.value as NoblePhantasmScope | "all")}>
            <option value="all">全部</option>
            <option value="single">单体</option>
            <option value="aoe">全体</option>
          </select>
        </label>
      </section>

      <section className="mobile-list">
        {servants.map((servant) => (
          <div key={servant.id} className="mobile-card-shell">
            <button className="favorite" onClick={() => toggleFavorite(servant.id)}>
              {favorites.includes(servant.id) ? "已收藏" : "收藏"}
            </button>
            <ServantCard
              servant={servant}
              ranking={rankingByServant.get(servant.id)}
              className="mobile-servant-card"
            />
          </div>
        ))}
      </section>
    </main>
  );
}
