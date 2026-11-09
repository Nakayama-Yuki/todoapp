import { test, expect, BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";
import pg from "pg";

async function login(context: BrowserContext, user: string, maxAge = 3600) {
  const token = await encode({
    token: { sub: user, name: user },
    secret: "security-e2e-only-secret",
    salt: "authjs.session-token",
    maxAge,
  });
  await context.addCookies([{ name: "authjs.session-token", value: token, url: "http://localhost:3001", httpOnly: true, sameSite: "Lax" }]);
}

test("signed-out requests cannot read, create, update or delete; page asks for login", async ({ page, request }) => {
  for (const response of [
    await request.get("/api/todos"),
    await request.post("/api/todos", { data: { text: "forbidden" } }),
    await request.put("/api/todos/1", { data: { text: "forbidden" } }),
    await request.delete("/api/todos/1"),
  ]) expect(response.status()).toBe(401);
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("GitHubでログイン");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("legacy-private-memo");
});

test("invalid and expired sessions are rejected", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: "forged-token", url: "http://localhost:3001" }]);
  expect((await page.request.get("/api/todos")).status()).toBe(401);
  await login(context, "expired", -3600);
  expect((await page.request.get("/api/todos")).status()).toBe(401);
});

test("owners are isolated for API and server-rendered pages, including shared legacy memos", async ({ browser }) => {
  const alice = await browser.newContext();
  const bob = await browser.newContext();
  try {
    await login(alice, "alice");
    await login(bob, "bob");
    // The legacy row is retained, but neither signed-in user may claim it.
    expect((await alice.request.put("http://localhost:3001/api/todos/1", { data: { text: "claimed" } })).status()).toBe(404);
    expect((await alice.request.delete("http://localhost:3001/api/todos/1")).status()).toBe(404);
    const created = await alice.request.post("http://localhost:3001/api/todos", { data: { text: "alice-private-memo", owner_id: "github:bob" } });
    expect(created.status()).toBe(200);
    const { data: { id } } = await created.json();
    const aliceList = await (await alice.request.get("http://localhost:3001/api/todos")).json();
    expect(aliceList.data.map((todo: { text: string }) => todo.text)).toEqual(["alice-private-memo"]);
    expect((await (await bob.request.get("http://localhost:3001/api/todos")).json()).data).toEqual([]);
    for (const data of [{ text: "stolen" }, { completed: true }]) {
      expect((await bob.request.put(`http://localhost:3001/api/todos/${id}`, { data })).status()).toBe(404);
    }
    expect((await bob.request.delete(`http://localhost:3001/api/todos/${id}`)).status()).toBe(404);
    const bobPage = await bob.newPage();
    await bobPage.goto("http://localhost:3001");
    await expect(bobPage.locator("body")).not.toContainText("alice-private-memo");
    await expect(bobPage.locator("body")).not.toContainText("legacy-private-memo");
    const alicePage = await alice.newPage();
    await alicePage.goto("http://localhost:3001");
    await expect(alicePage.locator("li")).toContainText("alice-private-memo");
    expect((await alice.request.put(`http://localhost:3001/api/todos/${id}`, { data: { text: "updated", completed: true } })).status()).toBe(200);
    expect((await alice.request.delete(`http://localhost:3001/api/todos/${id}`)).status()).toBe(200);
  } finally {
    await alice.close();
    await bob.close();
  }
});

test("database failure displays an alert instead of zero memos and retry recovers", async ({ context, page }) => {
  await login(context, "recovery");
  const created = await page.request.post("/api/todos", { data: { text: "recovered-memo" } });
  expect(created.status()).toBe(200);
  const { data: { id } } = await created.json();
  const client = new pg.Client({ connectionString: process.env.SECURITY_DATABASE_URL });
  await client.connect();
  try {
    await client.query("ALTER TABLE todos RENAME TO todos_unavailable");
    try {
      await page.goto("/");
      await expect(page.getByRole("alert").filter({ hasText: "メモを読み込めませんでした" })).toContainText("メモを読み込めませんでした");
      await expect(page.getByRole("textbox")).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText("合計: 0件");
      expect((await page.request.get("/api/todos")).status()).toBe(500);
    } finally {
      await client.query("ALTER TABLE todos_unavailable RENAME TO todos");
    }
    await page.getByRole("button", { name: "再試行" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "メモを読み込めませんでした" })).toHaveCount(0);
    await expect(page.locator("li")).toContainText("recovered-memo");
    expect((await page.request.delete(`/api/todos/${id}`)).status()).toBe(200);
  } finally {
    await client.end();
  }
});
