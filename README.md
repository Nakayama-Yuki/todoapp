# Todo App with PostgreSQL

Next.js App Router、React、TypeScript、Tailwind CSS v4、PostgreSQL 18 を使う Todo アプリです。追加・編集・削除・完了切替・テーマ変更と、Auth.js による GitHub ログインに対応します。依存バージョンと全コマンドは [package.json](package.json) を参照してください。

## 前提

Node.js LTS、pnpm、PostgreSQL 18（ローカルまたは Docker）を用意します。付属スクリプトは `docker-compose` コマンドを使用します。環境が `docker compose` のみを提供する場合は、対応する Compose ファイルを指定して直接実行してください。

## ローカルセットアップ

```bash
git clone https://github.com/Nakayama-Yuki/todoapp.git
cd todoapp
pnpm install
cp .env.local.example .env.local
```

`.env` は Compose 用の共有設定、`.env.local` は Next.js のローカル上書き設定です。`.env.local` の `DATABASE_URL` を利用する DB に合わせて編集します。Docker の DB ならホストは `localhost`、DB名・ユーザー・パスワードは `.env` の `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` に合わせます。秘密情報は共有設定に追加しないでください。

```bash
# DB のみ起動（既存の PostgreSQL を使う場合は不要）
pnpm docker:dev
# DB が接続可能になったら Next.js を起動
pnpm dev
```

画面は http://localhost:3000 です。Compose は `init.sql` を初回の空ボリュームに適用します。既存 DB のスキーマ更新は別途適用してください。`init.sql` の再実行では既存データ・IDを保持し、サンプルメモは自動追加しません。

## 認証とデータの範囲

`.env.local` の `AUTH_GITHUB_ID` と `AUTH_GITHUB_SECRET` が両方未設定なら、`owner_id = null` のローカル共有メモを利用します。認証情報のどちらかを設定すると認証が有効になり、未ログインのままメモを操作できません。ログインユーザーごとのメモと共有メモは分離されています。

GitHub ログインを使う場合は OAuth App を作成し、次を設定します。

| 変数 | 内容 |
| --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 32` などで生成するセッション用秘密値 |
| `AUTH_GITHUB_ID` | GitHub OAuth Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth Client Secret |
| `AUTH_TRUST_HOST` | 必要なホスト／プロキシ構成に応じて設定 |

ローカルの Homepage URL は `http://localhost:3000`、Callback URL は `http://localhost:3000/api/auth/callback/github` です。

## ビルド・検証

```bash
pnpm lint
pnpm build
pnpm start
```

`pnpm start` は `next start` です。通常の E2E は認証情報を未設定にした共有モードで、専用のテスト DB を使って実行します。

```bash
pnpm exec playwright install --with-deps chromium
pnpm build
pnpm test
# UI / ブラウザ表示
pnpm test --ui
pnpm test --headed
```

`playwright.config.ts` の `webServer` が `pnpm start` を起動するため、事前ビルドが必要です。現在有効なブラウザは Chromium。テストは `tests/*.spec.ts` にあります。

DB・セキュリティテストは、シェルに専用テスト DB の `DATABASE_URL` を設定して実行します。Next.js の `.env.local` が Node.js テストや Playwright 設定に自動で読み込まれることを前提にしないでください。

```bash
pnpm test:db
pnpm test:security
```

`test:db` は一時スキーマで初期化の再実行・データ保持を確認します。`test:security` はポート3001と専用スキーマを使い、認証・所有者分離・DB障害からの回復を確認します。事前ビルドが必要です。設定は [playwright.security.config.ts](playwright.security.config.ts) と [tests-security/setup.ts](tests-security/setup.ts) を参照してください。

## API

| メソッド | パス | 処理 |
| --- | --- | --- |
| GET | `/api/todos` | アクセス可能な所有者の Todo 一覧 |
| POST | `/api/todos` | Todo 作成 |
| PUT | `/api/todos/[id]` | Todo 更新 |
| DELETE | `/api/todos/[id]` | Todo 削除 |

Todo API は `ApiResponse<T>` を返します。認証のルートは `src/app/api/auth/[...nextauth]/route.ts`、アクセス判定は `src/lib/todo-access.ts` にあります。

## 主なファイル

| ファイル・ディレクトリ | 役割 |
| --- | --- |
| `src/app/page.tsx` | Suspense 内の初期データ取得・エラー表示 |
| `src/components/` | Todo UI、テーマ切替、再試行の表示 |
| `src/auth.ts` / `src/lib/todo-access.ts` | 認証と所有者判定 |
| `src/lib/db.ts` | PostgreSQL の接続プール |
| `src/context/themeContext.tsx` | テーマ状態 |
| `src/types/type.ts` | 共有型 |
| `tests/` / `tests-db/` / `tests-security/` | E2E・DB・セキュリティ検証 |
| `next.config.ts` | Next.js・Tailwind の設定 |
| `init.sql` | DB 初期化・スキーマ |

## Docker

開発用の DB は [docker-compose.dev.yml](docker-compose.dev.yml)、アプリと DB の本番用構成は [docker-compose.prod.yml](docker-compose.prod.yml) です。

```bash
pnpm docker:logs
pnpm postgres:logs
pnpm docker:ps
pnpm dev:down
```

現在の `Dockerfile` は `.next/standalone` をコピーしますが、`next.config.ts` に `output: "standalone"` がありません。このため、現状の `pnpm docker:prod` をそのまま使える本番起動手順として扱えません。Docker を使う前に、standalone 出力と Dockerfile の整合性を修正し、ビルド・起動を確認する必要があります。

本番 Compose を使う場合、DB ホストは内部サービス名 `postgres`、`NODE_ENV` は `production` にし、認証変数も Compose の環境へ渡します。Compose の `--env-file .env` は Next.js の `.env.local` を自動的に代用しません。ビルド引数に秘密値を渡す場合も、最終成果物に残らないと決めつけないでください。

PostgreSQL 18 の名前付きボリュームはデータを保持します。停止コマンドはデータ削除を行いません。17以前のデータボリュームをそのまま共有せず、データの移行を別途行ってください。

## トラブルシューティング

- DB 接続失敗：DB の起動状態、ポート5432、`DATABASE_URL` と `POSTGRES_*` の一致を確認します。
- GitHub ログイン失敗：認証変数がすべて設定され、Callback URL が一致しているか確認します。
- メモが見えない：共有モードとログインユーザーのメモは分離されています。認証状態を確認します。

CI の実行手順・必要な Secrets は [.github/workflows/node.js.yml](.github/workflows/node.js.yml)、開発ルールは [AGENTS.md](AGENTS.md) を参照してください。

## 型チェック

```bash
pnpm typecheck
```

`next typegen` でルート型と `next-env.d.ts` を生成し、`tsc --noEmit` で型を検証します。CI でもビルド前に同じコマンドを実行します。
