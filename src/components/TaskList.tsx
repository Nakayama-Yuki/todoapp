import { useState } from "react";
import { TaskListProps } from "@/types/type";
import { useTheme } from "@/context/themeContext"; // 追加

/**
 * タスクリストを表示するコンポーネント
 * タスクの表示、完了状態の切り替え、編集、削除の機能を提供
 */
export default function TaskList({
  todos,
  toggleTodo,
  deleteTodo,
  updateTodo,
}: TaskListProps) {
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme(); // 追加

  // 編集ボタンがクリックされたときの関数
  function handleEdit(id: number, currentText: string) {
    setEditId(id);
    setEditText(currentText);
    setError(null); // エラーをクリア
  }

  // セーブボタンがクリックされたときの関数
  async function handleSave(id: number) {
    setIsSaving(true);
    setError(null);

    const success = await updateTodo(id, editText);

    setIsSaving(false);

    if (success) {
      // 成功時のみ編集モードを終了
      setEditId(null);
      setEditText("");
    } else {
      // 失敗時はエラー表示して編集モードを継続
      setError("保存に失敗しました。もう一度お試しください。");
    }
  }

  return (
    <ul>
      {todos.map((todo) => (
        <li
          key={todo.id}
          data-testid={`todo-item-${todo.id}`}
          className="mb-2 flex items-center gap-2 max-w-100"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="checkbox"
              className="shrink-0"
              onChange={() => toggleTodo(todo.id)}
              checked={todo.completed}
              disabled={editId === todo.id && isSaving}
            />
            {editId === todo.id ?
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="text"
                  aria-label="Todoを編集"
                  data-testid={`todo-edit-input-${todo.id}`}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  disabled={isSaving}
                  // テーマに応じたスタイルを適用
                  className={`border rounded p-1 flex-1 min-w-0 ${
                    theme === "dark" ?
                      "bg-gray-700 text-white border-gray-600"
                    : "bg-white text-gray-800 border-gray-300"
                  }`}
                />
                {error && editId === todo.id && (
                  <span className="text-red-500 text-sm">{error}</span>
                )}
              </div>
            : <label
                className={`cursor-pointer flex-1 min-w-0 wrap-break-word ${
                  todo.completed ? "line-through text-gray-500"
                  : theme === "dark" ? "text-white"
                  : "text-black"
                }`}
              >
                {todo.text}
              </label>
            }
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editId === todo.id ?
              <button
                onClick={() => handleSave(todo.id)}
                disabled={isSaving}
                className={`bg-green-600 text-white p-1 rounded-sm ${
                  isSaving ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSaving ? "保存中..." : "保存する"}
              </button>
            : <button
                onClick={() => handleEdit(todo.id, todo.text)}
                className="bg-yellow-600 text-white p-1 rounded-sm"
              >
                編集
              </button>
            }
            <button
              onClick={() => deleteTodo(todo.id)}
              disabled={editId === todo.id && isSaving}
              className={`bg-red-600 text-white p-1 rounded-sm ${
                editId === todo.id && isSaving ?
                  "opacity-50 cursor-not-allowed"
                : ""
              }`}
            >
              消す
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
