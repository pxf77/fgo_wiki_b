import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

const repositoryRoot = resolve(process.cwd(), "../..");
const snapshotPathValue =
  process.env.MOBILE_CLASS_SNAPSHOT_PATH ??
  "data/generated/latest/classes/archer.json";
const snapshotPath = isAbsolute(snapshotPathValue)
  ? snapshotPathValue
  : resolve(repositoryRoot, snapshotPathValue);
const embeddedPath = resolve(process.cwd(), "dist/data/initial-snapshot.json");

const source = JSON.parse(await readFile(snapshotPath, "utf8"));
const embedded = JSON.parse(await readFile(embeddedPath, "utf8"));
if (source?.metadata?.sourceStatus !== "reviewed") {
  throw new Error("Mobile artifact verification requires a reviewed class snapshot");
}
if (embedded?.metadata?.sourceStatus !== "reviewed") {
  throw new Error("Mobile initial data is not reviewed");
}
if (embedded.metadata.datasetVersion !== source.metadata.datasetVersion) {
  throw new Error(
    `Mobile initial data ${embedded.metadata.datasetVersion} does not match source ${source.metadata.datasetVersion}`,
  );
}

const sourceIds = source.servants
  .filter((servant) => servant.release.status === "released")
  .map((servant) => servant.id)
  .sort();
const embeddedIds = embedded.servants
  .filter((servant) => servant.release.status === "released")
  .map((servant) => servant.id)
  .sort();
if (JSON.stringify(sourceIds) !== JSON.stringify(embeddedIds)) {
  throw new Error("Mobile initial data servant set does not match the Archer class shard");
}

console.log(
  `Verified mobile initial data ${source.metadata.datasetVersion} with ${sourceIds.length} Archer servants`,
);
