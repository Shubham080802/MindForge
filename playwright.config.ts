import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseUrl || "http://localhost:3003";
const authenticatedRun = Boolean(process.env.E2E_EMAIL);

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
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: authenticatedRun
    ? [
        { name: "clerk-setup", testMatch: /clerk\.setup\.ts/ },
        {
          name: "chromium",
          dependencies: ["clerk-setup"],
          use: { ...devices["Desktop Chrome"] },
        },
      ]
    : [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
