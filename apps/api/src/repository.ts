import { readFile } from "node:fs/promises";
import {
  assertDatasetSnapshot,
  bootstrapSnapshot,
  type DatasetSnapshot,
} from "@fgo-wiki/domain";
import type { ApiConfig } from "./config.js";

export interface DataRepository {
  getSnapshot(): DatasetSnapshot;
}

class MemoryDataRepository implements DataRepository {
  public constructor(private readonly snapshot: DatasetSnapshot) {}

  public getSnapshot(): DatasetSnapshot {
    return this.snapshot;
  }
}

export async function createDataRepository(config: ApiConfig): Promise<DataRepository> {
  if (config.dataSource === "bootstrap") {
    return new MemoryDataRepository(bootstrapSnapshot);
  }

  const serialized = await readFile(config.snapshotPath, "utf8");
  const value: unknown = JSON.parse(serialized);
  assertDatasetSnapshot(value);
  return new MemoryDataRepository(value);
}
