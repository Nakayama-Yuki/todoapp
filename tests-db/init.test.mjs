import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import pg from "pg";

test("schema initialization preserves todos, IDs and the update trigger on rerun", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  const schema = `init_test_${randomUUID().replaceAll("-", "")}`;
  const sql = await readFile(new URL("../init.sql", import.meta.url), "utf8");
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(sql);
    assert.equal((await client.query("SELECT * FROM todos")).rowCount, 0);
    const original = (await client.query(
      "INSERT INTO todos (text, completed, updated_at) VALUES ($1, true, '2000-01-01') RETURNING *",
      ["保持するメモ 😀"],
    )).rows;

    // Two reruns catch both destructive seeds and duplicate trigger errors.
    await client.query(sql);
    await client.query(sql);
    assert.deepEqual((await client.query("SELECT * FROM todos")).rows, original);
    const next = (await client.query(
      "INSERT INTO todos (text) VALUES ('次のメモ') RETURNING id",
    )).rows[0];
    assert.ok(next.id > original[0].id, "sequence must not be reset");
    const updated = (await client.query(
      "UPDATE todos SET text = '更新したメモ' WHERE id = $1 RETURNING updated_at",
      [original[0].id],
    )).rows[0];
    assert.ok(updated.updated_at > original[0].updated_at);
  } finally {
    await client.query("ROLLBACK");
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});

test("migration keeps legacy data unassigned and preserves owner IDs on rerun", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  const schema = `migration_test_${randomUUID().replaceAll("-", "")}`;
  const sql = await readFile(new URL("../init.sql", import.meta.url), "utf8");
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(`CREATE TABLE todos (
      id SERIAL PRIMARY KEY, text VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    const { rows: [legacy] } = await client.query(
      "INSERT INTO todos (text, completed) VALUES ('legacy', true) RETURNING *",
    );
    await client.query(sql);
    assert.deepEqual((await client.query("SELECT * FROM todos")).rows, [{ ...legacy, owner_id: null }]);
    await client.query("UPDATE todos SET owner_id = $1 WHERE id = $2", ["github:123", legacy.id]);
    await client.query(sql);
    assert.equal((await client.query("SELECT owner_id FROM todos WHERE id = $1", [legacy.id])).rows[0].owner_id, "github:123");
  } finally {
    await client.query("ROLLBACK");
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});
