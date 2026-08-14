import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ServiceWorkerRegister } from "../components/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "灵基决策站 · FGO 国服强度图鉴",
  description: "按职介、宝具类型、色卡、充能和使用模式筛选 FGO 国服从者强度榜。",
  applicationName: "灵基决策站",
};

export const viewport: Viewport = {
  themeColor: "#17130f",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
