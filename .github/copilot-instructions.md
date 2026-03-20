<!-- .github直下にあるcopilot-instructions.mdはすべてのチャットに自動的に適用される -->
<!-- 全体の指針になるinstructionsファイル -->

> Next.js のフレームワーク固有ルールは、まずルートの `AGENTS.md` と `node_modules/next/dist/docs/` を参照してください。
> このファイルは、その上に重ねるこのリポジトリ固有のガイドです。

# GitHub Copilot 用の Todo App ガイド

このドキュメントは、Next.js 16 + PostgreSQL Todo アプリケーションの アーキテクチャと規約を AI コーディング エージェントに案内します。

## 🏗️ アーキテクチャ概要

### 技術スタック

- **フロントエンド**: Next.js 16 (App Router)、React 19、TypeScript 5、Tailwind CSS v4
- **バックエンド**: Next.js API Routes (`/app/api/todos/`)
- **認証**: Auth.js (next-auth v5 beta) + GitHub OAuth (`/app/api/auth/[...nextauth]/`)
- **データベース**: PostgreSQL 17 (Docker)
- **テスト**: Playwright
- **パッケージマネージャー**: pnpm

### データフロー

1. **サーバーコンポーネント** (`src/app/page.tsx`): PostgreSQL からシングルトン プールを使用して初期 Todo を取得
2. **クライアントコンポーネント** (`src/components/HomeClient.tsx`): UI 状態とユーザー操作を管理
3. **API ルート** (`src/app/api/todos/route.ts`): REST エンドポイント経由で CRUD 操作を処理
4. **認証状態の取得** (`src/app/page.tsx`): `auth()` でセッションを取得し、クライアントへ認証状態を受け渡し
5. **データベース**: `src/lib/db.ts` で管理される PostgreSQL プール (シングルトン パターン)

### キーデザイン パターン

- **サーバー・クライアント分割**: 初期データはサーバー側で取得、更新操作はクライアント側の API 呼び出しで処理
- **シングルトン データベース プール**: `src/lib/db.ts` の `getDbPool()` で接続リークを防止
- **React Context**: `ThemeProvider` がアプリ全体を包含してグローバル テーマ状態を管理

## 📁 ディレクトリ構成

```
tests/              # プロジェクト直下のテストフォルダ
  example.spec.ts   # Playwright E2Eテスト
src/
  app/              # Next.js App Router (デフォルトではサーバー側でレンダリング)
    page.tsx        # サーバーコンポーネント - 初期 Todo を取得
    layout.tsx      # ThemeProvider を含むルート レイアウト
    api/
      auth/
        [...nextauth]/
          route.ts  # Auth.js ハンドラー (GET/POST)
      todos/
        route.ts    # CRUD エンドポイント (GET/POST/PATCH/DELETE)
        [id]/
          route.ts  # 単一 Todo 操作用の動的ルート
  auth.ts           # Auth.js 設定 (GitHub Provider)
  components/       # クライアントコンポーネント ("use client" ディレクティブ)
    HomeClient.tsx  # メイン クライアントコンポーネント (状態、インタラクティブ)
    TaskList.tsx    # Todo リストの表示・編集
    AddTask.tsx     # 新規 Todo 追加フォーム
    ChangeTheme.tsx # テーマ切り替えボタン
  context/
    themeContext.tsx # グローバル テーマ状態 + useTheme フック
  lib/
    db.ts          # PostgreSQL 接続プール (シングルトン)
  types/
    type.ts        # 集約 TypeScript インターフェース
```

## 🔧 開発ワークフロー

### ローカル開発

```bash
# 依存関係のインストール
pnpm install

# PostgreSQL を起動 (Docker)
pnpm run docker:dev

# Next.js 開発サーバーを起動 (ホットリロード)
pnpm dev

# テストを実行
pnpm test

# テストを UI モードで実行
pnpm test:ui

# テストをヘッドレスモードで実行
pnpm test:headless

# コード品質チェック
pnpm lint
```

### 環境設定

- **`.env`**: コミット対象の共有設定 (秘密情報なし)
- **`.env.local`**: ローカル上書き設定 (Git 除外、開発時はオプション)
- **DB必須変数**: `DATABASE_URL`、`POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`
- **認証変数**: `AUTH_SECRET`、`AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET`

### Docker 管理

- **開発環境**: `pnpm run docker:dev` (PostgreSQL のみ Docker で起動、Next.js はローカルで実行)
- **本番環境**: `pnpm run docker:prod` (PostgreSQL と Next.js の両方をコンテナで実行)
- **クリーンアップ**: `pnpm run dev:down` または `pnpm run prod:down`

## 📝 コード規約とパターン

### コンポーネント構成

- **サーバーコンポーネント** (App Router のデフォルト): データ取得、重い処理
- **クライアントコンポーネント** (`"use client"` ディレクティブ付き): インタラクティブ機能、状態管理、フック
- ルート固有のコンポーネントはそのルート フォルダ内に配置、共有コンポーネントは `src/components/` に配置

### API 設計

- **レスポンス形式**: すべてのエンドポイントが `ApiResponse<T>` ({success, data?, error?}) を返す
- **バリデーション**: POST/PATCH ハンドラーでの入力検証 (`route.ts` を参照)
- **エラーハンドリング**: 適切な HTTP ステータス コード (入力エラーは 400、サーバー エラーは 500) を返す

### TypeScript と命名規則

- すべてのコードで `strict: true` の TypeScript を使用
- **コンポーネント**: PascalCase (`UserCard.tsx`)
- **フック**: camelCase (`useTheme.ts`)
- **型**: `src/types/type.ts` の PascalCase インターフェース
- **ディレクトリ**: kebab-case (`api/todos/`、`route-groups/`)

### データベース アクセス

- 常に `src/lib/db.ts` の `getDbPool()` を使用 (シングルトン)
- プール設定: `max: 10`、`idleTimeoutMillis: 30000`、`connectionTimeoutMillis: 2000`
- SQL インジェクション防止のため、パラメータ化クエリを使用: `pool.query(sql, [param1, param2])`

## 🧪 テスト基準

### ファイル配置と実行

- **E2E テスト**: プロジェクト直下の `tests/` フォルダに配置
- **ファイル命名**: `*.spec.ts` パターン（例: `example.spec.ts`）
- **テストランナー**: Playwright（実際のブラウザを使用）
- **設定**: `playwright.config.ts` に基づく

### テストカバレッジと戦略

- **E2E テスト** (`example.spec.ts`): ブラウザ上での実際のユーザー操作をシミュレート
  - Todo の追加、編集、削除、完了状態の切り替え
  - テーマ切り替えなどの UI インタラクション
  - 複数ブラウザでのクロスブラウザテスト（Chromium、Firefox、WebKit）
- **統合テスト**: フロントエンドから API、データベースまでの完全なフローをテスト
- **視覚的回帰テスト**: スクリーンショット比較による UI の一貫性検証（オプション）

### テスト実行コマンド

```bash
pnpm test              # テストを実行
pnpm test:ui           # UI モードでテストを実行（対話的）
pnpm test:headless     # ヘッドレスモードでテストを実行（CI/CD）
```

### テスト環境の特性

- **実ブラウザ**: Chromium、Firefox、WebKit での実際のブラウザテスト
- **完全統合**: モックなし、実際の API とデータベースを使用
- **自動待機**: Playwright の自動待機機能により安定したテスト実行
- **デバッグ**: UI モードでのステップ実行とインスペクション機能

## 🚀 重要な実装ノート

### サーバーコンポーネントで Next.js の動的インポート (SSR 無効) を使用しない

❌ **間違い**: `next/dynamic({ ssr: false })` でクライアントコンポーネントをインポート  
✅ **正解**: クライアントコンポーネントを直接インポート

**例** (`src/app/page.tsx`):

```tsx
import HomeClient from "@/components/HomeClient"; // 直接インポート
import { auth } from "@/auth";
export default async function Home() {
  const todos = await fetchTodos(); // サーバー側での取得
  const session = await auth(); // サーバー側でセッション取得
  return (
    <HomeClient
      initialTodos={todos}
      isAuthenticated={!!session?.user}
      userName={session?.user?.name ?? session?.user?.email ?? null}
    />
  ); // プロップとして渡す
}
```

### クライアント・サーバー間 API 通信

更新操作は API ルートへのフェッチを使用 (直接的なデータベース呼び出しは不可):

```tsx
const response = await fetch("/api/todos", {
  method: "POST",
  body: JSON.stringify({ text: input }),
});
```

### Auth.js 認証パターン

- Auth.js の設定は `src/auth.ts` に集約する
- API ハンドラーは `src/app/api/auth/[...nextauth]/route.ts` で `handlers` を export する
- サーバーコンポーネントで `auth()` を使ってセッションを取得し、必要な最小情報のみクライアントへ渡す
- クライアントのログイン導線は `signIn("github")` / `signOut()` を使用する

### テーマ Context パターン

React Context でグローバル状態を管理 (`src/context/themeContext.tsx` を参照):

```tsx
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
```

## 🐳 Docker とデプロイメント

### マルチステージ ビルド

Dockerfile は複数段階ビルドを使用: `base` → `deps` → `builder` → `runner`

- イメージ サイズとレイヤー キャッシュ用に最適化
- pnpm、npm、yarn に対応

### CI/CD の環境変数

GitHub Actions には以下のシークレットが必要:

- `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`
- `AUTH_SECRET`、`AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET`
- `DATABASE_URL` はこれらの値から自動生成

## ❓ 変更の際の確認

**機能追加前**:

1. 類似パターンが既に存在するか確認 (例: `route.ts` の API エンドポイント)
2. コンポーネント構成を確認 (サーバー/クライアント分割)
3. テスト実行: `pnpm test:headless`

**データベース変更**:

- スキーマについて `init.sql` を更新
- TypeScript 型に変更を反映 (`src/types/type.ts`)

**新規 API エンドポイント**:

- 既存の `ApiResponse<T>` 形式に従う
- ハンドラーでバリデーションを追加
- 対応する `.test.ts` ファイルでテストカバレッジを追加

**新規コンポーネント**:

- 必要な場合のみクライアントコンポーネント (`"use client"`) にマーク
- サーバーコンポーネントをデフォルトのままに
- E2E テストは `tests/` フォルダに `.spec.ts` ファイルとして配置

## 🔐 GitHub Secrets と CI/CD パイプライン

### 環境変数の管理

- **ローカル開発** (`.env`): コミット対象、秘密情報なし、全環境で共通
- **GitHub Secrets**: CI/CD 実行時に `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`AUTH_SECRET`、`AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET` が必須
- **自動生成**: `DATABASE_URL` は GitHub Actions で `postgresql://$USER:$PASSWORD@localhost:5432/$DB` の形式で動的生成

### CI/CD ワークフロー (`.github/workflows/node.js.yml`)

- **トリガー**: main ブランチへの push / PR / merge_group
- **Service Containers**: PostgreSQL 17-alpine を起動（テスト実行中）
- **テスト**: `pnpm test:headless` で E2E テスト実行
- **リント**: `pnpm lint` でコード品質チェック
- **ビルド**: `pnpm build` で Next.js ビルド検証
- **Secrets**: Settings → Secrets and variables → Actions で `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`AUTH_SECRET`、`AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET` を設定
