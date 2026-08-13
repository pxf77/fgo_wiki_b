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

function validateRankingReferences(rankings: readonly RankingSnapshot[]): void {
  const servantIds = new Set(bootstrapServants.map((servant) => servant.id));
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

  validateRankingReferences(rankings);
  const datasetVersion = `${pointer.asOf}-r${pointer.revision}`;
  const publishedAt = process.env.PUBLISHED_AT ?? new Date().toISOString();
  const snapshot: DatasetSnapshot = {
    metadata: {
      region: "CN",
      datasetVersion,
      rankingRevision: pointer.revision,
      publishedAt,
      minimumAppVersion: "0.1.0",
      sourceStatus: "reviewed",
    },
    servants: bootstrapServants,
    rankings,
    changelog: [
      `发布国服数据快照 ${datasetVersion}。`,
      "弓阶垂直切片进入人工审核榜单源。",
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
