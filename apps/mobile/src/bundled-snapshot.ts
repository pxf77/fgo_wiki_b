import {
  assertDatasetSnapshot,
  type DatasetMetadata,
  type DatasetSnapshot,
  type ServantClass,
} from "@fgo-wiki/domain";

export interface BundledCatalog {
  metadata: DatasetMetadata;
  servants: Array<{ id: string; name?: string; className: ServantClass }>;
}

async function fetchJson(path: string, fetcher: typeof fetch): Promise<unknown> {
  const url = new URL(path, document.baseURI).toString();
  const response = await fetcher(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`内置数据读取失败：${response.status}`);
  return response.json();
}

export async function loadBundledCatalog(fetcher: typeof fetch = fetch): Promise<BundledCatalog> {
  const value = (await fetchJson("data/catalog.json", fetcher)) as BundledCatalog;
  if (!value || typeof value !== "object" || !Array.isArray(value.servants)) {
    throw new Error("安装包内置目录无效");
  }
  return value;
}

export async function loadBundledClassSnapshot(
  className: ServantClass,
  fetcher: typeof fetch = fetch,
): Promise<DatasetSnapshot> {
  const value: unknown = await fetchJson(`data/classes/${className}.json`, fetcher);
  assertDatasetSnapshot(value);
  if (value.metadata.sourceStatus !== "reviewed") {
    throw new Error("安装包内置数据不是 reviewed 国服事实快照");
  }
  return value;
}

export async function loadBundledSnapshot(fetcher: typeof fetch = fetch): Promise<DatasetSnapshot> {
  return loadBundledClassSnapshot("archer", fetcher);
}
