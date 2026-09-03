# BoboMeet Admin Web

基于 **Next.js 15 (App Router) + TypeScript + Tailwind CSS 4** 构建的管理后台前端。

本目录提供完整的 **Docker 多阶段构建** 方案，支持在 Linux 服务器上一键部署。

---

## 目录结构

```
web/
├── Dockerfile              # 三阶段构建（deps → builder → runner）
├── docker-compose.yml      # Compose 编排
├── .dockerignore           # 构建上下文排除项
├── .env.example            # 环境变量模板
├── next.config.ts          # Next.js 配置（含 API 代理 rewrite）
├── package.json
└── src/
```

---

## 环境要求

| 工具 | 最低版本 | 说明 |
|------|---------|------|
| Docker | 24+ | 需要 BuildKit 支持 |
| Docker Compose | v2 | `docker compose` 或 `docker-compose` 均可 |
| 宿主机架构 | **linux/amd64** | Dockerfile 已强制指定 `platform: linux/amd64` |

---

## 快速开始

### 1. 准备环境变量

```bash
cp .env.example .env
# 按需修改 BACKEND_URL 和 WEB_PORT
```

`.env` 主要变量：

| 变量 | 默认值 | 说明 |
|------|-------|------|
| `BACKEND_URL` | `http://host.docker.internal:5080` | 后端 .NET API 地址 |
| `WEB_PORT` | `3000` | 宿主机暴露端口（容器内固定 3000） |

`BACKEND_URL` 填写参考：

| 场景 | 填写示例 |
|------|---------|
| 后端跑在宿主机（同机） | `http://host.docker.internal:5080` 或 `http://172.17.0.1:5080` |
| 后端也是 Docker 容器（同一 compose） | `http://backend:5080` |
| 后端是远程服务器 | `http://10.0.0.5:5080` |

### 2. 构建并启动

```bash
# 一键构建 + 后台运行
docker compose up -d --build web

# 老版本 Compose 也可以用
docker-compose up -d --build web
```

### 3. 验证

```bash
# 查看容器状态
docker ps | grep bobomeet-web

# 查看启动日志
docker logs -f bobomeet-web

# 健康检查
docker inspect bobomeet-web --format '{{.State.Health.Status}}'
# 期望输出: healthy

# 访问
curl http://localhost:3000/
```

### 4. 停止 & 清理

```bash
# 停止并删除容器
docker compose down

# 同时清理镜像
docker compose down --rmi local

# 清理构建缓存（遇到奇怪问题时使用）
docker builder prune -f
```

---

## Dockerfile 构建架构

采用 **三阶段构建** 以最小化最终镜像体积：

```
┌─────────────────────────────────────────────────────────┐
│  Stage 1: deps        (node:20-alpine)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ COPY package.json + package-lock.json             │  │
│  │ RUN npm ci            ← 安装全部依赖（含 devDeps）│  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ COPY --from=deps node_modules
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 2: builder     (node:20-alpine)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ COPY 全部源码                                     │  │
│  │ ARG BACKEND_URL  → 注入 next.config.ts 默认值     │  │
│  │ RUN npm run build  → 产出 .next/standalone        │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ COPY --from=builder standalone + static
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 3: runner      (node:20-alpine)    ← 最终镜像     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 非 root 用户 (nextjs:nodejs, uid/gid 1001)       │  │
│  │ 只有 .next/standalone + .next/static               │  │
│  │ 自动剥离了 devDeps，体积 < 200MB                   │  │
│  │ CMD ["node", "server.js"]                         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 为什么 deps 阶段不 `--omit=dev`？

构建 `next.config.ts` 需要 `typescript`（位于 devDependencies）。如果装生产依赖就跳过它，Next.js 会在构建时报错：

```
Error: Cannot find module 'typescript'
```

而最终 runner 阶段只拷贝 `standalone` 产物，它会自动内嵌**最小化的生产依赖**，devDeps 不会被带过去。所以装全量依赖**不会增大最终镜像**。

---

## 手动构建（不通过 Compose）

```bash
# 构建镜像
docker build -t bobomeet-admin-web:latest \
  --build-arg BACKEND_URL=http://host.docker.internal:5080 \
  --platform linux/amd64 \
  .

# 运行容器
docker run -d \
  --name bobomeet-web \
  --restart unless-stopped \
  -p 3000:3000 \
  -e BACKEND_URL=http://host.docker.internal:5080 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e HOSTNAME=0.0.0.0 \
  --add-host host.docker.internal:host-gateway \
  bobomeet-admin-web:latest
```

---

## next.config.ts API 代理

Next.js 通过 `rewrites` 将浏览器的 `/api/*` 请求反向代理到后端：

```ts
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: `${backendUrl}/api/:path*`,
    },
  ];
}
```

这样前端无需配置 CORS。生产环境也可以改为由 Nginx 统一转发 `/api` 前缀。

---

## 常见问题

### Q1: `exec format error` / 构建时出现 `linux/arm64` 警告

**原因**：Docker 拉取了 arm64 架构的基础镜像，但宿主机是 amd64。

**解决**：确保 `docker-compose.yml` 的 `web` 服务下有 `platform: linux/amd64`，或在 Dockerfile 所有 `FROM` 前加 `--platform=linux/amd64`：

```dockerfile
FROM --platform=linux/amd64 node:20-alpine AS deps
FROM --platform=linux/amd64 node:20-alpine AS builder
FROM --platform=linux/amd64 node:20-alpine AS runner
```

然后清理旧缓存重建：

```bash
docker image rm node:20-alpine
docker builder prune -f
docker compose up -d --build web
```

### Q2: `Cannot find module 'typescript'`

**原因**：Dockerfile 里用了 `npm ci --omit=dev`，跳过了 devDependencies。但构建 `next.config.ts`（TypeScript 文件）需要 typescript。

**解决**：Stage 1 deps 必须安装全部依赖，不能 `--omit=dev`。

### Q3: 容器启动了但访问 `/api/*` 返回 502

**原因**：Next.js 的 rewrite 代理连不上后端。

**排查步骤**：

1. 确认 `BACKEND_URL` 是否正确
2. 如果后端跑在宿主机，确认 `extra_hosts` 里有 `host.docker.internal:host-gateway`
3. 进入容器直接测试：
   ```bash
   docker exec -it bobomeet-web sh
   wget -qO- $BACKEND_URL/api/health  # 或 curl
   ```

### Q4: 健康检查一直 `unhealthy`

**原因**：`node:20-alpine` 默认不包含 `wget`。

**解决**（二选一）：

**方案 A** — 在 Dockerfile 的 runner 阶段加一行：

```dockerfile
RUN apk add --no-cache wget
```

**方案 B** — 把健康检查改成用 node 自带能力（无需额外安装）：

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/', r => process.exit(r.statusCode === 200 || r.statusCode === 404 ? 0 : 1)).on('error', () => process.exit(1))"]
```

### Q5: 如何部署到远程服务器

```bash
# 方式 1：git pull + compose
ssh root@your-server
cd /opt/manage_platform_frontend
git pull
docker compose up -d --build web

# 方式 2：CI/CD 推送镜像到私有仓库
docker build -t registry.example.com/bobomeet-admin-web:v1.0.0 --platform linux/amd64 .
docker push registry.example.com/bobomeet-admin-web:v1.0.0
# 服务器上：docker pull + docker compose up -d
```

---

## 开发模式（本地）

```bash
npm install
npm run dev
# 默认 http://localhost:3000
```

开发时 `BACKEND_URL` 默认代理到 `http://localhost:5080`，可在 `.env.local` 中覆盖。
