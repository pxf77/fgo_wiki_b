import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { loadMobileBuildSnapshot } from "./build-snapshot";

export default defineConfig(async () => {
  const snapshot = await loadMobileBuildSnapshot();
  const initialDataPlugin: Plugin = {
    name: "fgo-wiki-initial-data",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "data/initial-snapshot.json",
        source: `${JSON.stringify(snapshot)}\n`,
      });
    },
  };
  return {
    plugins: [react(), initialDataPlugin],
    build: {
      outDir: "dist",
    },
  };
});
