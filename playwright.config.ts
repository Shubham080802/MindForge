import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseUrl || "http://localhost:3003";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    headless: true,
    trace: "on-first-retry",
  },
  webServer: externalBaseUrl ? undefined : {
    command: "corepack pnpm dev --port 3003",
    url: baseURL,
    env: {
      NEXTAUTH_URL: baseURL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "playwright-only-secret-that-is-longer-than-thirty-two-characters",
    },
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
