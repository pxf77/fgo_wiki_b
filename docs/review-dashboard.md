# 国服数据审核台

## 定位

`apps/admin` 是内部只读审核界面，用于把 Worker 已生成的数据源和门禁报告投影成可检查的审核视图。它不直接修改事实源、不保存浏览器内“通过/不通过”状态，也不发布 Tier。

当前展示：

- Atlas 规范化数量、跳过项和警告数量。
- 尚未补充国服实装来源的 Atlas 候选。
- `data/cn-release-evidence.json` 中的实装来源及门禁应用状态。
- `data/cn-strengthening-evidence.json` 中的强化事件及门禁应用状态。
- 当前人工榜单条目统计。
- 审核源版本、门禁报告版本和已发布 Snapshot 版本之间的差异。

## 数据链

```text
Worker reports + reviewed source manifests + current Snapshot
                         ↓
apps/api/src/review-repository.ts
                         ↓
GET /api/internal/review/dashboard
                         ↓
apps/admin
```

审核台是派生视图，不是新的事实 Owner。刷新页面会重新读取文件和当前 Snapshot。

## 发布状态

| 状态 | 含义 |
|---|---|
| `ready` | 审核源、门禁报告和已发布 Snapshot 的来源版本一致。 |
| `pending_publication` | 审核源和门禁一致，但 Snapshot 尚未发布这些来源版本。 |
| `blocked` | 审核源与门禁版本不一致，或存在已审核但未应用的实装/强化条目。 |
| `bootstrap` | API 当前读取开发用 Bootstrap Snapshot。 |

`blockedCandidates` 是待补实装来源的工作队列，不会因为数量大而自动阻断当前已审核数据发布；只有已进入审核源但未通过门禁的条目才属于发布阻断。

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
Admin: http://localhost:4174
API:   http://localhost:3001
```

如果 Worker 报告尚未生成，内部审核接口返回 `503`，页面会显示明确错误，而不是回退到伪造数据。

## 腾讯云部署

生产 Compose 覆盖文件会把宿主机 `data/` 只读挂载到 API 容器：

```text
./data:/workspace/data:ro
```

因此 API 可以同时读取：

- `data/reports/atlas-normalization.json`
- `data/reports/cn-release-gate.json`
- `data/reports/cn-strengthening-gate.json`
- 两份审核源清单
- 当前版本化 Snapshot

管理端静态产物可以部署到独立的内部 COS 路径或 CVM 静态目录。`/api/internal/*` 不应通过公共 API 域名直接开放，至少需要企业 VPN、来源 IP 白名单或独立内部网关。

本轮不实现账号鉴权和写入审批。后续写入能力必须使用服务端身份认证、持久化审批记录和发布事务，不能恢复为浏览器本地按钮状态。
