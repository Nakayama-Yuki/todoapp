import { test, expect } from "@playwright/test";
import { createTodo, deleteTodo, setupPage, generateTodoText } from "./helpers";

function createRequestGate() {
  let markStarted!: () => void;
  let release!: () => void;

  return {
    started: new Promise<void>((resolve) => {
      markStarted = resolve;
    }),
    request: new Promise<void>((resolve) => {
      release = resolve;
    }),
    markStarted: () => markStarted(),
    release: () => release(),
  };
}

test.describe("Optimistic todo updates", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("shows a new todo before the create request completes", async ({
    page,
  }) => {
    const text = generateTodoText("Optimistic add");
    const gate = createRequestGate();

    await page.route("/api/todos", async (route) => {
      gate.markStarted();
      await gate.request;
      await route.continue();
    });

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/todos") &&
        response.request().method() === "POST",
    );
    await page.getByRole("textbox").first().fill(text);
    await page.getByRole("button", { name: "追加する" }).click();
    await gate.started;

    const item = page.locator("li").filter({ hasText: text }).first();
    await expect(item).toBeVisible();

    gate.release();
    expect((await responsePromise).status()).toBe(200);
    await expect(item).toBeVisible();
    await page.unroute("/api/todos");
    await deleteTodo(item);
  });

  test("rolls back an optimistic add when the request fails", async ({
    page,
  }) => {
    const text = generateTodoText("Optimistic rollback");
    const gate = createRequestGate();

    await page.route("/api/todos", async (route) => {
      gate.markStarted();
      await gate.request;
      await route.abort();
    });

    await page.getByRole("textbox").first().fill(text);
    await page.getByRole("button", { name: "追加する" }).click();
    await gate.started;
    const item = page.locator("li").filter({ hasText: text }).first();
    await expect(item).toBeVisible();

    gate.release();
    await expect(item).not.toBeVisible();
    await expect(page.getByText("Todoの追加に失敗しました")).toBeVisible();
    await page.unroute("/api/todos");
  });

  test("shows a completion toggle before the update request completes", async ({
    page,
  }) => {
    const item = await createTodo(page, generateTodoText("Optimistic toggle"));
    const id = (await item.getAttribute("data-testid"))!.replace(
      "todo-item-",
      "",
    );
    const checkbox = item.getByRole("checkbox");
    const gate = createRequestGate();

    await page.route(`/api/todos/${id}`, async (route) => {
      gate.markStarted();
      await gate.request;
      await route.continue();
    });

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/todos/${id}`) &&
        response.request().method() === "PUT",
    );
    await checkbox.click();
    await gate.started;
    await expect(checkbox).toBeChecked();

    gate.release();
    expect((await responsePromise).status()).toBe(200);
    await page.unroute(`/api/todos/${id}`);
    await deleteTodo(item);
  });

  test("shows an edited todo before the update request completes", async ({
    page,
  }) => {
    const item = await createTodo(page, generateTodoText("Optimistic edit"));
    const id = (await item.getAttribute("data-testid"))!.replace(
      "todo-item-",
      "",
    );
    const newText = generateTodoText("Updated optimistically");
    const gate = createRequestGate();

    await page.route(`/api/todos/${id}`, async (route) => {
      gate.markStarted();
      await gate.request;
      await route.continue();
    });

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/todos/${id}`) &&
        response.request().method() === "PUT",
    );
    await item.getByRole("button", { name: "編集" }).click();
    await item.getByRole("textbox", { name: "Todoを編集" }).fill(newText);
    await item.getByRole("button", { name: "保存する" }).click();
    await gate.started;
    await expect(item.getByText(newText, { exact: true })).toBeVisible();

    gate.release();
    expect((await responsePromise).status()).toBe(200);
    await page.unroute(`/api/todos/${id}`);
    await deleteTodo(item);
  });

  test("hides a deleted todo before the delete request completes", async ({
    page,
  }) => {
    const item = await createTodo(page, generateTodoText("Optimistic delete"));
    const id = (await item.getAttribute("data-testid"))!.replace(
      "todo-item-",
      "",
    );
    const gate = createRequestGate();

    await page.route(`/api/todos/${id}`, async (route) => {
      gate.markStarted();
      await gate.request;
      await route.continue();
    });

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/todos/${id}`) &&
        response.request().method() === "DELETE",
    );
    await item.getByRole("button", { name: "消す" }).click();
    await gate.started;
    await expect(item).not.toBeVisible();

    gate.release();
    expect((await responsePromise).status()).toBe(200);
    await page.unroute(`/api/todos/${id}`);
  });
});
