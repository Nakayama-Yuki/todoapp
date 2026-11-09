"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function LoadError() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">メモアプリ (PostgreSQL版)</h1>
      <p role="alert" className="my-4">
        メモを読み込めませんでした。時間をおいて再試行してください。
      </p>
      <button
        onClick={() => startTransition(() => router.refresh())}
        disabled={isPending}
        className="rounded bg-blue-600 p-2 text-white disabled:opacity-50"
      >
        {isPending ? "読み込み中..." : "再試行"}
      </button>
    </main>
  );
}
