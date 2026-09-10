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

  const chatInput = page.getByPlaceholder(/Ask Professor MindForge/);
  await chatInput.fill("How is the weather today?");
  await chatInput.press("Enter");
  await expect(page.getByText(/MindForge is a study-only workspace/)).toBeVisible();
  await expect(page.getByText("How is the weather today?", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "New Session" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByRole("heading", { name: "New Study Session" })).toBeVisible();

  await page.goto("/library");
  await expect(page.getByText("Explain this short biology note")).toBeVisible();
});

/**
 * The launch gate requires one automated run of the value-delivering journey,
 * not only the navigational shell: a grounded answer, a generated study tool,
 * a real export download, deletion, and sign-out.
 */
test("authenticated learner completes the full study journey and leaves cleanly", async ({ page }) => {
  test.setTimeout(240_000);

  const studySource = process.env.E2E_UPLOAD_PATH || {
    name: "biology.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "Mitochondria convert chemical energy into ATP through oxidative phosphorylation. "
      + "The electron transport chain sits in the inner mitochondrial membrane.",
    ),
  };
  const sessionTitle = `E2E study journey ${Date.now()}`;

  page.on("dialog", (dialog) => void dialog.accept());

  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.E2E_EMAIL! });

  await page.goto("/workspace");
  await page.getByLabel("Your Question / Topic").fill(sessionTitle);
  await page.getByLabel("Attach Files (Optional)").setInputFiles(studySource);

  const analyzeButton = page.getByRole("button", { name: "Analyze & Start Session" });
  await expect(analyzeButton, "Study services must be healthy before the authenticated journey can continue").toBeEnabled({ timeout: 5_000 });
  await analyzeButton.click();
  await expect(page).toHaveURL(/\/workspace\/[a-z0-9]+/, { timeout: 60_000 });

  // A grounded professor answer is the product's core promise.
  await page.getByPlaceholder(/Ask Professor MindForge/).fill("Explain how the uploaded material describes energy conversion.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("button", { name: "Copy response" }).first()).toBeVisible({ timeout: 120_000 });

  // Study tools must generate from the session's own materials.
  await page.getByRole("tab", { name: "Study Tools" }).click();
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.getByRole("button", { name: "Close study tool result" })).toBeVisible({ timeout: 120_000 });

  // Export must produce a real file, not just a request.
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Markdown/ }).click();
  const markdown = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of markdown) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString("utf8")).toContain(sessionTitle);

  // The learner can remove their own data and leave.
  await page.goto("/library");
  await expect(page.getByText(sessionTitle)).toBeVisible();
  await page.getByTitle("Delete").first().click();
  await expect(page.getByText(sessionTitle)).toHaveCount(0, { timeout: 30_000 });

  await page.getByRole("button", { name: "User menu" }).click();
  await page.getByRole("menuitem", { name: "Sign Out" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });

  const protectedResponse = await page.request.get("/api/sessions", { maxRedirects: 0 });
  expect(protectedResponse.status()).toBe(401);
});
