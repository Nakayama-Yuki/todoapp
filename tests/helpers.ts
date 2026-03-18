import { Page, Locator, expect } from "@playwright/test";

/**
 * 共通のページセットアップ処理
 * 各テストの beforeEach で使用
 */
export async function setupPage(page: Page): Promise<void> {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "メモアプリ (PostgreSQL版)" }),
  ).toBeVisible();
}

/**
 * 新しいTodoを作成する
 * @param page - Playwrightのページオブジェクト
 * @param text - 作成するTodoのテキスト
 * @returns 作成されたTodoのLocator
 */
export async function createTodo(page: Page, text: string): Promise<Locator> {
  const input = page.getByRole("textbox").first();
  await input.fill(text);
  await page.getByRole("button", { name: "追加する" }).click();
  const item = page.locator("li", { hasText: text });
  await expect(item).toBeVisible();
  return item;
}

/**
 * Todoを削除する
 * @param item - 削除するTodoのLocator
 */
export async function deleteTodo(item: Locator): Promise<void> {
  await item.getByRole("button", { name: "消す" }).click();
  await expect(item).not.toBeVisible();
}

/**
 * Todoの完了状態を切り替える
 * @param item - 切り替えるTodoのLocator
 * @returns チェックボックスのLocator
 */
export async function toggleTodo(item: Locator): Promise<Locator> {
  const checkbox = item.getByRole("checkbox");
  await checkbox.click();
  return checkbox;
}

/**
 * Todoのテキストを編集する
 * @param item - 編集するTodoのLocator
 * @param newText - 新しいテキスト
 * @returns 更新されたTodoのLocator
 */
export async function editTodo(
  item: Locator,
  newText: string,
): Promise<Locator> {
  await item.getByRole("button", { name: "編集" }).click();

  const editInput = item.getByRole("textbox", { name: "Todoを編集" });
  await expect(editInput).toBeVisible();
  await editInput.fill(newText);

  await item.getByRole("button", { name: "保存する" }).click();
  await expect(item).toContainText(newText);
  return item;
}

/**
 * ページ上のすべてのTodoをカウントする
 * @param page - Playwrightのページオブジェクト
 * @returns Todo数
 */
export async function getTodoCount(page: Page): Promise<number> {
  const items = page.locator("ul li");
  return await items.count();
}

/**
 * タイムスタンプ付きのユニークなTodoテキストを生成する
 * @param prefix - プレフィックス文字列
 * @returns タイムスタンプ付きテキスト
 */
export function generateTodoText(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}
