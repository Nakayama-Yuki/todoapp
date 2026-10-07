import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { Todo, ApiResponse } from "@/types/type";
import {
  errorResponse,
  readJsonObject,
  validateTodoText,
} from "@/lib/validation";

/**
 * GET /api/todos - 全てのTodoを取得
 */
export async function GET(): Promise<NextResponse<ApiResponse<Todo[]>>> {
  try {
    const pool = getDbPool();
    const result = await pool.query(
      "SELECT id, text, completed, created_at, updated_at FROM todos ORDER BY created_at DESC"
    );

    const todos: Todo[] = result.rows;

    return NextResponse.json({
      success: true,
      data: todos,
    });
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch todos",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/todos - 新しいTodoを作成
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Todo>>> {
  try {
    const body = await readJsonObject(request);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const validated = validateTodoText(body.text);
    if (!validated.ok) return errorResponse(validated.error, 400);

    const pool = getDbPool();
    const result = await pool.query(
      "INSERT INTO todos (text, completed) VALUES ($1, $2) RETURNING id, text, completed, created_at, updated_at",
      [validated.value, false]
    );

    const newTodo: Todo = result.rows[0];

    return NextResponse.json({
      success: true,
      data: newTodo,
    });
  } catch (error) {
    console.error("Error creating todo:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create todo",
      },
      { status: 500 }
    );
  }
}
