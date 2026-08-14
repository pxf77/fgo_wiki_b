# 灵基决策站（FGO 国服强度图鉴）

面向 FGO 简中服的版本化强度榜、从者筛选和决策工具。当前 P0/P1 聚焦 Archer：完整国服当前事实、完整榜单覆盖、Web 详情页和按职介/从者分片的数据交付。

## 当前效果

```text
Atlas Academy CN export
  -> 当前 CN 可玩从者与客观技能/宝具事实
  -> Archer 50/50 当前事实集
  -> 人工来源/别名/展示覆盖
  -> 90++ / 高难规则榜 + 人工覆盖
  -> NP1 / NP5 确定性数据榜
  -> catalog / class / servant / ranking shards
  -> Web/PWA + Fastify API + Capacitor App
```

### Archer P0

- 当前 Atlas CN Archer：**50/50** 纳入 reviewed 数据。
- 5 条已有人工记录继续提供独立国服来源链接、别名和展示修正。
- 当前 NP 强化状态由 Atlas CN 当前宝具版本提供；已有独立强化公告的条目继续保留 dated timeline。
- 自动派生：ATK、宝具色卡/范围/Hit、宝具倍率、自充/群充/单体充能。
- `farming_90pp`、`high_difficulty` 对全部 Archer 有条目；人工评级覆盖透明规则评分。
- `np1_value`、`np5_value` 为完整确定性数据榜。

### P1 数据分片

Worker 同时生成：

```text
data/generated/<version>/catalog.json
data/generated/<version>/classes/archer.json
data/generated/<version>/servants/<id>.json
data/generated/<version>/rankings/<mode>.json
data/generated/<version>/snapshot.json
```

`latest/` 下生成相同可消费分片。完整 `snapshot.json` 保留给 API 兼容和内部工具，但 Web 首页与 App 不再需要把全局 Snapshot 放进首屏/JS Bundle。

## 客户端

### Web/PWA

Next.js 构建默认读取：

```text
data/generated/latest/classes/archer.json
```

首页提供：名称/标签、Q/A/B、单体/全体/辅助、强化状态、自充、90++、高难、NP1、NP5 筛选/排序。

每个 Archer 生成静态详情页：

```text
/servants/<servant-id>/
```

详情页展示宝具、倍率、Hit、当前强化状态、各模式评价，以及数据来源。已有独立国服公告的条目直接展示来源链接；其他条目明确标记为 Atlas Academy CN 当前事实，避免伪造独立公告。

### Capacitor App

Vite 构建从 Archer class shard 生成独立文件：

```text
apps/mobile/dist/data/initial-snapshot.json
```

该文件作为离线首包数据，不再把完整数据 JSON 内联进 JS Bundle。在线刷新调用：

```http
GET /api/v1/classes/archer
```

设备缓存只在同版本或发布时间更新时覆盖安装包数据。

## API

主要接口：

```http
GET /health
GET /api/v1/meta
GET /api/v1/classes/:className
GET /api/v1/servants
GET /api/v1/servants/:id
GET /api/v1/rankings/:mode
GET /api/v1/datasets/latest
GET /api/internal/data-status
```

`/api/v1/classes/archer` 返回与静态 class shard 同粒度的数据，供 App 增量更新。

## 数据事实边界

- Atlas **CN** 是明确 auto-published 职介的当前可玩 roster 和客观字段来源；当前仅启用 Archer。
- `data/cn-release-evidence.json` 管理 `autoPublishClasses`，并保存需要独立官方来源/别名/展示修正的 curated 条目。
- `data/cn-strengthening-evidence.json` 保存可核验的 dated strengthening timeline；Atlas current state 不用于伪造历史日期。
- `collectionNo` 是从者跨来源主身份；`atlasSourceId` 是宝具跨来源身份。
- GitHub Pull Request 是唯一人工审核入口。

## 排名语义

- `np1_value` / `np5_value`：确定性数据榜，基于 ATK、宝具倍率、色卡修正和充能能力等客观字段。
- `farming_90pp` / `high_difficulty`：所有 Archer 都有透明规则评分；`rankings/cn` 中人工条目对同从者/模式覆盖规则值。
- UI 会显示 `computed / mixed / editorial` 来源与 `confidence`，不会把规则评分伪装成人工共识。

## 本地运行

要求 Node.js 24 LTS、pnpm 11。

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm data:prepare:fixture
pnpm snapshot:build
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @fgo-wiki/mobile verify:embedded
```

生产数据：

```bash
pnpm data:sync:atlas
pnpm data:prepare
pnpm snapshot:build
pnpm build
```

## 腾讯云部署形态

```text
Web/PWA static     -> COS -> CDN/EdgeOne
Snapshot/shards    -> COS -> CDN/EdgeOne
Fastify + Worker   -> CVM/Lighthouse + Docker Compose
PostgreSQL         -> TencentDB（用户/个性化功能需要时启用）
Images             -> TCR
Logs               -> CLS
```

数据集不可变版本目录仍由榜单版本、release source version、strengthening source version 组成。先上传不可变目录，再更新短缓存 `latest.json`；项目不使用内容 Hash/SHA256 作为第二套发布身份。

## 当前边界

P0/P1 完成后，Archer 已可作为实际产品使用，但仍有以下后续项：

- 90++/高难中未人工复核的条目标记为 `computed`，后续可逐步人工覆盖，而不是阻塞全量产品。
- 其余职介尚未加入 `autoPublishClasses`。
- Android/iOS 原生工程、商店签名包和腾讯云真实线上部署仍待后续阶段。
- 复杂技能效果/特攻对象的完整结构化仍可继续增强。
