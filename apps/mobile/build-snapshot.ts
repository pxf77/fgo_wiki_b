import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import {
  assertDatasetSnapshot,
  bootstrapSnapshot,
  type DatasetMetadata,
  type DatasetSnapshot,
  type ServantClass,
} from "@fgo-wiki/domain";

const defaultSnapshotPath = "data/generated/latest/classes/archer.json";

export interface MobileBuildSnapshotOptions {
  snapshotPath?: string;
  repositoryRoot?: string;
  allowBootstrapData?: boolean;
}

export interface MobileBuildCatalog {
  metadata: DatasetMetadata;
  servants: Array<{ id: string; className: ServantClass }>;
}

export interface MobileBuildData {
  catalog: MobileBuildCatalog;
  classes: Map<ServantClass, DatasetSnapshot>;
}

function parseBooleanFlag(value: string | undefined, name: string): boolean {
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;
  throw new Error(`${name} must be true or false`);
}

function resolveSnapshotPath(path: string, repositoryRoot: string): string {
  return isAbsolute(path) ? path : resolve(repositoryRoot, path);
}

async function readReviewedSnapshot(path: string, allowBootstrapData: boolean): Promise<DatasetSnapshot> {
  let serialized: string;
  try {
    serialized = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      if (allowBootstrapData) return structuredClone(bootstrapSnapshot);
      throw new Error(`Mobile build snapshot not found at ${path}. Run pnpm snapshot:build before pnpm build.`);
    }
    throw error;
  }
  const value: unknown = JSON.parse(serialized);
  assertDatasetSnapshot(value);
  if (value.metadata.sourceStatus !== "reviewed" && !allowBootstrapData) {
    throw new Error(`Mobile build requires a reviewed snapshot, but ${path} contains ${value.metadata.sourceStatus} data.`);
  }
  return value;
}

export async function loadMobileBuildSnapshot(options: MobileBuildSnapshotOptions = {}): Promise<DatasetSnapshot> {
  const repositoryRoot = options.repositoryRoot ?? resolve(process.cwd(), "../..");
  const allowBootstrapData = options.allowBootstrapData ?? parseBooleanFlag(process.env.ALLOW_BOOTSTRAP_DATA, "ALLOW_BOOTSTRAP_DATA");
  const snapshotPath = resolveSnapshotPath(
    options.snapshotPath ?? process.env.MOBILE_CLASS_SNAPSHOT_PATH ?? process.env.SNAPSHOT_PATH ?? defaultSnapshotPath,
    repositoryRoot,
  );
  return readReviewedSnapshot(snapshotPath, allowBootstrapData);
}

export async function loadMobileBuildData(repositoryRoot = resolve(process.cwd(), "../..")): Promise<MobileBuildData> {
  const allowBootstrapData = parseBooleanFlag(process.env.ALLOW_BOOTSTRAP_DATA, "ALLOW_BOOTSTRAP_DATA");
  const catalogPath = resolve(repositoryRoot, "data/generated/latest/catalog.json");
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as MobileBuildCatalog;
  if (!Array.isArray(catalog.servants)) throw new TypeError("Mobile build catalog is invalid");
  const classNames = [...new Set(catalog.servants.map((servant) => servant.className))];
  const classes = new Map<ServantClass, DatasetSnapshot>();
  await Promise.all(
    classNames.map(async (className) => {
      const snapshot = await readReviewedSnapshot(
        resolve(repositoryRoot, `data/generated/latest/classes/${className}.json`),
        allowBootstrapData,
      );
      classes.set(className, snapshot);
    }),
  );
  return { catalog, classes };
}
