import { Suspense } from "react";
import { connection } from "next/server";
import { Todo } from "@/types/type";
import HomeClient from "@/components/HomeClient";
import LoadingFallback from "@/components/LoadingFallback";
import { getDbPool } from "@/lib/db";
import { isAuthEnabled } from "@/auth";
import { getTodoAccess } from "@/lib/todo-access";
import LoadError from "@/components/LoadError";

// DB から Todo リストを取得する関数
async function fetchTodos(ownerId: string | null): Promise<Todo[]> {
  const result = await getDbPool().query(
    "SELECT id, text, completed, created_at, updated_at FROM todos WHERE owner_id IS NOT DISTINCT FROM $1::text ORDER BY created_at DESC",
    [ownerId],
  );
  return result.rows.map((row) => ({
    ...row,
    created_at: row.created_at?.toISOString(),
    updated_at: row.updated_at?.toISOString(),
  }));
}

async function TodosLoader() {
  await connection();
  const access = await getTodoAccess();
  let initialTodos: Todo[] = [];
  if (access) {
    try {
      initialTodos = await fetchTodos(access.ownerId);
    } catch (error) {
      console.error("Error fetching todos:", error);
      return <LoadError />;
    }
  }
  const session = access?.session;
  return (
    <HomeClient
      initialTodos={initialTodos}
      isAuthEnabled={isAuthEnabled}
      isAuthenticated={!!session?.user}
      userName={session?.user?.name ?? session?.user?.email ?? null}
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
