import { test, expect } from "@playwright/test";
import {
  setupPage,
  createTodo,
  deleteTodo,
  editTodo,
  toggleTodo,
  generateTodoText,
} from "./helpers";

test.describe("Integration Tests", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("creates and deletes multiple todos in sequence", async ({ page }) => {
    const todos: string[] = [];

    // 複数のTodoを連続して作成
    for (let i = 1; i <= 5; i++) {
      const todoText = generateTodoText(`Batch Todo ${i}`);
      todos.push(todoText);
      await createTodo(page, todoText);
    }

    // すべてのTodoが作成されていることを確認
    for (const todoText of todos) {
      const item = page.locator("li", { hasText: todoText });
      await expect(item).toBeVisible();
    }

    // すべてのTodoを削除
    for (const todoText of todos) {
      const item = page.locator("li", { hasText: todoText });
      await deleteTodo(item);
    }
  });

  test("complete end-to-end user flow: create → edit → toggle → delete", async ({
    page,
  }) => {
    // ステップ1: Todoを作成
    const todoText = generateTodoText("E2E Flow");
    let item = await createTodo(page, todoText);
    await expect(item).toBeVisible();

    // ステップ2: Todoを編集
    const editedText = `${todoText} - edited`;
    item = await editTodo(item, editedText);
    await expect(item).toContainText("- edited");

    // ステップ3: Todoを完了状態にする
    const checkbox = await toggleTodo(item);
    await expect(checkbox).toBeChecked();

    // 完了状態のスタイルを確認
    const todoLabelAfterComplete = item.locator("label");
    const hasLineThrough = await todoLabelAfterComplete.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.textDecoration.includes("line-through");
    });
    expect(hasLineThrough).toBe(true);

    // ステップ4: 完了状態のまま再度編集
    const finalText = `${todoText} - final edit`;
    item = await editTodo(item, finalText);
    await expect(item).toContainText("- final edit");
    const todoLabelAfterEdit = item.locator("label");
    await expect(todoLabelAfterEdit).toBeVisible();

    // チェック状態が維持されていることを確認（編集後も完了状態を保持）
    const checkboxAfterEdit = item.getByRole("checkbox");
    await expect(checkboxAfterEdit).toBeChecked();

    // ステップ5: Todoを未完了に戻す
    await toggleTodo(item);
    await expect(checkboxAfterEdit).not.toBeChecked();

    // line-through が解除されることを確認
    const noLineThrough = await todoLabelAfterEdit.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return !style.textDecoration.includes("line-through");
    });
    expect(noLineThrough).toBe(true);

    // ステップ6: Todoを削除
    await deleteTodo(item);
  });
});
