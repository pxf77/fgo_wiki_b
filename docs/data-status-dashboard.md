# 国服数据状态台

## 定位

`apps/admin` 是内部只读数据状态界面，用于把 Worker 生成的事实源、门禁报告和当前 Snapshot 投影成可检查的状态视图。

它不是审批系统，不保存“通过/不通过”结果，也不是新的事实 Owner。GitHub Pull Request 是本项目唯一的人工审核入口。

当前展示：

- Atlas 规范化数量、跳过项和警告数量。
- 尚未补充国服实装来源的 Atlas 候选。
- `data/cn-release-evidence.json` 中的实装来源及门禁状态。
- `data/cn-strengthening-evidence.json` 中的强化事件及应用状态。
- 当前 Git 管理榜单的条目统计。
- 事实源版本、门禁报告版本和已发布 Snapshot 版本之间的差异。

## 数据链

```text
Worker reports + source manifests + current Snapshot
                       ↓
apps/api/src/data-status-repository.ts
                       ↓
GET /api/internal/data-status
                       ↓
apps/admin
```

页面刷新时重新读取文件和当前 Snapshot，不维护第二套状态。

## 数据发布状态

| 状态 | 含义 |
|---|---|
| `ready` | 事实源、门禁报告和已发布 Snapshot 的来源版本一致。 |
| `stale` | 事实源与门禁一致，但 Snapshot 尚未包含当前来源版本。 |
| `blocked` | 事实源与门禁版本不一致，或来源条目尚未通过确定性门禁。 |
| `bootstrap` | API 当前读取开发用 Bootstrap Snapshot。 |

`missingSourceCandidates` 是待补实装来源的工作列表，不会因为数量大而自动阻断已通过门禁的数据发布。

## 唯一人工审核入口

事实源和榜单通过 GitHub Pull Request 修改：

```text
修改 JSON / 榜单文件
  ↓
CI 执行事实 Gate、榜单合同 Gate、发布预检 Gate
  ↓
GitHub PR Review
  ↓
合并后构建并发布 Snapshot
```

不建设以下能力：

- 审批数据库表。
- 后台“通过/不通过”写入 API。
- 审批状态机。
- 审批原因与 Git 双向同步。
- 仅为重复审批建设的 RBAC。
- 浏览器本地审批状态。

## 本地运行

```bash
pnpm install --frozen-lockfile
pnpm data:prepare:fixture
pnpm snapshot:build
pnpm dev:api
pnpm --filter @fgo-wiki/admin dev
```

默认地址：

```text
Data status: http://localhost:4174
API:         http://localhost:3001
```

如果 Worker 报告尚未生成，内部状态接口返回 `503`，页面显示明确错误，不回退到伪造数据。

## 腾讯云部署

生产 Compose 把宿主机 `data/` 只读挂载到 API 容器：

```text
./data:/workspace/data:ro
```

因此 API 可以读取规范化报告、两份门禁报告、两份事实源清单和当前 Snapshot。

状态台静态产物可以部署到独立内部 COS 路径或 CVM 静态目录。`/api/internal/*` 不应通过公共 API 域名直接开放，至少需要企业 VPN、来源 IP 白名单或独立内部网关。
