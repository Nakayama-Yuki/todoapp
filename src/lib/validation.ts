import { NextResponse } from "next/server";
import { ApiResponse } from "@/types/type";

// init.sql の todos.text (VARCHAR(255)) に合わせる
export const MAX_TODO_TEXT_LENGTH = 255;

export function errorResponse(
  error: string,
  status: number,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error }, { status });
}

/** 正の整数の ID のみ受け付ける ("1abc" や "1.5" は不可) */
export function parseTodoId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

/** JSON ボディをオブジェクトとして読み取る。不正な場合は null */
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return null;
    }
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Todo テキストを検証し、トリム済み文字列かエラーメッセージを返す */
export function validateTodoText(
  value: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "Todo text must be a string" };
  }
  const text = value.trim();
  if (text === "") {
    return { ok: false, error: "Todo text is required" };
  }
  if (text.length > MAX_TODO_TEXT_LENGTH) {
    return {
      ok: false,
      error: `Todo text must be ${MAX_TODO_TEXT_LENGTH} characters or less`,
    };
  }
  return { ok: true, value: text };
}
