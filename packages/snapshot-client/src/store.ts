import { assertDatasetSnapshot, type DatasetSnapshot } from "@fgo-wiki/domain";

export interface SnapshotPointer {
  datasetVersion: string;
  snapshotUrl: string;
  minimumAppVersion: string;
  publishedAt: string;
}

export interface SnapshotStore {
  get(): Promise<DatasetSnapshot | undefined>;
  put(snapshot: DatasetSnapshot): Promise<void>;
}

export class BrowserSnapshotStore implements SnapshotStore {
  public constructor(private readonly key = "fgo-wiki:dataset") {}

  public async get(): Promise<DatasetSnapshot | undefined> {
    if (typeof localStorage === "undefined") {
      return undefined;
    }
    const serialized = localStorage.getItem(this.key);
    if (!serialized) {
      return undefined;
    }
    const value: unknown = JSON.parse(serialized);
    assertDatasetSnapshot(value);
    return value;
  }

  public async put(snapshot: DatasetSnapshot): Promise<void> {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(this.key, JSON.stringify(snapshot));
  }
}

export async function fetchSnapshotPointer(
  pointerUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<SnapshotPointer> {
  const response = await fetcher(pointerUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Snapshot pointer request failed: ${response.status}`);
  }
  return (await response.json()) as SnapshotPointer;
}

export async function updateSnapshot(
  pointer: SnapshotPointer,
  store: SnapshotStore,
  fetcher: typeof fetch = fetch,
): Promise<{ snapshot: DatasetSnapshot; updated: boolean }> {
  const current = await store.get();
  if (current?.metadata.datasetVersion === pointer.datasetVersion) {
    return { snapshot: current, updated: false };
  }

  const response = await fetcher(pointer.snapshotUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Snapshot request failed: ${response.status}`);
  }

  const value: unknown = await response.json();
  assertDatasetSnapshot(value);
  if (value.metadata.datasetVersion !== pointer.datasetVersion) {
    throw new Error("Snapshot version does not match its release pointer");
  }

  await store.put(value);
  return { snapshot: value, updated: true };
}
