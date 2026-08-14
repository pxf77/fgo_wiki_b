# 国服职介候选目录

## 目的

完整扩展某个职介时，不直接手工遍历 Atlas 全量 JSON，也不根据中文名称猜测宝具身份。Worker 生成：

```text
data/reports/cn-class-catalog.json
```

该报告把 Atlas 候选、国服实装事实源、实装门禁结果和强化事件事实源合并成一个只读工作目录。

## 生成方式

完整数据链会自动生成：

```bash
pnpm data:sync:atlas
pnpm data:prepare
```

已有规范化候选和门禁报告时可单独刷新：

```bash
pnpm data:catalog
```

Fixture 验证也会生成同一合同的报告：

```bash
pnpm data:prepare:fixture
```

## 报告内容

### 职介覆盖率

每个职介包含：

- Atlas 可玩候选数量。
- 已通过国服实装门禁的数量。
- 尚未补实装来源的数量。
- Atlas 标记为已强化的宝具数量。
- 已由国服强化事件证明的宝具数量。
- 已发布从者中仍缺强化事件的宝具数量。

缺来源候选是工作列表，不会阻断已经通过事实门禁的数据发布。

### 候选条目

每个 Atlas 候选展示：

- `atlasId` 与 `collectionNo`。
- 名称、职介、稀有度。
- 宝具 `atlasSourceId`、色卡、范围、Hit 数和 Atlas 强化提示。
- 当前是否已有通过门禁的国服实装来源。
- 已发布从者的宝具是否已有国服强化事件。

尚无实装来源时，报告生成不完整的 `releaseSourceDraft`。其中：

```text
release = null
charge = null
tags = []
role = []
effects = []
```

这些空值是刻意保留的待核验项，不能直接通过生产事实源 Schema。

## 宝具身份

产品公开合同继续使用稳定字符串 ID，例如：

```text
baobhan-sith-quick-single
```

每个事实源宝具同时必须保存 Atlas 的数值身份：

```json
{
  "id": "baobhan-sith-quick-single",
  "atlasSourceId": 1031101
}
```

实装门禁会校验：

- Atlas NP ID 确实属于该 `collectionNo`。
- 色卡一致。
- 单体/全体/辅助范围一致。
- 双方都提供 Hit 数时，Hit 数一致。
- 同一个 Atlas NP 不得被重复映射。

宝具强化仍由独立强化事件事实源决定；Atlas 的 `strengthStatus` 只用于发现待补强化事件，不会自动发布国服强化状态。

## 弓阶扩展步骤

```text
运行 live Atlas 数据链
  ↓
在 class catalog 中筛选 className=archer
  ↓
按 collectionNo 补充国服官方实装来源和产品覆盖字段
  ↓
将条目写入 data/cn-release-evidence.json 并提升 version
  ↓
根据 missingStrengtheningEvents 补充国服强化事件并提升 version
  ↓
CI 执行身份门禁、显式版本门禁和 Snapshot 构建
  ↓
GitHub Pull Request 人工 Review
```

目录负责暴露缺口，不替代事实核验，也不建立第二套审批状态。
