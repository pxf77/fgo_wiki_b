import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(process.cwd(), "../..");
const sourceCatalogPath = resolve(repositoryRoot, "data/generated/latest/catalog.json");
const embeddedCatalogPath = resolve(process.cwd(), "dist/data/catalog.json");
const embeddedClassRoot = resolve(process.cwd(), "dist/data/classes");
const assetRoot = resolve(process.cwd(), "dist/assets");

const sourceCatalog = JSON.parse(await readFile(sourceCatalogPath, "utf8"));
const embeddedCatalog = JSON.parse(await readFile(embeddedCatalogPath, "utf8"));
if (sourceCatalog?.metadata?.sourceStatus !== "reviewed") {
  throw new Error("Mobile artifact verification requires a reviewed catalog");
}
if (embeddedCatalog?.metadata?.datasetVersion !== sourceCatalog.metadata.datasetVersion) {
  throw new Error("Mobile catalog does not match the generated dataset version");
}

const sourceIds = sourceCatalog.servants.map((servant) => servant.id).sort();
const embeddedIds = embeddedCatalog.servants.map((servant) => servant.id).sort();
if (JSON.stringify(sourceIds) !== JSON.stringify(embeddedIds)) {
  throw new Error("Mobile catalog servant set does not match generated catalog");
}

const classes = [...new Set(sourceCatalog.servants.map((servant) => servant.className))].sort();
let shardServantCount = 0;
for (const className of classes) {
  const shard = JSON.parse(await readFile(resolve(embeddedClassRoot, `${className}.json`), "utf8"));
  if (shard?.metadata?.datasetVersion !== sourceCatalog.metadata.datasetVersion) {
    throw new Error(`Mobile ${className} shard has a different dataset version`);
  }
  if (shard.servants.some((servant) => servant.className !== className)) {
    throw new Error(`Mobile ${className} shard contains another class`);
  }
  shardServantCount += shard.servants.length;
}
if (shardServantCount !== sourceIds.length) {
  throw new Error(`Mobile class shards contain ${shardServantCount} servants, expected ${sourceIds.length}`);
}

const assetFiles = (await readdir(assetRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
  .map((entry) => resolve(assetRoot, entry.name));
const bundle = (await Promise.all(assetFiles.map((path) => readFile(path, "utf8")))).join("\n");
if (bundle.includes(sourceCatalog.metadata.datasetVersion)) {
  throw new Error("Mobile JavaScript bundle still embeds the dataset version");
}
const sampleIds = sourceIds.slice(0, 5);
if (sampleIds.some((id) => bundle.includes(id))) {
  throw new Error("Mobile JavaScript bundle still embeds servant data");
}

console.log(
  `Verified mobile catalog ${sourceCatalog.metadata.datasetVersion}: ${classes.length} classes, ${sourceIds.length} servants, independent data files`,
);
