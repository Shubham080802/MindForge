import { expect, test } from "@playwright/test";

test("authenticated learner can create and manage a study session", async ({ page }) => {
  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/workspace/);

  await page.getByLabel("Your Question / Topic").fill("Explain this short biology note");
  await page.getByLabel("Attach Files (Optional)").setInputFiles({
    name: "biology.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Mitochondria convert chemical energy into ATP."),
  });
  await page.getByRole("button", { name: "Analyze & Start Session" }).click();
  await expect(page).toHaveURL(/\/workspace\//);

  await page.goto("/library");
  await expect(page.getByText("Explain this short biology note")).toBeVisible();
});
