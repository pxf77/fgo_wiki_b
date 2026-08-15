# 腾讯云部署

## 目标拓扑

```text
Web/PWA static              -> COS -> CDN/EdgeOne
versioned dataset + shards  -> COS -> CDN/EdgeOne
Fastify API + Worker        -> CVM/Lighthouse
PostgreSQL                  -> TencentDB（用户功能需要时）
container images            -> TCR
logs                        -> CLS
```

首版无需 TKE。

## 构建顺序

生产构建必须先得到 reviewed 数据：

```bash
pnpm data:sync:atlas
pnpm data:prepare
pnpm snapshot:build
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @fgo-wiki/mobile verify:embedded
```

P1 后 Web 默认消费：

```text
data/generated/latest/classes/archer.json
data/generated/latest/servants/<id>.json
```

Mobile 首包生成独立文件：

```text
apps/mobile/dist/data/initial-snapshot.json
```

API 仍加载完整 Snapshot 以兼容查询，但 App 在线刷新使用：

```http
GET /api/v1/classes/archer
```

## COS 发布

每个版本目录包含：

```text
metadata.json
catalog.json
snapshot.json
classes/
servants/
rankings/
release.json
```

推荐顺序：

1. 上传 `data/generated/<version>/`，长缓存。
2. 上传 `apps/web/out/` 到 Web 站点路径。
3. 验证 class shard、一个 servant detail shard 和 Web 页面可访问。
4. 最后覆盖 `snapshots/latest.json`，短缓存。

不要用内容 Hash/SHA256 建立第二套发布身份。

## CVM

构建并推送 API/Worker 镜像到 TCR，然后：

```bash
API_IMAGE=ccr.ccs.tencentyun.com/fgo-wiki/api:<sha> \
WORKER_IMAGE=ccr.ccs.tencentyun.com/fgo-wiki/worker:<sha> \
DATABASE_URL=<tencentdb-private-url> \
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

健康检查：

```http
GET /health
```

内部 `/api/internal/data-status` 应放在 VPN/IP 白名单或内部网关之后。

## App

`apps/mobile/dist/` 是 Capacitor 的 Web 资源目录。生成原生工程前先确认 `data/initial-snapshot.json` 已通过 `verify:embedded`。

```bash
pnpm --filter @fgo-wiki/mobile cap:add:android
pnpm --filter @fgo-wiki/mobile cap:add:ios
pnpm --filter @fgo-wiki/mobile cap:sync
```

AAB/IPA 签名和商店发布属于后续生产发布阶段。
