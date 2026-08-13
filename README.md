# 灵基决策站（FGO 国服强度图鉴）

面向 FGO 简中服的版本化强度榜、从者筛选和账号决策工具。项目采用一套领域模型、两个客户端壳和一个快照发布服务：

- **Web/PWA**：Next.js 静态导出，适合 COS + CDN、搜索引擎和分享链接。
- **Android/iOS**：React + Vite + Capacitor，内置离线数据并支持后续原生能力。
- **API**：Fastify，提供动态查询、用户数据和管理接口。
- **Worker**：摄取 Atlas CN 数据、执行国服实装/强化证据门禁、编译人工审核榜单并发布不可变快照。
- **PostgreSQL**：保存标准化从者版本、榜单快照、审批记录和用户数据。

当前提交包含一个可运行的 **弓阶垂直切片**，用于验证职介、宝具类型、宝具色卡、自充、强化状态、模式榜单以及 `Atlas -> 国服证据门禁 -> 快照` 数据链。

## 目录

```text
apps/
  web/        Next.js Web/PWA
  mobile/     Capacitor 移动端壳
  api/        Fastify API
  worker/     数据同步、规范化、证据门禁与快照编译
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
  cn-release-evidence.json        国服实装事实 Owner
  cn-strengthening-evidence.json  国服强化事件事实 Owner
  fixtures/                       确定性测试输入
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

`data:prepare:fixture` 使用仓库内的弓阶 Atlas 结构化 Fixture，依次验证：

1. 未取得国服实装证据的候选不会进入发布数据。
2. 实装覆盖项只能提供宝具基础状态 `false`，不能预标记强化完成。
3. 强化状态只能由独立国服强化事件证据派生。
4. 最终快照会记录实装证据和强化证据的版本。

生产候选链为：

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
  -> version-controlled CN release evidence
  -> release-gated base servant data
  -> version-controlled CN strengthening evidence
  -> derived strengthening state and timeline
  -> human-reviewed ranking source
  -> immutable JSON/Brotli snapshot
```

关键约束：

- Atlas 中出现记录不代表国服已经实装。
- `collectionNo` 是跨来源主身份；名称不是第二套身份系统。
- 国服实装事实由 `data/cn-release-evidence.json` 单点拥有。
- 技能/宝具强化事实由 `data/cn-strengthening-evidence.json` 单点拥有。
- 实装与强化门禁共用一套国服发布来源校验器。
- 实装覆盖项必须保持 `NoblePhantasm.strengthened=false`；只有强化门禁可派生 `true`。
- 候选缺实装证据时进入 blocked report，不进入快照。
- 榜单 Tier 仍需人工审核，AI 不得直接发布。

## 快照可追溯性

经过审核的数据快照会把两份事实清单版本写入：

```text
metadata.sourceVersions.releaseEvidence
metadata.sourceVersions.strengtheningEvidence
```

相同版本信息同时出现在：

```text
data/generated/<dataset-version>/metadata.json
data/generated/<dataset-version>/snapshot.json
data/generated/<dataset-version>/release.json
data/generated/latest.json
```

其中 `release.json` 是版本目录内的发布描述，`latest.json` 是短缓存更新指针；腾讯云发布时必须先上传版本目录，再覆盖 `latest.json`。

## 当前完成范围

- 国服数据合同与版本化快照模型
- 弓阶单体/全体、Q/A/B、自充、标签与强化状态筛选
- 90++、高难、辅助榜数据结构
- Web/PWA 与移动端离线启动骨架
- Fastify 查询 API
- Atlas CN 原始数据摄取与最小契约解析
- Atlas 职介、稀有度、宝具色卡、目标范围和 Hit 数规范化
- 基于 `collectionNo` 的国服官方实装证据门禁
- 基于 `servantId + targetId` 的国服强化事件门禁
- 统一的国服发布来源校验边界
- 宝具强化状态派生与技能/宝具强化时间线
- 门禁 approved/blocked 与 applied 报告
- 快照元数据与发布描述中的证据版本追踪
- Git 管理的榜单审核源文件
- PostgreSQL/Drizzle schema
- Docker Compose、TCR/CVM、COS/CDN 发布脚本
- CI：依赖锁定、类型检查、测试、构建、Fixture 数据链与快照产物

下一阶段应解决仅证据版本变化时的不可变数据集路径标识，再扩展全职介实装/强化证据清单、审核后台鉴权、完整技能模型和真实 COS 发布凭据。
