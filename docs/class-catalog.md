# 国服职介候选目录

## 目的

扩展某个职介时，不手工遍历 Atlas 全量 JSON，也不按名称猜测宝具身份。Worker 生成：

```text
data/reports/cn-class-catalog.json
```

报告将 Atlas 候选、国服实装来源、实装 Gate 和强化事件来源合并为只读工作目录。

## 生成方式

```bash
pnpm data:sync:atlas
pnpm data:prepare
```

已有候选与门禁报告时：

```bash
pnpm data:catalog
```

Fixture 验证也生成相同合同：

```bash
pnpm data:prepare:fixture
```

## 报告内容

### 职介覆盖率

每个职介包含：

- Atlas 可玩候选数量。
- 已通过国服实装 Gate 的数量。
- 尚未补实装来源的数量。
- 已发布从者中 Atlas 标记为强化后的宝具数量。
- 已由国服强化事件证明的宝具数量。
- 已发布从者中仍缺强化事件的宝具数量。

缺来源候选是工作列表，不阻断已通过事实门禁的数据发布。

### 候选条目

每个候选展示：

- `atlasId` 与 `collectionNo`。
- 名称、职介、稀有度。
- 当前 Atlas NP 的 `atlasSourceId`、色卡、范围、Hit 数与强化提示。
- 是否已有通过 Gate 的国服实装来源。
- 已发布宝具是否已有国服强化事件。

尚无实装来源时生成不完整模板：

```text
release = null
charge = null
tags = []
role = []
effects = []
```

这些空值是待核验项，不能通过生产事实源 Schema。

## 宝具身份

产品公开合同使用稳定字符串 ID：

```text
baobhan-sith-quick-single
```

同时保存当前 live Atlas 数值身份：

```json
{
  "id": "baobhan-sith-quick-single",
  "atlasSourceId": 204302
}
```

实装 Gate 校验：

- Atlas NP ID 属于对应 `collectionNo`。
- 色卡与范围一致。
- 双方都提供 Hit 数时一致。
- 同一 Atlas NP 不得重复映射。

Atlas 同一宝具可能同时存在基础、强化与隐藏版本。目录只使用规范化阶段选出的当前常规版本，不直接遍历所有原始 NP 行。

宝具强化仍由独立强化事件来源决定；Atlas `strengthStatus` 只用于发现缺口。

## 2026-08-14 live 基线

```text
All playable Atlas candidates: 438
Archer candidates:              50
Archer passed releases:          3
Archer missing release sources: 47
Archer Atlas-strengthened NPs among passed servants: 1
Archer evidenced released NPs:   1
Archer missing strengthening events: 0
```

当前通过实装 Gate 的 Archer：

| collectionNo | 从者 | 当前 Atlas NP ID |
|---:|---|---|
| 311 | 妖精骑士崔斯坦（芭万·希） | `204302` |
| 394 | 托勒密 | `205001`, `205002` |
| 427 | 图坦卡蒙 | `205302` |

剩余 47 名只存在于缺来源工作队列。

## 弓阶扩展步骤

```text
运行 live Atlas 数据链
  ↓
筛选 className=archer
  ↓
按 collectionNo 核验国服实装来源与产品字段
  ↓
写入 data/cn-release-evidence.json 并提升 version
  ↓
根据 missingStrengtheningEvents 补强化事件并提升 version
  ↓
CI 执行身份 Gate、显式版本 Gate 和 Snapshot 构建
  ↓
GitHub Pull Request 人工 Review
```

目录负责暴露缺口，不替代事实核验，也不建立第二套审批状态。
