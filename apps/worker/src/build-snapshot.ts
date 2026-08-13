import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { brotliCompress } from "node:zlib";
import {
  assertDatasetSnapshot,
  bootstrapServants,
  type DatasetSnapshot,
  type RankingSnapshot,
  type Servant,
} from "@fgo-wiki/domain";

const compress = promisify(brotliCompress);
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

interface LatestRankingPointer {
  asOf: string;
  revision: number;
  directory: string;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, serialized, "utf8");
  await writeFile(`${path}.br`, await compress(Buffer.from(serialized)));
}

function resolveRepositoryPath(path: string): string {
  return resolve(repositoryRoot, path);
}

async function loadServants(): Promise<{
  servants: Servant[];
  sourceStatus: DatasetSnapshot["metadata"]["sourceStatus"];
}> {
  const reviewedPath = resolveRepositoryPath(
    process.env.REVIEWED_SERVANTS_PATH ?? "data/normalized/cn/servants.reviewed.json",
  );
  try {
    const value: unknown = await readJson(reviewedPath);
    if (!Array.isArray(value)) {
      throw new TypeError("Reviewed CN servants must be an array");
    }
    return {
      servants: value as Servant[],
      sourceStatus: "reviewed",
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw error;
    }
    if (process.env.ALLOW_BOOTSTRAP_DATA !== "true") {
      throw new Error(
        `Reviewed CN servants not found at ${reviewedPath}. Run pnpm data:prepare:fixture for local verification or pnpm data:prepare after syncing Atlas.`,
      );
    }
    return {
      servants: bootstrapServants,
      sourceStatus: "bootstrap",
    };
  }
}

function validateRankingReferences(
  rankings: readonly RankingSnapshot[],
  servants: readonly Servant[],
): void {
  const servantIds = new Set(servants.map((servant) => servant.id));
  for (const ranking of rankings) {
    for (const entry of ranking.entries) {
      if (!servantIds.has(entry.servantId)) {
        throw new Error(`Ranking ${ranking.id} references unknown servant ${entry.servantId}`);
      }
    }
  }
}

export async function buildSnapshot(): Promise<string> {
  const rankingRoot = resolveRepositoryPath(process.env.RANKINGS_ROOT ?? "rankings/cn");
  const outputRoot = resolveRepositoryPath(process.env.SNAPSHOT_OUTPUT_DIR ?? "data/generated");
  const pointer = await readJson<LatestRankingPointer>(join(rankingRoot, "latest.json"));
  const rankingDirectory = join(rankingRoot, pointer.directory);
  const rankingFiles = ["farming-90pp.json", "high-difficulty.json", "support.json"];
  const rankings = await Promise.all(
    rankingFiles.map((file) => readJson<RankingSnapshot>(join(rankingDirectory, file))),
  );
  const { servants, sourceStatus } = await loadServants();

  validateRankingReferences(rankings, servants);
  const datasetVersion = `${pointer.asOf}-r${pointer.revision}`;
  const publishedAt = process.env.PUBLISHED_AT ?? new Date().toISOString();
  const snapshot: DatasetSnapshot = {
    metadata: {
      region: "CN",
      datasetVersion,
      rankingRevision: pointer.revision,
      publishedAt,
      minimumAppVersion: "0.1.0",
      sourceStatus,
    },
    servants,
    rankings,
    changelog: [
      `发布国服数据快照 ${datasetVersion}。`,
      sourceStatus === "reviewed"
        ? "从者实装状态已通过版本化国服官方证据门禁。"
        : "当前快照使用开发用 Bootstrap 数据。",
    ],
  };
  assertDatasetSnapshot(snapshot);

  const versionDirectory = join(outputRoot, datasetVersion);
  await writeJson(join(versionDirectory, "metadata.json"), snapshot.metadata);
  await writeJson(join(versionDirectory, "servants.json"), snapshot.servants);
  await writeJson(join(versionDirectory, "snapshot.json"), snapshot);
  for (const ranking of rankings) {
    await writeJson(join(versionDirectory, "rankings", `${ranking.mode}.json`), ranking);
  }

  const publicBaseUrl = (process.env.SNAPSHOT_PUBLIC_BASE_URL ?? "/snapshots").replace(/\/$/, "");
  const releasePointer = {
    datasetVersion,
    snapshotUrl: `${publicBaseUrl}/${datasetVersion}/snapshot.json`,
    minimumAppVersion: snapshot.metadata.minimumAppVersion,
    publishedAt,
  };
  await writeJson(join(outputRoot, "latest.json"), releasePointer);
  await writeJson(join(outputRoot, "latest", "snapshot.json"), snapshot);

  return versionDirectory;
}
