import { test, expect } from "@playwright/test";
import {
  setupPage,
  createTodo,
  deleteTodo,
  editTodo,
  generateTodoText,
} from "./helpers";

test.describe("Todo Edit Operations", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("edits todo text", async ({ page }) => {
    const todoText = generateTodoText("Playwright Edit");
    const item = await createTodo(page, todoText);

    const updatedText = `${todoText} - edited`;
    const updatedItem = await editTodo(item, updatedText);

    // 更新されたテキストが表示されることを確認
    await expect(updatedItem).toContainText("- edited");

    await deleteTodo(updatedItem);
  });

  test("edits todo multiple times", async ({ page }) => {
    const todoText = generateTodoText("Multiple Edits");
    let item = await createTodo(page, todoText);

    // 1回目の編集
    const firstEdit = `${todoText} - edit 1`;
    item = await editTodo(item, firstEdit);
    await expect(item).toContainText("- edit 1");

    // 2回目の編集
    const secondEdit = `${todoText} - edit 2`;
    item = await editTodo(item, secondEdit);
    await expect(item).toContainText("- edit 2");

    // 3回目の編集
    const thirdEdit = `${todoText} - final`;
    item = await editTodo(item, thirdEdit);
    await expect(item).toContainText("- final");

    await deleteTodo(item);
  });
});
