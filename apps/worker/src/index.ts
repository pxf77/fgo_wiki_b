import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSnapshot } from "./build-snapshot.js";
import { normalizeAtlasFile } from "./normalize-atlas.js";
import { writeCnReleaseGateFiles } from "./release-gate.js";
import { fetchAtlasCnServants } from "./sources/atlas.js";

const command = process.argv[2] ?? "snapshot";
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

function repositoryPath(value: string): string {
  return resolve(repositoryRoot, value);
}

const paths = {
  liveRaw: repositoryPath(
    process.env.ATLAS_RAW_PATH ?? "data/raw/atlas-cn/nice_servant.json",
  ),
  fixtureRaw: repositoryPath("data/fixtures/atlas-cn/nice_servant.archer-slice.json"),
  candidates: repositoryPath(
    process.env.ATLAS_CANDIDATE_PATH ?? "data/staged/atlas-cn/servant-candidates.json",
  ),
  normalizationReport: repositoryPath(
    process.env.ATLAS_NORMALIZATION_REPORT_PATH ?? "data/reports/atlas-normalization.json",
  ),
  releaseEvidence: repositoryPath(
    process.env.CN_RELEASE_EVIDENCE_PATH ?? "data/cn-release-evidence.json",
  ),
  reviewedServants: repositoryPath(
    process.env.REVIEWED_SERVANTS_PATH ?? "data/normalized/cn/servants.reviewed.json",
  ),
  releaseGateReport: repositoryPath(
    process.env.CN_RELEASE_GATE_REPORT_PATH ?? "data/reports/cn-release-gate.json",
  ),
};

async function prepareData(rawPath: string): Promise<void> {
  const normalization = await normalizeAtlasFile(
    rawPath,
    paths.candidates,
    paths.normalizationReport,
  );
  const releaseGate = await writeCnReleaseGateFiles(
    paths.candidates,
    paths.releaseEvidence,
    paths.reviewedServants,
    paths.releaseGateReport,
  );
  console.log(
    `Prepared ${releaseGate.approved.length} reviewed CN servants from ${normalization.acceptedCount} Atlas candidates; ${releaseGate.blocked.length} candidates remain blocked`,
  );
}

if (command === "snapshot") {
  const directory = await buildSnapshot();
  console.log(`Snapshot written to ${directory}`);
} else if (command === "sync-atlas") {
  const url =
    process.env.ATLAS_CN_SERVANTS_URL ??
    "https://api.atlasacademy.io/export/CN/nice_servant.json";
  await fetchAtlasCnServants(url, paths.liveRaw);
  console.log(`Atlas CN raw data written to ${paths.liveRaw}`);
} else if (command === "prepare-live") {
  await prepareData(paths.liveRaw);
} else if (command === "prepare-fixture") {
  await prepareData(paths.fixtureRaw);
} else if (command === "normalize-atlas") {
  const report = await normalizeAtlasFile(
    paths.liveRaw,
    paths.candidates,
    paths.normalizationReport,
  );
  console.log(`Normalized ${report.acceptedCount}/${report.inputCount} Atlas servants`);
} else if (command === "gate-cn") {
  const report = await writeCnReleaseGateFiles(
    paths.candidates,
    paths.releaseEvidence,
    paths.reviewedServants,
    paths.releaseGateReport,
  );
  console.log(`CN release gate approved ${report.approved.length} servants`);
} else {
  throw new Error(`Unknown worker command: ${command}`);
}
