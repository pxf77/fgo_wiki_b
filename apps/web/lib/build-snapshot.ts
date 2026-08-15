import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import {
  assertDatasetSnapshot,
  bootstrapSnapshot,
  servantClasses,
  type DatasetMetadata,
  type DatasetSnapshot,
  type ServantClass,
} from "@fgo-wiki/domain";

const repositoryRoot = resolve(process.cwd(), "../..");
const defaultSnapshotPath = "data/generated/latest/classes/archer.json";

export interface BuildSnapshotOptions {
  snapshotPath?: string;
  allowBootstrapData?: boolean;
}

export interface BuildCatalog {
  metadata: DatasetMetadata;
  servants: Array<{
    id: string;
    name: string;
    className: ServantClass;
    rarity: number;
    releaseStatus: string;
  }>;
}

function parseBooleanFlag(value: string | undefined, name: string): boolean {
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;
  throw new Error(`${name} must be true or false`);
}

function resolveSnapshotPath(path: string): string {
  return isAbsolute(path) ? path : resolve(repositoryRoot, path);
}

async function readSnapshot(snapshotPath: string, allowBootstrapData: boolean): Promise<DatasetSnapshot> {
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
    throw new Error(`Web build requires a reviewed snapshot, but ${snapshotPath} contains ${value.metadata.sourceStatus} data.`);
  }
  return value;
}

export async function loadBuildCatalog(): Promise<BuildCatalog> {
  const path = resolveSnapshotPath("data/generated/latest/catalog.json");
  const value = JSON.parse(await readFile(path, "utf8")) as BuildCatalog;
  if (!value || typeof value !== "object" || !Array.isArray(value.servants)) {
    throw new TypeError("Web build catalog is invalid");
  }
  return value;
}

export async function loadBuildClassSnapshot(className: ServantClass): Promise<DatasetSnapshot> {
  if (!servantClasses.includes(className)) throw new Error(`Invalid servant class ${className}`);
  const allowBootstrapData = parseBooleanFlag(process.env.ALLOW_BOOTSTRAP_DATA, "ALLOW_BOOTSTRAP_DATA");
  return readSnapshot(
    resolveSnapshotPath(`data/generated/latest/classes/${className}.json`),
    allowBootstrapData,
  );
}

export async function loadBuildSnapshot(options: BuildSnapshotOptions = {}): Promise<DatasetSnapshot> {
  const allowBootstrapData =
    options.allowBootstrapData ?? parseBooleanFlag(process.env.ALLOW_BOOTSTRAP_DATA, "ALLOW_BOOTSTRAP_DATA");
  const snapshotPath = resolveSnapshotPath(
    options.snapshotPath ?? process.env.WEB_CLASS_SNAPSHOT_PATH ?? defaultSnapshotPath,
  );
  return readSnapshot(snapshotPath, allowBootstrapData);
}

export async function loadBuildServantSnapshot(id: string): Promise<DatasetSnapshot> {
  if (!/^[a-z0-9_-]+$/i.test(id)) throw new Error(`Invalid servant id ${id}`);
  const allowBootstrapData = parseBooleanFlag(process.env.ALLOW_BOOTSTRAP_DATA, "ALLOW_BOOTSTRAP_DATA");
  return readSnapshot(
    resolveSnapshotPath(`data/generated/latest/servants/${id}.json`),
    allowBootstrapData,
  );
}
