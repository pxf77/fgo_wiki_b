import { resolve } from "node:path";
import { buildSnapshot } from "./build-snapshot.js";
import { fetchAtlasCnServants } from "./sources/atlas.js";

const command = process.argv[2] ?? "snapshot";

if (command === "snapshot") {
  const directory = await buildSnapshot();
  console.log(`Snapshot written to ${directory}`);
} else if (command === "sync-atlas") {
  const url = process.env.ATLAS_CN_SERVANTS_URL;
  if (!url) {
    throw new Error("ATLAS_CN_SERVANTS_URL is required");
  }
  const destination = resolve("data/raw/atlas-cn/nice_servant.json");
  await fetchAtlasCnServants(url, destination);
  console.log(`Atlas CN raw data written to ${destination}`);
} else {
  throw new Error(`Unknown worker command: ${command}`);
}
