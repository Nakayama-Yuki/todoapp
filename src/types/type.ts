export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  created_at?: string; // データベースのタイムスタンプ
  updated_at?: string; // データベースのタイムスタンプ
}

export interface TaskListProps {
  todos: Todo[];
  pendingToggleIds: ReadonlySet<number>;
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => void;
  updateTodo: (id: number, newText: string) => Promise<boolean>;
}

export interface AddTaskProps {
  input: string;
  setInput: (input: string) => void;
  addTodo: () => Promise<void>;
}

export interface ChangeThemeProps {
  toggleTheme: () => void;
}

// API レスポンス用の型定義
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Todo作成時のリクエスト型
export interface CreateTodoRequest {
  text: string;
}

// Todo更新時のリクエスト型
export interface UpdateTodoRequest {
  text?: string;
  completed?: boolean;
}
