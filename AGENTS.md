<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Todo App 開発ガイド

## 守る設計

- Next.js App Router、React、TypeScript、Tailwind v4、Auth.js、PostgreSQL を使用する。パッケージ管理は pnpm。
- 初期表示は [src/app/page.tsx](src/app/page.tsx) の Suspense / `TodosLoader`、操作は `src/components/HomeClient.tsx` と API Routes が担当する。
- サーバー処理とクライアントの状態・操作を分ける。Server Component から Client Component を直接インポートし、サーバー側で `ssr: false` を指定しない。
- 共有 UI は `src/components/`、テーマは `src/context/themeContext.tsx`、共有型は `src/types/type.ts` に置く。Props と戻り値の型を明確にし、strict 設定を維持する。

## 認証・所有者の分離

- 認証設定は [src/auth.ts](src/auth.ts)、アクセス判定は [src/lib/todo-access.ts](src/lib/todo-access.ts) に集約する。
- `getTodoAccess()` の結果が `null` なら未認証として扱う。認証有効時に共有メモへフォールバックしない。
- GitHub 認証情報が両方未設定なら `ownerId: null` のローカル共有モード。どちらか一方でも設定されると認証が有効になるため、設定漏れで共有モードへ戻さない。
- 初期表示・一覧・作成・更新・削除すべてで `access.ownerId` を使用する。所有者をクライアント入力から決めない。
- SQL の `owner_id IS NOT DISTINCT FROM $n::text` による所有者条件を保ち、他ユーザーと共有モードのメモを混在させない。
- Auth.js ハンドラーは `src/app/api/auth/[...nextauth]/route.ts`、ログイン導線は GitHub の `signIn` / `signOut`。クライアントには必要なセッション情報だけ渡す。

## API・データベース

- `GET /api/todos` は一覧、`POST /api/todos` は作成、`PUT /api/todos/[id]` は更新、`DELETE /api/todos/[id]` は削除。
- Todo API は `ApiResponse<T>`（`success`、`data?`、`error?`）を使用する。既存ハンドラーの認証・入力検証・HTTP ステータス・所有者条件に合わせる。
- DB 接続は `src/lib/db.ts` の `getDbPool()` を使い、SQL はパラメータ化する。クライアントから直接 DB を操作しない。
- DB の初期化・スキーマ変更は `init.sql` と関連型・テストに反映する。再実行で既存データ・IDを保持する設計を保つ。
- 初期データ取得の失敗時は `LoadError` の再試行導線を保つ。DB 障害で常駐サーバーを終了しない。

## 環境・検証

セットアップ、認証変数、Docker の条件は [README.md](README.md) を参照する。

```bash
pnpm lint
pnpm exec playwright install --with-deps chromium
pnpm build
pnpm test
pnpm test:db
pnpm test:security
```

- E2E は `tests/*.spec.ts`、DB テストは `tests-db/`、所有者分離などの検証は `tests-security/`。
- `playwright.config.ts` は `pnpm start` を起動するため事前ビルドが必要。通常 E2E は認証情報を未設定にした共有モードと、専用のテスト DB を使用する。
- DB・セキュリティテストはシェルの `DATABASE_URL` が必要。セキュリティテストの専用スキーマ・ポート・認証設定は `playwright.security.config.ts` と `tests-security/setup.ts` を参照する。
- 機能追加は対応する E2E、API・認証・DB 変更は関連する DB / セキュリティテストも実行する。未実行の確認は理由を報告する。
- CI の実行手順と Secrets は `.github/workflows/node.js.yml` を参照する。

## 文書の管理

セットアップと使い方は [README.md](README.md) を参照。開発時の指示はこのファイルで管理し、実装・設定・コマンドを変更した場合は関連する説明も更新する。依存バージョンとスクリプトは `package.json`、詳細設定は各設定ファイルを正とする。
