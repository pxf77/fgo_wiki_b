# 国服职介覆盖目录

Worker 生成：

```text
data/reports/cn-class-catalog.json
```

目录用于查看 Atlas CN 候选、当前发布覆盖、NP 当前强化状态以及非 auto-published 职介仍需补充的人工来源缺口。

## Archer P0

`data/cn-release-evidence.json` 当前启用：

```json
{
  "autoPublishClasses": ["archer"]
}
```

因此 Archer 当前覆盖口径为：

```text
Atlas CN Archer candidates: 50
Published Archer:            50
Missing release sources:      0
```

5 条 curated Archer 继续提供稳定产品 ID、别名、独立国服来源链接和更丰富的展示说明；其他 Archer 使用稳定自动 ID：

```text
archer-c<collectionNo>
```

## 当前强化状态

对于 auto-published Archer，Atlas CN 当前 NP variant 的 `strengthStatus` 表示当前区域已经选择到的强化后版本，可直接用于“当前是否已强化”的事实展示。

这与 dated strengthening timeline 分层：

- `atlas_current`：当前 CN 状态已强化，但没有在本仓库维护独立历史日期。
- `evidenced`：同时有 `data/cn-strengthening-evidence.json` 中的 dated event。
- `not_strengthened`：当前 NP 仍为基础状态。

不能从 `atlas_current` 推导或伪造强化日期。

## 非 auto-published 职介

其他职介仍按原工作队列语义：Atlas 候选不会自动进入发布数据，目录会生成不完整来源模板，待后续明确加入 `autoPublishClasses` 或补 curated source。

## 宝具身份

Curated 条目使用产品稳定 ID，并以 `atlasSourceId` 关联当前 Atlas NP。Gate 校验 NP 所属从者、色卡、范围和可用 Hit 数。

Auto-published 条目以当前 Atlas NP 生成稳定数据合同，并保留 `atlasSourceId`。

## 使用

```bash
pnpm data:sync:atlas
pnpm data:prepare
```

确定性 P0 Fixture：

```bash
pnpm data:prepare:fixture
```

Fixture 直接使用完整 50 名 Archer 的规范化候选快照，从 Gate 之后验证产品覆盖；生产仍从 Atlas raw export 开始执行 normalizer。
