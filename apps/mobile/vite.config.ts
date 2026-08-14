import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadMobileBuildSnapshot } from "./build-snapshot";

export default defineConfig(async () => {
  const snapshot = await loadMobileBuildSnapshot();
  return {
    plugins: [react()],
    define: {
      __FGO_WIKI_EMBEDDED_SNAPSHOT__: JSON.stringify(snapshot),
    },
    build: {
      outDir: "dist",
    },
  };
});
