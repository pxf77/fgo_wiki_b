import { readFile, readdir } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

const repositoryRoot = resolve(process.cwd(), "../..");
const snapshotPathValue =
  process.env.SNAPSHOT_PATH ?? "data/generated/latest/snapshot.json";
const snapshotPath = isAbsolute(snapshotPathValue)
  ? snapshotPathValue
  : resolve(repositoryRoot, snapshotPathValue);
const assetDirectory = resolve(process.cwd(), "dist/assets");

const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
if (snapshot?.metadata?.sourceStatus !== "reviewed") {
  throw new Error("Mobile artifact verification requires a reviewed snapshot");
}

const assetFiles = (await readdir(assetDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
  .map((entry) => resolve(assetDirectory, entry.name));
if (assetFiles.length === 0) {
  throw new Error(`No JavaScript bundle found in ${assetDirectory}`);
}

const bundle = (
  await Promise.all(assetFiles.map((path) => readFile(path, "utf8")))
).join("\n");
const datasetVersion = snapshot.metadata.datasetVersion;
if (!bundle.includes(datasetVersion)) {
  throw new Error(`Mobile bundle does not contain dataset ${datasetVersion}`);
}

const releasedServantIds = snapshot.servants
  .filter((servant) => servant.release.status === "released")
  .map((servant) => servant.id);
const missingServantIds = releasedServantIds.filter(
  (servantId) => !bundle.includes(servantId),
);
if (missingServantIds.length > 0) {
  throw new Error(
    `Mobile bundle is missing reviewed servants: ${missingServantIds.join(", ")}`,
  );
}

console.log(
  `Verified mobile bundle ${datasetVersion} with ${releasedServantIds.length} released servants`,
);
