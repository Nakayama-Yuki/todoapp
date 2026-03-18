import { test, expect } from "@playwright/test";
import { setupPage, createTodo, deleteTodo, generateTodoText } from "./helpers";

test.describe("Theme Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("toggles between light and dark theme", async ({ page }) => {
    // テーマ切り替えボタンを取得
    const themeToggleButton = page.getByRole("button", {
      name: "テーマを切り替える",
    });
    await expect(themeToggleButton).toBeVisible();

    // コンテナ要素を取得（HomeClientのメインdiv）
    const container = page.locator("div.min-h-screen").first();

    // 初期状態: ライトテーマ（bg-white）
    await expect(container).toHaveClass(/bg-white/);
    await expect(container).toHaveClass(/text-black/);

    // ダークテーマに切り替え
    await themeToggleButton.click();
    await expect(container).toHaveClass(/bg-gray-800/);
    await expect(container).toHaveClass(/text-white/);

    // ライトテーマに戻す
    await themeToggleButton.click();
    await expect(container).toHaveClass(/bg-white/);
    await expect(container).toHaveClass(/text-black/);
  });

  test("applies theme to all components", async ({ page }) => {
    const themeToggleButton = page.getByRole("button", {
      name: "テーマを切り替える",
    });

    // Todoを1つ作成
    const todoText = generateTodoText("Theme Test");
    const item = await createTodo(page, todoText);

    // 編集モードに入る
    await item.getByRole("button", { name: "編集" }).click();
    const editInput = item.getByRole("textbox", { name: "Todoを編集" });
    await expect(editInput).toBeVisible();

    // ライトテーマでの編集入力のスタイルを確認
    await expect(editInput).toHaveClass(/bg-white/);
    await expect(editInput).toHaveClass(/text-gray-800/);

    // ダークテーマに切り替え
    await themeToggleButton.click();

    // ダークテーマでの編集入力のスタイルを確認
    await expect(editInput).toHaveClass(/bg-gray-700/);
    await expect(editInput).toHaveClass(/text-white/);

    // 編集をキャンセル（保存しない場合は他のTodoの編集ボタンをクリック、または削除）
    // ここでは編集モードから抜けるために保存する
    await editInput.fill(todoText); // 元のテキストで保存
    await item.getByRole("button", { name: "保存する" }).click();

    // ライトテーマに戻す
    await themeToggleButton.click();
    const container = page.locator("div.min-h-screen").first();
    await expect(container).toHaveClass(/bg-white/);

    await deleteTodo(item);
  });
});
