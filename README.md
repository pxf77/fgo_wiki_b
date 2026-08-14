# 灵基决策站（FGO 国服强度图鉴）

面向 FGO 简中服的版本化强度榜、从者筛选与账号决策工具。项目采用一套领域模型、两个客户端壳和一个快照发布服务：

- **Web/PWA**：Next.js 静态导出，面向 COS + CDN/EdgeOne、搜索引擎和分享链接。
- **Android/iOS**：React + Vite + Capacitor，内置离线快照并支持后续原生能力。
- **API**：Fastify，提供从者、榜单、快照及内部只读数据状态接口。
- **Worker**：摄取 Atlas CN 数据，执行国服实装/强化事实门禁，生成职介覆盖目录并编译不可变快照。
- **PostgreSQL**：保存标准化从者版本、榜单快照和用户数据。

当前仓库以弓阶垂直切片验证完整链路：

```text
Atlas CN export
  -> objective candidate normalization
  -> version-controlled CN release source
  -> release gate
  -> version-controlled CN strengthening source
  -> strengthening gate
  -> Git-managed ranking source
  -> immutable JSON/Brotli snapshot
```

## 目录

```text
apps/
  web/        Next.js Web/PWA
  mobile/     Capacitor 移动端壳
  api/        Fastify API
  worker/     数据同步、规范化、事实门禁、职介目录与快照编译
  admin/      只读数据状态台
packages/
  domain/         领域模型、版本合同与启动数据
  filter-engine/  多维筛选
  ranking-engine/ 榜单读取、排序与维度评分
  damage-engine/  确定性宝具伤害计算内核
  api-client/     HTTP 客户端
  snapshot-client/浏览器/移动端快照缓存
  shared-ui/      Web 与移动端共享组件
  database/       Drizzle/PostgreSQL schema
rankings/cn/      Git 管理的国服榜单源文件
data/
  cn-release-evidence.json        国服实装事实 Owner
  cn-strengthening-evidence.json  国服强化事件事实 Owner
  fixtures/                       与真实上游结构一致的确定性测试输入
infra/            腾讯云、Nginx 与部署脚本
docs/             架构、数据链与部署说明
```

## 本地运行

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

生产候选链：

```bash
pnpm data:sync:atlas
pnpm data:prepare
pnpm snapshot:build
```

已有规范化候选和门禁报告时，可单独刷新职介目录：

```bash
pnpm data:catalog
```

相关文档：

- [`docs/data-pipeline.md`](docs/data-pipeline.md)
- [`docs/class-catalog.md`](docs/class-catalog.md)
- [`docs/data-status-dashboard.md`](docs/data-status-dashboard.md)
- [`docs/tencent-cloud-deployment.md`](docs/tencent-cloud-deployment.md)

## 数据事实边界

- Atlas 中出现记录不代表国服已经实装。
- `collectionNo` 是跨来源从者主身份；名称不是第二套身份系统。
- 产品宝具使用稳定字符串 `id`，同时以 `atlasSourceId` 关联 Atlas NP。
- 国服实装事实由 `data/cn-release-evidence.json` 单点拥有。
- 技能/宝具强化事实由 `data/cn-strengthening-evidence.json` 单点拥有。
- Atlas `strengthStatus` 只用于发现强化缺口，不能直接发布国服强化状态。
- 候选缺实装来源时进入 blocked report，不进入 Snapshot。
- Tier 与评价理由通过 GitHub Pull Request 人工审核；AI 不直接发布 Tier。

## Atlas CN 规范化合同

真实 CN export 的宝具卡色为数值字符串：

```text
1 -> Arts
2 -> Buster
3 -> Quick
```

同一从者可能同时包含基础宝具、强化宝具、隐藏名称和战斗内临时宝具。Worker 按以下规则生成当前候选：

1. 优先使用 `0 < priority < 190` 的常规记录。
2. 按 `num + npNum + card` 归并同一宝具概念。
3. 同组选择最高 `priority`；同优先级选择较大的 Atlas NP ID。
4. 仅当没有常规记录时，才回退到其他正优先级或全部记录。

该规则保留真实双宝具，并排除 `priority=199` 一类战斗内占位记录。

## 真实上游校验基线

2026-08-14 的 Atlas CN live 候选基线：

```text
Atlas input records:           454
Accepted playable candidates:  438
Archer candidates:              50
```

当前国服事实源已覆盖 5 名 Archer：

| collectionNo | 从者 | 宝具形态 |
|---:|---|---|
| 311 | 妖精骑士崔斯坦（芭万·希） | Quick 单体 |
| 350 | 源为朝 | Buster 全体 |
| 383 | 杜尔伽 | Arts 全体 |
| 394 | 托勒密 | Buster 单体 / Arts 全体 |
| 427 | 图坦卡蒙 | Arts 单体 |

其余 45 名 Archer 继续作为缺来源候选，不会因 Atlas 中存在而自动发布。

本批新增的源为朝与杜尔伽均使用国服官方从者介绍作为实装来源，并通过 live Atlas NP ID、色卡、范围和 Hit 数门禁。

## 职介覆盖目录

Worker 生成：

```text
data/reports/cn-class-catalog.json
```

目录提供：

- 各职介 Atlas 候选、实装来源与强化证据覆盖率。
- 未补实装来源的候选及不完整 JSON 模板。
- Atlas 已标记强化、但国服强化事件仍待核验的宝具。
- 产品 NP ID 与 Atlas NP ID 的稳定映射。

该文件只是派生工作队列，不是新的事实 Owner，也不会自动扩大生产发布范围。

## 快照身份与发布

生产数据集路径由榜单版本和两份事实源版本共同决定：

```text
<ranking-date>-r<ranking-revision>--rel-<release-source-version>--str-<strengthening-source-version>
```

当前事实源生成：

```text
2026-08-13-r1--rel-2026-08-14-r4--str-2026-08-13-strengthening-r1
```

Bootstrap 数据使用：

```text
<ranking-date>-r<ranking-revision>--bootstrap
```

腾讯云发布顺序：

```text
上传不可变版本目录
  -> 上传版本级 release.json
  -> 最后更新短缓存 latest.json
```

项目不使用内容 Hash、SHA256 或隐藏指纹作为第二套版本身份。

## PR 显式版本门禁

Pull Request CI 会直接比较 base 与 head 中解析后的 JSON：

- 实装来源语义内容变化时，顶层 `version` 必须变化。
- 强化来源语义内容变化时，顶层 `version` 必须变化。
- 榜单内容变化时，必须前进日期或提高同日 `revision`。
- 当前榜单文件必须与 `rankings/cn/latest.json` 的 `asOf/revision` 一致。
- 不允许静默改写历史榜单目录。

本地执行：

```bash
pnpm version:check -- --base <base-sha> --head <head-sha>
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

## 当前完成范围

- Web/PWA、Capacitor App、Fastify API 和只读数据状态台骨架
- 国服从者、宝具、强化时间线、榜单和快照领域模型
- Atlas CN live 数据摄取与当前宝具版本规范化
- 实装、强化、宝具身份和榜单引用的确定性 Gate
- 职介覆盖目录、缺来源模板和强化缺口报告
- 复合 Dataset 身份与不可变发布指针
- PR 显式来源版本和榜单 revision 门禁
- PostgreSQL/Drizzle、Docker Compose 与腾讯云发布骨架
- 冻结依赖、类型检查、测试、生产构建和 Snapshot Artifact CI

下一阶段继续按职介目录分批补齐 Archer 的国服实装来源和强化事件，再扩展至其他职介；完整技能效果结构化与真实腾讯云线上部署仍待后续实施。
