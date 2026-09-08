import { spawnSync } from "node:child_process";

const required = [
  "PLAYWRIGHT_BASE_URL",
  "E2E_EMAIL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
];
const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length) {
  console.error(`Authenticated staging checks require: ${missing.join(", ")}`);
  process.exit(1);
}

const result = spawnSync(
  "corepack",
  ["pnpm", "exec", "playwright", "test", "e2e/authenticated.spec.ts"],
  { env: process.env, stdio: "inherit" },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
