import { defineConfig, devices } from "@playwright/test";
import { randomUUID } from "node:crypto";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const database = new URL(process.env.DATABASE_URL);
database.searchParams.set("options", `-c search_path=security_${randomUUID().replaceAll("-", "")}`);

export default defineConfig({
  testDir: "./tests-security",
  globalSetup: "./tests-security/setup.ts",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://localhost:3001", ...devices["Desktop Chrome"] },
  webServer: {
    command: "pnpm start --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    env: {
      DATABASE_URL: database.toString(),
      AUTH_SECRET: "security-e2e-only-secret",
      AUTH_TRUST_HOST: "true",
      AUTH_GITHUB_ID: "security-e2e-client",
      AUTH_GITHUB_SECRET: "security-e2e-provider-secret",
    },
  },
});
