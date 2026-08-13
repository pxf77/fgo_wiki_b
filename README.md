# 灵基决策站（FGO 国服强度图鉴）

面向 FGO 简中服的版本化强度榜、从者筛选和账号决策工具。项目采用一套领域模型、两个客户端壳和一个快照发布服务：

- **Web/PWA**：Next.js 静态导出，适合 COS + CDN、搜索引擎和分享链接。
- **Android/iOS**：React + Vite + Capacitor，内置离线数据并支持后续原生能力。
- **API**：Fastify，提供动态查询、用户数据和管理接口。
- **Worker**：摄取 Atlas CN 数据、编译人工审核榜单并发布不可变快照。
- **PostgreSQL**：保存标准化从者版本、榜单快照、审批记录和用户数据。

当前提交包含一个可运行的 **弓阶垂直切片**，用于验证职介、宝具类型、宝具色卡、自充和模式榜单筛选。

## 目录

```text
apps/
  web/        Next.js Web/PWA
  mobile/     Capacitor 移动端壳
  api/        Fastify API
  worker/     数据同步与快照编译
  admin/      榜单审核后台原型
packages/
  domain/         领域模型与启动数据
  filter-engine/  多维筛选
  ranking-engine/ 榜单读取、排序与维度评分
  damage-engine/  确定性宝具伤害估算内核
  api-client/     HTTP 客户端
  snapshot-client/浏览器/移动端快照缓存
  shared-ui/      Web 与移动端共享组件
  database/       Drizzle/PostgreSQL schema
rankings/cn/      人工审核的国服榜单源文件
infra/            腾讯云、Nginx 与部署脚本
docs/             架构与部署说明
```

## 本地启动

要求 Node.js 24 LTS 与 pnpm 11。

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm build
pnpm dev:web
pnpm dev:api
```

默认数据源是仓库内置的弓阶启动快照。生成版本化快照：

```bash
pnpm snapshot:build
```

启动 PostgreSQL 与 API：

```bash
docker compose up -d postgres api
```

移动端：

```bash
pnpm --filter @fgo-wiki/mobile build
pnpm --filter @fgo-wiki/mobile cap:add:android
pnpm --filter @fgo-wiki/mobile cap:sync
```

## 腾讯云部署

首版推荐：

```text
Next.js 静态产物 -> COS -> CDN/EdgeOne
Fastify + Worker    -> CVM/Lighthouse + Docker Compose
PostgreSQL          -> TencentDB for PostgreSQL（同 VPC 内网）
镜像                -> TCR
日志                -> CLS
```

完整步骤见 [`docs/tencent-cloud-deployment.md`](docs/tencent-cloud-deployment.md)。

## 当前完成范围

- 国服数据合同与版本化快照模型
- 弓阶单体/全体、Q/A/B、自充、标签筛选
- 90++、高难、辅助榜数据结构
- Web/PWA 与移动端离线启动骨架
- Fastify 查询 API
- Atlas CN 原始数据摄取入口
- Git 管理的榜单审核源文件
- PostgreSQL/Drizzle schema
- Docker Compose、TCR/CVM、COS/CDN 发布脚本
- CI：格式、类型、测试、构建

下一阶段应接入国服官方公告门禁、Atlas 字段映射、审核鉴权和真实 COS 发布凭据。
