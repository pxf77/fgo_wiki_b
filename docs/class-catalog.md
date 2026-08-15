# 国服职介覆盖目录

Worker 生成：

```text
data/reports/cn-class-catalog.json
```

目录用于查看 Atlas CN 候选、当前发布覆盖、NP 当前强化状态与各职阶规模。当前 `autoPublishClasses` 已启用全部 15 个领域职阶，因此正常 live 数据不再产生“逐从者补实装来源”的人工录入队列。

## Live 覆盖

2026-08-15 Atlas CN 验证：

```text
Saber        55 / 55
Archer       50 / 50
Lancer       52 / 52
Rider        47 / 47
Caster       51 / 51
Assassin     45 / 45
Berserker    46 / 46
Ruler        18 / 18
Avenger      17 / 17
Moon Cancer  11 / 11
Alter Ego    18 / 18
Foreigner    15 / 15
Pretender    11 / 11
Shielder      1 / 1
Beast         1 / 1
------------------
Total       438 / 438
```

`missingReleaseSources = 0`。

## Curated overlay

Atlas CN 当前 roster 与客观字段并不要求为 438 名从者各维护一份重复的人工 release entry。

`data/cn-release-evidence.json` 中的 curated entry 用于：

- 独立国服官方来源链接；
- 别名和稳定展示名；
- 产品稳定 ID；
- 确需人工修正的展示字段。

当前已有 Archer curated 条目继续覆盖自动生成值，其余从者使用稳定 ID：

```text
<class>-c<collectionNo>
```

## 当前强化状态

对 auto-published 条目：

- `atlas_current`：当前 CN NP variant 已是强化版本；
- `evidenced`：同时存在版本化 dated event；
- `not_strengthened`：当前仍是基础版本。

Atlas current state 不用于伪造历史强化日期。历史日期仍由 `data/cn-strengthening-evidence.json` 单点拥有。

## Role / Capability

目录与下游 Snapshot 现在为全职阶共享同一角色语义：

```text
attacker_single
attacker_aoe
support
hybrid
```

以及：

```text
offense / support / survival / control
cleanse / pierce / cooldown / critical
```

这些字段由 Atlas 当前 skill/function/buff 规范化派生，供 90++、高难和 Support 规则榜使用；不要为不同职阶复制排名实现。

## Fixture 与 live 验证

PR CI 使用 64 人稳定 Fixture：50 名完整 Archer + 14 名其他职阶代表，覆盖全部 15 职阶。

真实总覆盖通过上游工作流验证：

```bash
pnpm data:sync:atlas
pnpm data:prepare
pnpm snapshot:build
```

当前 live Artifact 已确认 438 reviewed servants、15 class shards 和 438 servant detail shards。
