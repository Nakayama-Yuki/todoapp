import { test, expect } from "@playwright/test";

test.describe("API 入力バリデーション", () => {
  test("POST: 不正な JSON は 400", async ({ request }) => {
    const res = await request.post("/api/todos", {
      headers: { "Content-Type": "application/json" },
      data: "{not json",
    });
    expect(res.status()).toBe(400);
  });

  test("POST: text が文字列以外 / 空 / 255 文字超は 400", async ({
    request,
  }) => {
    for (const text of [123, null, "   ", "a".repeat(256)]) {
      const res = await request.post("/api/todos", { data: { text } });
      expect(res.status()).toBe(400);
      expect((await res.json()).success).toBe(false);
    }
  });

  test("PUT: 不正な ID は 400", async ({ request }) => {
    for (const id of ["1abc", "0", "-1", "1.5", "99999999999"]) {
      const res = await request.put(`/api/todos/${id}`, {
        data: { completed: true },
      });
      expect(res.status()).toBe(400);
    }
  });

  test("PUT: 不正なボディは 400、存在しない ID は 404", async ({ request }) => {
    const created = await request.post("/api/todos", {
      data: { text: `validation ${Date.now()}` },
    });
    const { id } = (await created.json()).data;

    for (const data of [{}, { text: "" }, { text: 1 }, { completed: "yes" }]) {
      const res = await request.put(`/api/todos/${id}`, { data });
      expect(res.status()).toBe(400);
    }

    const ok = await request.put(`/api/todos/${id}`, {
      data: { completed: true },
    });
    expect(ok.status()).toBe(200);

    expect(
      (await request.put("/api/todos/2147483647", { data: { completed: true } }))
        .status(),
    ).toBe(404);

    await request.delete(`/api/todos/${id}`);
  });

  test("DELETE: 不正な ID は 400", async ({ request }) => {
    const res = await request.delete("/api/todos/abc");
    expect(res.status()).toBe(400);
  });
});
