# 灵基决策站（FGO 国服强度图鉴）

面向 FGO 简中服的版本化强度榜、从者筛选和账号决策工具。项目采用一套领域模型、两个客户端壳和一个快照发布服务：

- **Web/PWA**：Next.js 静态导出，适合 COS + CDN、搜索引擎和分享链接。
- **Android/iOS**：React + Vite + Capacitor，内置离线数据并支持后续原生能力。
- **API**：Fastify，提供动态查询、用户数据和管理接口。
- **Worker**：摄取 Atlas CN 数据、执行国服官方实装门禁、编译人工审核榜单并发布不可变快照。
- **PostgreSQL**：保存标准化从者版本、榜单快照、审批记录和用户数据。

当前提交包含一个可运行的 **弓阶垂直切片**，用于验证职介、宝具类型、宝具色卡、自充、模式榜单以及 `Atlas -> 国服证据门禁 -> 快照` 数据链。

## 目录

```text
apps/
  web/        Next.js Web/PWA
  mobile/     Capacitor 移动端壳
  api/        Fastify API
  worker/     数据同步、规范化、实装门禁与快照编译
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
data/
  cn-release-evidence.json  国服实装事实 Owner
  fixtures/                 确定性测试输入
infra/            腾讯云、Nginx 与部署脚本
docs/             架构、数据链与部署说明
```

## 本地启动

要求 Node.js 24 LTS 与 pnpm 11。

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm data:prepare:fixture
pnpm snapshot:build
pnpm build
pnpm dev:web
pnpm dev:api
```

`data:prepare:fixture` 使用仓库内的弓阶 Atlas 结构化 Fixture，验证未取得国服官方证据的候选不会进入发布数据。生产候选链为：

```bash
pnpm data:sync:atlas
pnpm data:prepare
pnpm snapshot:build
```

详细事实归属和门禁规则见 [`docs/data-pipeline.md`](docs/data-pipeline.md)。

启动 PostgreSQL 与 API：

```bash
docker compose up -d postgres
pnpm data:prepare:fixture
pnpm snapshot:build
docker compose up -d api
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

## 数据可信链

```text
Atlas CN export
  -> objective candidate normalization
  -> version-controlled CN official release evidence
  -> reviewed servants
  -> human-reviewed ranking source
  -> immutable JSON/Brotli snapshot
```

关键约束：

- Atlas 中出现记录不代表国服已经实装。
- `collectionNo` 是跨来源主身份；名称不是第二套身份系统。
- 国服实装事实由 `data/cn-release-evidence.json` 单点拥有。
- 候选缺证据时进入 blocked report，不进入快照。
- 榜单 Tier 仍需人工审核，AI 不得直接发布。
- 当前实装门禁覆盖从者可用性；技能/宝具强化证据将在后续事实模型中独立扩展。

## 当前完成范围

- 国服数据合同与版本化快照模型
- 弓阶单体/全体、Q/A/B、自充、标签筛选
- 90++、高难、辅助榜数据结构
- Web/PWA 与移动端离线启动骨架
- Fastify 查询 API
- Atlas CN 原始数据摄取与最小契约解析
- Atlas 职介、稀有度、宝具色卡、目标范围和 Hit 数规范化
- 基于 `collectionNo` 的国服官方实装证据门禁
- 门禁 approved/blocked 报告
- Git 管理的榜单审核源文件
- PostgreSQL/Drizzle schema
- Docker Compose、TCR/CVM、COS/CDN 发布脚本
- CI：依赖锁定、类型检查、测试、构建、Fixture 数据链与快照产物

下一阶段应扩展全职介证据清单、技能/宝具强化事实证据、审核后台鉴权和真实 COS 发布凭据。
