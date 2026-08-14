import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import {
  assertDatasetSnapshot,
  bootstrapSnapshot,
  type DatasetSnapshot,
} from "@fgo-wiki/domain";

const defaultSnapshotPath = "data/generated/latest/snapshot.json";

export interface MobileBuildSnapshotOptions {
  snapshotPath?: string;
  repositoryRoot?: string;
  allowBootstrapData?: boolean;
}

function parseBooleanFlag(value: string | undefined, name: string): boolean {
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;
  throw new Error(`${name} must be true or false`);
}

function resolveSnapshotPath(path: string, repositoryRoot: string): string {
  return isAbsolute(path) ? path : resolve(repositoryRoot, path);
}

export async function loadMobileBuildSnapshot(
  options: MobileBuildSnapshotOptions = {},
): Promise<DatasetSnapshot> {
  const repositoryRoot =
    options.repositoryRoot ?? resolve(process.cwd(), "../..");
  const allowBootstrapData =
    options.allowBootstrapData ??
    parseBooleanFlag(process.env.ALLOW_BOOTSTRAP_DATA, "ALLOW_BOOTSTRAP_DATA");
  const snapshotPath = resolveSnapshotPath(
    options.snapshotPath ?? process.env.SNAPSHOT_PATH ?? defaultSnapshotPath,
    repositoryRoot,
  );

  let serialized: string;
  try {
    serialized = await readFile(snapshotPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      if (allowBootstrapData) {
        return structuredClone(bootstrapSnapshot);
      }
      throw new Error(
        `Mobile build snapshot not found at ${snapshotPath}. Run pnpm snapshot:build before pnpm build. Set ALLOW_BOOTSTRAP_DATA=true only for an explicit development fallback.`,
      );
    }
    throw error;
  }

  const value: unknown = JSON.parse(serialized);
  assertDatasetSnapshot(value);
  if (value.metadata.sourceStatus !== "reviewed" && !allowBootstrapData) {
    throw new Error(
      `Mobile build requires a reviewed snapshot, but ${snapshotPath} contains ${value.metadata.sourceStatus} data. Generate a reviewed snapshot or explicitly enable ALLOW_BOOTSTRAP_DATA for development.`,
    );
  }
  return value;
}
