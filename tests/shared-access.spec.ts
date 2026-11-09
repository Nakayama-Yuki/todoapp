import { test, expect } from "@playwright/test";
import pg from "pg";

test("shared mode cannot read or modify personally owned memos", async ({ request, page }) => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const text = `private-shared-check-${Date.now()}`;
  let id: number | undefined;
  try {
    const { rows } = await client.query("INSERT INTO todos (text, owner_id) VALUES ($1, 'github:private-test') RETURNING id", [text]);
    id = rows[0].id;
    const list = await (await request.get("/api/todos")).json();
    expect(list.data.some((todo: { id: number }) => todo.id === id)).toBe(false);
    expect((await request.put(`/api/todos/${id}`, { data: { text: "forbidden" } })).status()).toBe(404);
    expect((await request.delete(`/api/todos/${id}`)).status()).toBe(404);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "メモアプリ (PostgreSQL版)" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(text);
  } finally {
    if (id !== undefined) await client.query("DELETE FROM todos WHERE id = $1", [id]);
    await client.end();
  }
});
