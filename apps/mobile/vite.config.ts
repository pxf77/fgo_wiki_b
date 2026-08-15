import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { loadMobileBuildData } from "./build-snapshot";

export default defineConfig(async () => {
  const data = await loadMobileBuildData();
  const initialDataPlugin: Plugin = {
    name: "fgo-wiki-initial-data",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "data/catalog.json",
        source: `${JSON.stringify(data.catalog)}\n`,
      });
      for (const [className, snapshot] of data.classes) {
        this.emitFile({
          type: "asset",
          fileName: `data/classes/${className}.json`,
          source: `${JSON.stringify(snapshot)}\n`,
        });
      }
    },
  };
  return {
    plugins: [react(), initialDataPlugin],
    build: { outDir: "dist" },
  };
});
