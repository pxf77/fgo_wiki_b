# 腾讯云部署

## 1. 资源

首版建议创建：

- 1 台 CVM 或轻量应用服务器，生产建议 4C8G。
- 1 个 TencentDB for PostgreSQL 实例，与 CVM 放在同一 VPC。
- 1 个私有 TCR 命名空间。
- 1 个 COS 存储桶，开启自定义域名并接入 CDN 或 EdgeOne。
- CLS 日志主题、DNSPod 域名和 SSL 证书。

Web 静态流量和数据快照由 COS/CDN 承担，CVM 仅运行 API、Worker 与只读数据状态服务，不需要首版部署 TKE。

## 2. 域名

```text
www.example.cn       Web/PWA
api.example.cn       Fastify API
static.example.cn    COS/CDN 快照与静态资源
admin.example.cn     内部只读数据状态台
```

中国大陆节点上线前需完成网站与 App 备案。内部数据状态接口应限制来源 IP 或置于企业 VPN；这是访问控制，不是第二套审批系统。

## 3. 镜像

```bash
export TCR_REGISTRY=ccr.ccs.tencentyun.com
export TCR_NAMESPACE=fgo-wiki
export IMAGE_TAG=$(git rev-parse --short HEAD)

docker build -f Dockerfile.api \
  -t "$TCR_REGISTRY/$TCR_NAMESPACE/api:$IMAGE_TAG" .
docker build -f Dockerfile.worker \
  -t "$TCR_REGISTRY/$TCR_NAMESPACE/worker:$IMAGE_TAG" .

docker push "$TCR_REGISTRY/$TCR_NAMESPACE/api:$IMAGE_TAG"
docker push "$TCR_REGISTRY/$TCR_NAMESPACE/worker:$IMAGE_TAG"
```

## 4. CVM

将 `.env`、`docker-compose.yml` 和 `infra/nginx/fgo-wiki.conf` 部署到服务器。生产数据库使用 TencentDB 内网地址，不在 Compose 中运行 PostgreSQL：

```bash
API_IMAGE=ccr.ccs.tencentyun.com/fgo-wiki/api:<sha> \
WORKER_IMAGE=ccr.ccs.tencentyun.com/fgo-wiki/worker:<sha> \
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Nginx 只代理 `api.example.cn`。Web 的 `apps/web/out/` 目录由 CI 上传 COS。

## 5. 数据核验、Web/App 构建与快照发布

候选数据依次经过国服实装与强化事件事实门禁：

```bash
pnpm data:sync:atlas
pnpm data:prepare
pnpm snapshot:build
```

随后构建 Web/PWA 和 Capacitor Web Bundle：

```bash
ALLOW_BOOTSTRAP_DATA=false \
SNAPSHOT_PATH=./data/generated/latest/snapshot.json \
pnpm build

pnpm --filter @fgo-wiki/mobile verify:embedded
```

Next.js 和 Vite 均在构建期读取同一份 Snapshot。正式构建要求 `metadata.sourceStatus=reviewed`；Snapshot 缺失、结构无效或仍是 Bootstrap 数据时应直接失败。不要先构建客户端再生成 Snapshot，否则静态站点和 App 首包不会包含当前 reviewed 从者数据。

移动端构建结果位于：

```text
apps/mobile/dist/
```

该目录是 Capacitor 的 `webDir`。生成 Android/iOS 工程后执行：

```bash
pnpm --filter @fgo-wiki/mobile cap:sync
```

设备本地缓存只会在同一 Dataset 或发布时间更新时替换安装包内置 Snapshot，避免旧缓存降级新安装包。联网更新接口返回 Bootstrap 数据时，客户端会拒绝替换当前 reviewed 数据。

正式发布前检查：

```text
data/reports/atlas-normalization.json
data/reports/cn-release-gate.json
data/reports/cn-strengthening-gate.json
data/reports/cn-class-catalog.json
```

快照中的 `metadata.sourceVersions`、版本目录内的 `release.json` 与根目录 `latest.json` 必须记录相同的实装来源和强化来源版本。

正式发布顺序：

1. 上传 `data/generated/<version>/`，设置一年缓存；该目录包含 `release.json`。
2. 确认 CDN 可读取 `snapshot.json`、`metadata.json` 和 `release.json`。
3. 核对 `release.json.sourceVersions` 与两份门禁报告一致。
4. 上传 `apps/web/out/` 到 Web 静态站点路径。
5. 使用 `apps/mobile/dist/` 同步 Capacitor 原生工程并构建 AAB/IPA。
6. 最后覆盖 `snapshots/latest.json`，设置 60 秒缓存。

发布脚本见 `infra/scripts/publish-snapshot.sh`。生产环境可将脚本中的上传命令替换为腾讯云 CLI、COSCMD 或 CI 官方 Action。GitHub 的定时核验工作流只生成 Artifact，不直接更新 COS。

## 6. Worker 容器

工具 Profile 会将宿主机 `data/` 挂载到 `/workspace/data`，以便保留原始数据、门禁报告和生成快照：

```bash
docker compose --profile tools run --rm worker node apps/worker/dist/index.js sync-atlas
docker compose --profile tools run --rm worker node apps/worker/dist/index.js prepare-live
docker compose --profile tools run --rm worker node apps/worker/dist/index.js snapshot
```

## 7. 日志与健康检查

- API：`GET /health`
- 容器日志输出 JSON 到 stdout，由 CLS Agent 采集。
- 对 API 5xx、Worker 同步失败、门禁失败和快照发布时间过旧设置告警。
- 数据库只开放 VPC 内网端口。
