# syntax=docker.io/docker/dockerfile:1

# Node.js 24系の Alpine Linux ベースイメージを使用
FROM node:25-alpine AS base

# ========================================
# 依存関係インストール段階
# ========================================
FROM base AS deps
# libc6-compat は一部のNode.jsパッケージに必要
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 依存関係のファイルをコピー（pnpmを優先）
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

# パッケージマネージャーに応じて依存関係をインストール
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# ========================================
# ビルド段階
# ========================================
FROM base AS builder
WORKDIR /app

# 依存関係をコピー
COPY --from=deps /app/node_modules ./node_modules

# ソースコードをコピー
COPY . .

# Next.js のテレメトリを無効化(ビルド時)
# ENV NEXT_TELEMETRY_DISABLED=1

# ビルド時に必要な環境変数を ARG で受け取る
# これらはビルド時にのみ使用され、最終イメージには含まれない
ARG DATABASE_URL

# ビルド時に環境変数として設定
ENV DATABASE_URL=${DATABASE_URL}

# アプリケーションをビルド
RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# ========================================
# 本番環境実行段階
# ========================================
FROM base AS runner
WORKDIR /app

# 本番環境の設定
ENV NODE_ENV=production

# Next.js のテレメトリを無効化（実行時）
# ENV NEXT_TELEMETRY_DISABLED=1

# セキュリティのため非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 公開ディレクトリをコピー
COPY --from=builder /app/public ./public

# Next.js の standalone 出力を利用してファイルサイズを最小化
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 非rootユーザーに切り替え
USER nextjs

# アプリケーションのポートを公開
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js は next build の standalone 出力で生成される
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
CMD ["node", "server.js"]
