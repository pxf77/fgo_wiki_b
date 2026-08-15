# 灵基决策站（FGO 国服强度图鉴）

面向 FGO 简中服的版本化强度榜、从者筛选与决策工具。当前实现已经从 Archer 垂直切片推广到 **15 个职阶的完整 CN 当前 roster**，Web/PWA、API 与 Capacitor App 共用按职阶分片的数据发布模型。

## 当前效果

```text
Atlas Academy CN export
  -> 438 个当前可玩候选
  -> 技能/宝具客观事实规范化
  -> role + capability 画像
  -> 15 职阶 current-state publication
  -> 90++ / 高难 / Support 规则榜 + Git 人工覆盖
  -> NP1 / NP5 攻击宝具数据榜
  -> catalog / class / servant / ranking shards
  -> Web/PWA + Fastify API + Capacitor App
```

2026-08-15 live Atlas 验证：

| 职阶 | 数量 |
|---|---:|
| Saber | 55 |
| Archer | 50 |
| Lancer | 52 |
| Rider | 47 |
| Caster | 51 |
| Assassin | 45 |
| Berserker | 46 |
| Ruler | 18 |
| Avenger | 17 |
| Moon Cancer | 11 |
| Alter Ego | 18 |
| Foreigner | 15 |
| Pretender | 11 |
| Shielder | 1 |
| Beast | 1 |
| **合计** | **438** |

Live Gate 结果：**438 passed / 0 blocked / 15 classes**。

## 数据事实边界

- Atlas Academy **CN** export 拥有 auto-published 职阶的当前 roster 与客观游戏字段。
- `data/cn-release-evidence.json:autoPublishClasses` 当前启用全部 15 职阶；curated 条目只保留独立官方链接、别名、稳定展示 ID 与人工修正。
- `collectionNo` 是从者跨来源主身份，`atlasSourceId` 是宝具跨来源身份。
- 当前 NP 强化状态可由 Atlas CN 当前 NP variant 表示；**历史强化日期**仍只由 `data/cn-strengthening-evidence.json` 提供，不从 current state 反推。
- GitHub Pull Request 是唯一人工审核入口，不建立第二套审批状态。

Worker 当前确定性派生：

- class / rarity / collectionNo / ATK；
- 当前技能、宝具、Q/A/B、单体/全体/辅助、Hit；
- NP 倍率和简单条件特攻倍率；
- 自充、群充、单体充能；
- 当前 NP 强化状态；
- `attacker_single / attacker_aoe / support / hybrid` 角色画像；
- offense / support / survival / control / cleanse / pierce / cooldown / critical 能力画像。

## 排名语义

当前 live 数据生成：

```text
farming_90pp:      438 entries, mixed
high_difficulty:   438 entries, mixed
support:           107 entries, computed
np1_value:         392 entries, computed
np5_value:         392 entries, computed
```

- `farming_90pp` / `high_difficulty`：按**职阶内**归一化计算透明规则评分，已有 Git 人工条目覆盖规则结果。
- `support`：只纳入 `support` / `hybrid` 画像，不把纯攻击手因少量自 Buff 强行放入辅助榜。
- `np1_value` / `np5_value`：只纳入存在攻击宝具的从者；纯辅助宝具不进入伤害数据榜。
- 规则结果标记 `confidence=computed`；人工结论保持自己的 confidence/rationale，不伪装共识。

当前 live profile 分布：

```text
attacker_aoe     176
attacker_single  155
hybrid            61
support            46
```

## 发布分片

每个 Dataset 同时生成：

```text
catalog.json
classes/<class>.json             # 15 个职阶分片
servants/<servant-id>.json       # live 438 个详情分片
rankings/<mode>.json
snapshot.json                    # API/内部工具兼容
release.json
```

`data/generated/latest/` 镜像当前可消费分片。完整 Snapshot 继续存在，但客户端首屏不再要求加载整个全局数据集。

## Web/PWA

首页读取 `catalog.json` 并生成 15 个职阶入口：

```text
/
/classes/saber/
/classes/archer/
...
/classes/beast/
```

每个职阶页只读取自己的 class shard，支持名称/标签、Q/A/B、宝具范围、强化状态、自充以及 90++ / 高难 / Support / NP1 / NP5 切换。

每名从者生成静态详情页：

```text
/servants/<servant-id>/
```

详情页展示宝具、倍率、Hit、当前强化状态、角色/能力画像、各模式评价与来源。

## Capacitor App

Vite 产物使用独立数据文件：

```text
apps/mobile/dist/data/catalog.json
apps/mobile/dist/data/classes/saber.json
apps/mobile/dist/data/classes/archer.json
...
```

App 启动先读取 catalog，用户切换职阶时按需读取对应 class shard。每个职阶使用独立本地缓存，联网刷新通过：

```http
GET /api/v1/classes/:className
```

数据不会重新内联进 JavaScript Bundle。

## API

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

## 验证策略

PR CI 使用确定性 Fixture：

```text
50 名完整 Archer
+ 14 名非 Archer 代表
= 64 人 / 15 职阶 / 0 blocked
```

它验证所有职阶共享同一编译链，而不把 6MB 上游 raw 数据提交进 Git。

真实覆盖由 `.github/workflows/sync-cn-data.yml` 执行 live Atlas 同步。最新 live 验证已经确认：

```text
438 reviewed servants
15 class shards
438 servant detail shards
0 blocked
```

## 本地运行

```bash
corepack enable
pnpm install --frozen-lockfile
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

## 当前边界

- 90++ / 高难只有已有 Archer 条目是人工 editorial override，其余当前为透明 computed 结果；后续应优先人工复核高价值/争议从者，而不是阻塞全量产品。
- Capability 目前覆盖主要技能功能类型，复杂场地、状态联动、特攻对象和特殊战斗机制仍可继续结构化。
- Android/iOS 原生工程、签名包与腾讯云真实线上部署仍属于后续阶段。
- Dataset identity 目前仍由 ranking/release/strengthening 显式版本组成；未来若要让纯 Atlas upstream 数据变化也产生新不可变路径，应引入可读的 upstream revision，而不是自建内容 Hash。
