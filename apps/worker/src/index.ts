import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  writeCnClassCatalogFile,
  type CnClassCatalogReport,
} from "./class-catalog.js";
import { buildSnapshot } from "./build-snapshot.js";
import {
  normalizeAtlasFile,
  type AtlasNormalizationReport,
  type AtlasServantCandidate,
} from "./normalize-atlas.js";
import { writeCnPublicationGateFiles } from "./publication-gate.js";
import { fetchAtlasCnServants } from "./sources/atlas.js";
import { writeCnStrengtheningGateFiles } from "./strengthening-gate.js";

const command = process.argv[2] ?? "snapshot";
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const repositoryPath = (value: string) => resolve(repositoryRoot, value);
const paths = {
  liveRaw: repositoryPath(
    process.env.ATLAS_RAW_PATH ?? "data/raw/atlas-cn/nice_servant.json",
  ),
  atlasSourceMetadata: repositoryPath(
    process.env.ATLAS_SOURCE_METADATA_PATH ??
      "data/reports/atlas-source.json",
  ),
  archerFixture: repositoryPath(
    "data/fixtures/atlas-cn/servant-candidates.archer.json",
  ),
  otherClassFixture: repositoryPath(
    "data/fixtures/atlas-cn/servant-candidates.non-archer-smoke.json",
  ),
  candidates: repositoryPath(
    process.env.ATLAS_CANDIDATE_PATH ??
      "data/staged/atlas-cn/servant-candidates.json",
  ),
  normalizationReport: repositoryPath(
    process.env.ATLAS_NORMALIZATION_REPORT_PATH ??
      "data/reports/atlas-normalization.json",
  ),
  classCatalogReport: repositoryPath(
    process.env.CN_CLASS_CATALOG_REPORT_PATH ??
      "data/reports/cn-class-catalog.json",
  ),
  productPolicy: repositoryPath(
    process.env.CN_PRODUCT_POLICY_PATH ?? "data/cn-product-policy.json",
  ),
  releaseEvidence: repositoryPath(
    process.env.CN_RELEASE_EVIDENCE_PATH ??
      "data/cn-release-evidence.json",
  ),
  releaseReviewedServants: repositoryPath(
    process.env.RELEASE_REVIEWED_SERVANTS_PATH ??
      "data/normalized/cn/servants.release-reviewed.json",
  ),
  releaseGateReport: repositoryPath(
    process.env.CN_RELEASE_GATE_REPORT_PATH ??
      "data/reports/cn-release-gate.json",
  ),
  strengtheningEvidence: repositoryPath(
    process.env.CN_STRENGTHENING_EVIDENCE_PATH ??
      "data/cn-strengthening-evidence.json",
  ),
  reviewedServants: repositoryPath(
    process.env.REVIEWED_SERVANTS_PATH ??
      "data/normalized/cn/servants.reviewed.json",
  ),
  strengtheningGateReport: repositoryPath(
    process.env.CN_STRENGTHENING_GATE_REPORT_PATH ??
      "data/reports/cn-strengthening-gate.json",
  ),
};

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readCandidateArray(
  path: string,
): Promise<AtlasServantCandidate[]> {
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(value)) {
    throw new TypeError(`Candidate fixture must be an array: ${path}`);
  }
  return value as AtlasServantCandidate[];
}

async function buildClassCatalog(): Promise<CnClassCatalogReport> {
  return writeCnClassCatalogFile(
    paths.candidates,
    paths.releaseEvidence,
    paths.releaseGateReport,
    paths.strengtheningEvidence,
    paths.classCatalogReport,
  );
}

function catalogSummary(catalog: CnClassCatalogReport): string {
  const published = catalog.classes.reduce(
    (total, entry) => total + entry.passedReleases,
    0,
  );
  const candidates = catalog.classes.reduce(
    (total, entry) => total + entry.atlasCandidates,
    0,
  );
  return `${published}/${candidates} servants across ${catalog.classes.length} classes`;
}

async function applyPreparedCandidates(
  normalization: AtlasNormalizationReport,
): Promise<void> {
  const releaseGate = await writeCnPublicationGateFiles(
    paths.candidates,
    paths.releaseEvidence,
    paths.productPolicy,
    paths.releaseReviewedServants,
    paths.releaseGateReport,
  );
  const strengtheningGate = await writeCnStrengtheningGateFiles(
    paths.releaseReviewedServants,
    paths.strengtheningEvidence,
    paths.reviewedServants,
    paths.strengtheningGateReport,
  );
  const catalog = await buildClassCatalog();
  console.log(
    `Prepared ${releaseGate.passed.length} CN servants and ` +
      `${strengtheningGate.applied.length} dated strengthening events from ` +
      `${normalization.acceptedCount} Atlas candidates; ` +
      `${releaseGate.blocked.length} candidates remain blocked; ` +
      catalogSummary(catalog),
  );
}

async function prepareData(rawPath: string): Promise<void> {
  const normalization = await normalizeAtlasFile(
    rawPath,
    paths.candidates,
    paths.normalizationReport,
  );
  await applyPreparedCandidates(normalization);
}

async function prepareCandidateFixture(): Promise<void> {
  const [archers, otherClasses] = await Promise.all([
    readCandidateArray(paths.archerFixture),
    readCandidateArray(paths.otherClassFixture),
  ]);
  const candidates = [...archers, ...otherClasses].sort(
    (left, right) => left.collectionNo - right.collectionNo,
  );
  await writeJson(paths.candidates, candidates);
  const normalization: AtlasNormalizationReport = {
    inputCount: candidates.length,
    acceptedCount: candidates.length,
    skipped: [],
    warnings: [],
  };
  await writeJson(paths.normalizationReport, normalization);
  await writeJson(paths.atlasSourceMetadata, {
    schemaVersion: 1,
    region: "CN",
    revision: "fixture-all-classes-v1",
    upstreamHash: "fixture-all-classes-v1",
    upstreamTimestamp: 1,
    fetchedAt: "2026-08-15T00:00:00.000Z",
    servantsUrl: "https://fixtures.invalid/atlas-cn/nice_servant.json",
    infoUrl: "https://fixtures.invalid/atlas-cn/info",
  });
  await applyPreparedCandidates(normalization);
}

if (command === "snapshot") {
  const directory = await buildSnapshot();
  console.log(`Snapshot written to ${directory}`);
} else if (command === "sync-atlas") {
  const servantsUrl =
    process.env.ATLAS_CN_SERVANTS_URL ??
    "https://api.atlasacademy.io/export/CN/nice_servant.json";
  const infoUrl =
    process.env.ATLAS_INFO_URL ?? "https://api.atlasacademy.io/info";
  const metadata = await fetchAtlasCnServants({
    servantsUrl,
    destination: paths.liveRaw,
    infoUrl,
    metadataDestination: paths.atlasSourceMetadata,
  });
  console.log(
    `Atlas CN raw data written to ${paths.liveRaw} at ${metadata.revision}`,
  );
} else if (command === "prepare-live") {
  await prepareData(paths.liveRaw);
} else if (command === "prepare-fixture") {
  await prepareCandidateFixture();
} else if (command === "normalize-atlas") {
  const report = await normalizeAtlasFile(
    paths.liveRaw,
    paths.candidates,
    paths.normalizationReport,
  );
  console.log(
    `Normalized ${report.acceptedCount}/${report.inputCount} Atlas servants`,
  );
} else if (command === "gate-cn") {
  const releaseReport = await writeCnPublicationGateFiles(
    paths.candidates,
    paths.releaseEvidence,
    paths.productPolicy,
    paths.releaseReviewedServants,
    paths.releaseGateReport,
  );
  const strengtheningReport = await writeCnStrengtheningGateFiles(
    paths.releaseReviewedServants,
    paths.strengtheningEvidence,
    paths.reviewedServants,
    paths.strengtheningGateReport,
  );
  const catalog = await buildClassCatalog();
  console.log(
    `CN gates passed ${releaseReport.passed.length} servants and applied ` +
      `${strengtheningReport.applied.length} dated strengthening events; ` +
      catalogSummary(catalog),
  );
} else if (command === "class-catalog") {
  const catalog = await buildClassCatalog();
  console.log(
    `CN class catalog written to ${paths.classCatalogReport}; ` +
      catalogSummary(catalog),
  );
} else {
  throw new Error(`Unknown worker command: ${command}`);
}
