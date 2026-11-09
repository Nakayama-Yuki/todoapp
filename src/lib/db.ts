import { Pool } from "pg";

// PostgreSQL接続プールの設定
// 本番環境でも効率的な接続管理のためにプールを使用
let pool: Pool;

/**
 * データベース接続プールを取得する関数
 * シングルトンパターンでプールを管理
 */
export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // 開発環境用の接続設定
      max: 10, // 最大接続数
      idleTimeoutMillis: 30000, // アイドルタイムアウト
      connectionTimeoutMillis: 2000, // 接続タイムアウト
    });

    // 接続エラーハンドリング
    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
      // アイドル接続の障害でサーバーを終了せず、次の要求で再接続する。
    });
  }

  return pool;
}

/**
 * データベース接続をテストする関数
 */
export async function testDbConnection(): Promise<boolean> {
  try {
    const pool = getDbPool();
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    console.log("Database connection successful");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}
