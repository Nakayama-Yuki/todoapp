import { FullConfig } from "@playwright/test";
import { readFile } from "node:fs/promises";
import pg from "pg";

export default async function setup(config: FullConfig) {
  const databaseUrl = config.webServer!.env!.DATABASE_URL;
  process.env.SECURITY_DATABASE_URL = databaseUrl;
  const schema = new URL(databaseUrl).searchParams.get("options")!.split("=")[1];
  if (!/^security_[a-f0-9]+$/.test(schema)) throw new Error("Invalid test schema");
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(await readFile("init.sql", "utf8"));
    await client.query("INSERT INTO todos (text) VALUES ('legacy-private-memo')");
  } finally {
    await client.end();
  }
  return async () => {
    const cleanup = new pg.Client({ connectionString: databaseUrl });
    await cleanup.connect();
    try { await cleanup.query(`DROP SCHEMA "${schema}" CASCADE`); }
    finally { await cleanup.end(); }
  };
}
