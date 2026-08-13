import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "灵基决策站 · FGO 国服强度图鉴",
    short_name: "灵基决策站",
    description: "FGO 国服从者强度、筛选与账号决策工具",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f0e8",
    theme_color: "#17130f",
    lang: "zh-CN",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
