import { expect, test } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";

test("authenticated learner can create and manage a study session", async ({ page }) => {
  const studySource = process.env.E2E_UPLOAD_PATH || {
    name: "biology.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Mitochondria convert chemical energy into ATP."),
  };

  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.E2E_EMAIL! });

  await page.goto("/settings");
  await expect(page.getByRole("link", { name: "Back to workspace" })).toBeVisible();
  await expect(page.getByLabel("Explanation language")).toHaveCount(0);
  await page.getByRole("link", { name: "Back to workspace" }).click();
  await expect(page).toHaveURL(/\/workspace/);

  const workspaceLanguagePicker = page.getByLabel("Explanation language");
  await expect(workspaceLanguagePicker).toBeVisible();
  await workspaceLanguagePicker.selectOption("hi");
  await expect(workspaceLanguagePicker).toHaveValue("hi");
  await workspaceLanguagePicker.selectOption("en");

  await page.getByLabel("Your Question / Topic").fill("Explain this short biology note");
  await page.getByLabel("Attach Files (Optional)").setInputFiles(studySource);

  await page.getByRole("button", { name: "New Session" }).click();
  await expect(page.getByRole("status")).toHaveText(/new session ready/i);
  await expect(page.getByLabel("Your Question / Topic")).toHaveValue("");
  await expect(page.getByText(process.env.E2E_UPLOAD_PATH ? "ML GFG.pdf" : "biology.txt")).toHaveCount(0);

  await page.getByLabel("Your Question / Topic").fill("Explain this short biology note");
  await page.getByLabel("Attach Files (Optional)").setInputFiles(studySource);
  const analyzeButton = page.getByRole("button", { name: "Analyze & Start Session" });
  await expect(analyzeButton, "Study services must be healthy before the authenticated journey can continue").toBeEnabled({ timeout: 5_000 });
  await analyzeButton.click();
  await expect(page).toHaveURL(/\/workspace\//);

  const languagePicker = page.getByLabel("Explanation language");
  await expect(languagePicker).toBeVisible();
  await expect(languagePicker).toContainText("English");
  await expect(languagePicker).toContainText("Hindi");
  await expect(languagePicker).toContainText("Spanish (Latin America)");
  await expect(languagePicker).toContainText("Latin");
  await languagePicker.selectOption("hi");
  await expect(languagePicker).toHaveValue("hi");
  await languagePicker.selectOption("en");

  await page.getByRole("button", { name: "New Session" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByRole("heading", { name: "New Study Session" })).toBeVisible();

  await page.goto("/library");
  await expect(page.getByText("Explain this short biology note")).toBeVisible();
});
