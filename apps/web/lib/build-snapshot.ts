import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import {
  assertDatasetSnapshot,
  bootstrapSnapshot,
  type DatasetSnapshot,
} from "@fgo-wiki/domain";

const repositoryRoot = resolve(process.cwd(), "../..");
const defaultSnapshotPath = "data/generated/latest/classes/archer.json";

export interface BuildSnapshotOptions {
  snapshotPath?: string;
  allowBootstrapData?: boolean;
}

function parseBooleanFlag(value: string | undefined, name: string): boolean {
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;
  throw new Error(`${name} must be true or false`);
}

function resolveSnapshotPath(path: string): string {
  return isAbsolute(path) ? path : resolve(repositoryRoot, path);
}

async function readSnapshot(
  snapshotPath: string,
  allowBootstrapData: boolean,
): Promise<DatasetSnapshot> {
  let serialized: string;
  try {
    serialized = await readFile(snapshotPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      if (allowBootstrapData) return structuredClone(bootstrapSnapshot);
      throw new Error(
        `Web build snapshot not found at ${snapshotPath}. Run pnpm snapshot:build before pnpm build. Set ALLOW_BOOTSTRAP_DATA=true only for an explicit development fallback.`,
      );
    }
    throw error;
  }

  const value: unknown = JSON.parse(serialized);
  assertDatasetSnapshot(value);
  if (value.metadata.sourceStatus !== "reviewed" && !allowBootstrapData) {
    throw new Error(
      `Web build requires a reviewed snapshot, but ${snapshotPath} contains ${value.metadata.sourceStatus} data. Generate a reviewed snapshot or explicitly enable ALLOW_BOOTSTRAP_DATA for development.`,
    );
  }
  return value;
}

export async function loadBuildSnapshot(
  options: BuildSnapshotOptions = {},
): Promise<DatasetSnapshot> {
  const allowBootstrapData =
    options.allowBootstrapData ??
    parseBooleanFlag(process.env.ALLOW_BOOTSTRAP_DATA, "ALLOW_BOOTSTRAP_DATA");
  const snapshotPath = resolveSnapshotPath(
    options.snapshotPath ?? process.env.WEB_CLASS_SNAPSHOT_PATH ?? defaultSnapshotPath,
  );
  return readSnapshot(snapshotPath, allowBootstrapData);
}

export async function loadBuildServantSnapshot(id: string): Promise<DatasetSnapshot> {
  if (!/^[a-z0-9_-]+$/i.test(id)) throw new Error(`Invalid servant id ${id}`);
  const allowBootstrapData = parseBooleanFlag(
    process.env.ALLOW_BOOTSTRAP_DATA,
    "ALLOW_BOOTSTRAP_DATA",
  );
  const path = resolveSnapshotPath(`data/generated/latest/servants/${id}.json`);
  return readSnapshot(path, allowBootstrapData);
}
