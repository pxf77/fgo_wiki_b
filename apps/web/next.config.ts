import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    "@fgo-wiki/domain",
    "@fgo-wiki/filter-engine",
    "@fgo-wiki/ranking-engine",
    "@fgo-wiki/shared-ui",
  ],
};

export default nextConfig;
