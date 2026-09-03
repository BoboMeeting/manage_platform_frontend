# syntax=docker/dockerfile:1

# ============================================================================
# 阶段 1：安装依赖
# ============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# 利用 Docker 层缓存：先只拷 package.json，装一次依赖
# 注意：不能 --omit=dev，因为 Stage 2 builder 需要 typescript 来编译 next.config.ts
# Stage 3 standalone 模式会自动剥离 devDeps，runtime 镜像不会变大
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# ============================================================================
# 阶段 2：构建 Next.js（需要 devDependencies 中的 typescript 等）
# ============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建时通过 ARG 注入后端地址（仅用于 next.config.ts 的默认值）
# 运行时仍可用 BACKEND_URL 环境变量覆盖
ARG BACKEND_URL=http://localhost:5080
ENV BACKEND_URL=$BACKEND_URL

RUN npm run build

# ============================================================================
# 阶段 3：运行时镜像（仅包含 standalone 产物）
# ============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 安全：使用非 root 用户运行
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# 拷贝 standalone 产物（自带最小化 node_modules 和 server.js）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# 拷贝静态资源（standalone 不包含 .next/static 和 public）
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# standalone 模式下入口是 server.js，不是 next start
CMD ["node", "server.js"]
