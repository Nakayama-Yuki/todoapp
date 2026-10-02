import { Suspense } from "react";
import { connection } from "next/server";
import { Todo } from "@/types/type";
import HomeClient from "@/components/HomeClient";
import LoadingFallback from "@/components/LoadingFallback";
import { getDbPool } from "@/lib/db";
import { auth, isAuthEnabled } from "@/auth";

// DB から Todo リストを取得する関数
async function fetchTodos(): Promise<Todo[]> {
  try {
    const pool = getDbPool();
    const result = await pool.query(
      "SELECT id, text, completed, created_at FROM todos ORDER BY created_at DESC",
    );

    return result.rows.map((row) => ({
      id: row.id,
      text: row.text,
      completed: row.completed,
      created_at: row.created_at.toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching todos:", error);
    return [];
  }
}

// Todo リストを取得して HomeClient に渡すコンポーネント
async function TodosLoader() {
  await connection();
  const [initialTodos, session] = await Promise.all([
    fetchTodos(),
    isAuthEnabled ? auth() : Promise.resolve(null),
  ]);
  const userName = session?.user?.name ?? session?.user?.email ?? null;

  return (
    <HomeClient
      initialTodos={initialTodos}
      isAuthEnabled={isAuthEnabled}
      isAuthenticated={!!session?.user}
      userName={userName}
    />
  );
}

// メインのページコンポーネント
export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TodosLoader />
    </Suspense>
  );
}
