import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { brotliCompress } from "node:zlib";
import {
  assertDatasetSnapshot,
  assertSourceVersionToken,
  bootstrapServants,
  createDatasetVersion,
  type DatasetSnapshot,
  type DatasetSourceVersions,
  type RankingSnapshot,
  type Servant,
} from "@fgo-wiki/domain";
import { buildCompleteRankings } from "./computed-rankings.js";
import { asRecord, requireString } from "./json-validation.js";
import { rankingSourceFiles } from "./ranking-source.js";

const compress = promisify(brotliCompress);
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

interface LatestRankingPointer {
  asOf: string;
  revision: number;
  directory: string;
}

export interface BuildSnapshotOptions {
  rankingRoot?: string;
  outputRoot?: string;
  reviewedServantsPath?: string;
  releaseGateReportPath?: string;
  strengtheningGateReportPath?: string;
  publicBaseUrl?: string;
  publishedAt?: string;
  allowBootstrapData?: boolean;
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

function configuredPath(
  explicitValue: string | undefined,
  environmentValue: string | undefined,
  fallback: string,
): string {
  return resolveRepositoryPath(explicitValue ?? environmentValue ?? fallback);
}

async function loadServants(options: BuildSnapshotOptions): Promise<{
  servants: Servant[];
  sourceStatus: DatasetSnapshot["metadata"]["sourceStatus"];
}> {
  const reviewedPath = configuredPath(
    options.reviewedServantsPath,
    process.env.REVIEWED_SERVANTS_PATH,
    "data/normalized/cn/servants.reviewed.json",
  );
  try {
    const value: unknown = await readJson(reviewedPath);
    if (!Array.isArray(value)) throw new TypeError("Reviewed CN servants must be an array");
    return { servants: value as Servant[], sourceStatus: "reviewed" };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
    const allowBootstrapData =
      options.allowBootstrapData ?? process.env.ALLOW_BOOTSTRAP_DATA === "true";
    if (!allowBootstrapData) {
      throw new Error(
        `Reviewed CN servants not found at ${reviewedPath}. Run pnpm data:prepare:fixture for local verification or pnpm data:prepare after syncing Atlas.`,
      );
    }
    return { servants: bootstrapServants, sourceStatus: "bootstrap" };
  }
}

function readEvidenceVersion(value: unknown, context: string): string {
  const version = requireString(asRecord(value, context), "evidenceVersion", context);
  assertSourceVersionToken(version, `${context}.evidenceVersion`);
  return version;
}

async function loadSourceVersions(
  sourceStatus: DatasetSnapshot["metadata"]["sourceStatus"],
  options: BuildSnapshotOptions,
): Promise<DatasetSourceVersions | undefined> {
  if (sourceStatus === "bootstrap") return undefined;
  const releaseGateReportPath = configuredPath(
    options.releaseGateReportPath,
    process.env.CN_RELEASE_GATE_REPORT_PATH,
    "data/reports/cn-release-gate.json",
  );
  const strengtheningGateReportPath = configuredPath(
    options.strengtheningGateReportPath,
    process.env.CN_STRENGTHENING_GATE_REPORT_PATH,
    "data/reports/cn-strengthening-gate.json",
  );
  const [releaseReport, strengtheningReport] = await Promise.all([
    readJson<unknown>(releaseGateReportPath),
    readJson<unknown>(strengtheningGateReportPath),
  ]);
  return {
    releaseEvidence: readEvidenceVersion(releaseReport, "CN release gate report"),
    strengtheningEvidence: readEvidenceVersion(
      strengtheningReport,
      "CN strengthening gate report",
    ),
  };
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

function subsetSnapshot(snapshot: DatasetSnapshot, servantIds: Set<string>): DatasetSnapshot {
  return {
    metadata: { ...snapshot.metadata, ...(snapshot.metadata.sourceVersions ? { sourceVersions: { ...snapshot.metadata.sourceVersions } } : {}) },
    servants: snapshot.servants.filter((servant) => servantIds.has(servant.id)),
    rankings: snapshot.rankings.map((ranking) => ({
      ...ranking,
      assumptions: { ...ranking.assumptions },
      entries: ranking.entries.filter((entry) => servantIds.has(entry.servantId)),
    })),
    changelog: [...snapshot.changelog],
  };
}

function catalogDocument(snapshot: DatasetSnapshot) {
  return {
    metadata: snapshot.metadata,
    servants: snapshot.servants.map((servant) => ({
      id: servant.id,
      name: servant.name,
      className: servant.className,
      rarity: servant.rarity,
      releaseStatus: servant.release.status,
      source: servant.release.source ?? "curated",
      charge: servant.charge,
      noblePhantasms: servant.noblePhantasms.map((np) => ({
        id: np.id,
        name: np.name,
        color: np.color,
        scope: np.scope,
        strengthened: np.strengthened,
      })),
    })),
  };
}

async function writeSnapshotDocuments(root: string, snapshot: DatasetSnapshot): Promise<void> {
  await writeJson(join(root, "metadata.json"), snapshot.metadata);
  await writeJson(join(root, "servants.json"), snapshot.servants);
  await writeJson(join(root, "snapshot.json"), snapshot);
  await writeJson(join(root, "catalog.json"), catalogDocument(snapshot));

  for (const ranking of snapshot.rankings) {
    await writeJson(join(root, "rankings", `${ranking.mode}.json`), ranking);
  }

  const classes = new Set(snapshot.servants.map((servant) => servant.className));
  for (const className of classes) {
    const ids = new Set(
      snapshot.servants
        .filter((servant) => servant.className === className)
        .map((servant) => servant.id),
    );
    await writeJson(join(root, "classes", `${className}.json`), subsetSnapshot(snapshot, ids));
  }

  for (const servant of snapshot.servants) {
    await writeJson(
      join(root, "servants", `${servant.id}.json`),
      subsetSnapshot(snapshot, new Set([servant.id])),
    );
  }
}

export async function buildSnapshot(options: BuildSnapshotOptions = {}): Promise<string> {
  const rankingRoot = configuredPath(
    options.rankingRoot,
    process.env.RANKINGS_ROOT,
    "rankings/cn",
  );
  const outputRoot = configuredPath(
    options.outputRoot,
    process.env.SNAPSHOT_OUTPUT_DIR,
    "data/generated",
  );
  const pointer = await readJson<LatestRankingPointer>(join(rankingRoot, "latest.json"));
  const rankingDirectory = join(rankingRoot, pointer.directory);
  const editorialRankings = await Promise.all(
    rankingSourceFiles.map((file) =>
      readJson<RankingSnapshot>(join(rankingDirectory, file)),
    ),
  );
  const { servants, sourceStatus } = await loadServants(options);
  const sourceVersions = await loadSourceVersions(sourceStatus, options);
  const rankings = buildCompleteRankings(
    servants,
    editorialRankings,
    pointer.asOf,
    pointer.revision,
  );

  validateRankingReferences(rankings, servants);
  const datasetVersion = createDatasetVersion({
    rankingAsOf: pointer.asOf,
    rankingRevision: pointer.revision,
    sourceStatus,
    ...(sourceVersions ? { sourceVersions } : {}),
  });
  const publishedAt =
    options.publishedAt ?? process.env.PUBLISHED_AT ?? new Date().toISOString();
  const snapshot: DatasetSnapshot = {
    metadata: {
      region: "CN",
      datasetVersion,
      rankingRevision: pointer.revision,
      publishedAt,
      minimumAppVersion: "0.1.0",
      sourceStatus,
      ...(sourceVersions ? { sourceVersions } : {}),
    },
    servants,
    rankings,
    changelog: [
      `发布国服数据快照 ${datasetVersion}。`,
      sourceStatus === "reviewed"
        ? "Atlas CN 当前区域事实与人工覆盖项已合并。"
        : "当前快照使用开发用 Bootstrap 数据。",
      "输出首页目录、职介分片与从者详情分片；完整 Snapshot 保留用于 API 兼容。",
      "90++/高难榜以规则评分补齐未人工评级从者，NP1/NP5 数据榜全部由确定性数据生成。",
    ],
  };
  assertDatasetSnapshot(snapshot);

  const versionDirectory = join(outputRoot, datasetVersion);
  await writeSnapshotDocuments(versionDirectory, snapshot);

  const publicBaseUrl = (
    options.publicBaseUrl ??
    process.env.SNAPSHOT_PUBLIC_BASE_URL ??
    "/snapshots"
  ).replace(/\/$/, "");
  const releaseDescriptor = {
    datasetVersion,
    snapshotUrl: `${publicBaseUrl}/${datasetVersion}/snapshot.json`,
    minimumAppVersion: snapshot.metadata.minimumAppVersion,
    publishedAt,
    sourceStatus,
    ...(sourceVersions ? { sourceVersions } : {}),
  };
  await writeJson(join(versionDirectory, "release.json"), releaseDescriptor);
  await writeJson(join(outputRoot, "latest.json"), releaseDescriptor);
  await writeSnapshotDocuments(join(outputRoot, "latest"), snapshot);

  return versionDirectory;
}
