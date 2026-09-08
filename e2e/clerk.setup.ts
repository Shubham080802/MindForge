import { test as setup } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

setup.describe.configure({ mode: "serial" });

setup("obtain a Clerk testing token", async () => {
  await clerkSetup({
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
});
