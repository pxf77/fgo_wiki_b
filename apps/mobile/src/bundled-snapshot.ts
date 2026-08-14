import {
  assertDatasetSnapshot,
  type DatasetSnapshot,
} from "@fgo-wiki/domain";

export async function loadBundledSnapshot(
  fetcher: typeof fetch = fetch,
): Promise<DatasetSnapshot> {
  const url = new URL("data/initial-snapshot.json", document.baseURI).toString();
  const response = await fetcher(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`内置数据读取失败：${response.status}`);
  }
  const value: unknown = await response.json();
  assertDatasetSnapshot(value);
  if (value.metadata.sourceStatus !== "reviewed") {
    throw new Error("安装包内置数据不是 reviewed 国服事实快照");
  }
  return value;
}
