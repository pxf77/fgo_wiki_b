# 腾讯云部署

## 1. 资源

首版建议创建：

- 1 台 CVM 或轻量应用服务器，生产建议 4C8G。
- 1 个 TencentDB for PostgreSQL 实例，与 CVM 放在同一 VPC。
- 1 个私有 TCR 命名空间。
- 1 个 COS 存储桶，开启自定义域名并接入 CDN 或 EdgeOne。
- CLS 日志主题、DNSPod 域名和 SSL 证书。

Web 静态流量和数据快照由 COS/CDN 承担，CVM 仅运行 API、Worker 与审核后台，不需要首版部署 TKE。

## 2. 域名

```text
www.example.cn       Web/PWA
api.example.cn       Fastify API
static.example.cn    COS/CDN 快照与静态资源
admin.example.cn     内部审核后台
```

中国大陆节点上线前需完成网站与 App 备案。管理后台应限制来源 IP 或置于企业 VPN，并启用独立鉴权。

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

Nginx 只代理 `api.example.cn`。Web 的 `out/` 目录由 CI 上传 COS。

## 5. 快照发布顺序

1. `pnpm snapshot:build`
2. 上传 `data/generated/<version>/`，设置一年缓存。
3. 确认 CDN 可读取新版本。
4. 最后覆盖 `snapshots/latest.json`，设置 60 秒缓存。

发布脚本见 `infra/scripts/publish-snapshot.sh`。生产环境可将脚本中的上传命令替换为腾讯云 CLI、COSCMD 或 CI 官方 Action。

## 6. 日志与健康检查

- API：`GET /health`
- 容器日志输出 JSON 到 stdout，由 CLS Agent 采集。
- 对 API 5xx、Worker 同步失败和快照发布时间过旧设置告警。
- 数据库只开放 VPC 内网端口。
