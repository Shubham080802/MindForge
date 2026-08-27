import { test, expect, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

// 1x1 transparent PNG
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

const pngPath = join(__dirname, "fixture.png");
writeFileSync(pngPath, Buffer.from(PNG_BASE64, "base64"));

async function openFirstSubject(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Open Workspace" }).first().click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.locator(".subject-select").first().click();
  await expect(page.locator(".workspace-center")).toBeVisible();
}

test("demo: chat, image upload, quiz, and persistence", async ({ page }) => {
  await openFirstSubject(page);

  // 1. Send a text message and get an assistant reply
  await page.fill("#prompt-input", "Explain the key concepts simply.");
  await page.getByRole("button", { name: "Ask Tutor" }).click();
  await expect(page.locator(".message-user")).toHaveCount(1);
  await expect(page.locator(".message-assistant")).toHaveCount(1);

  // 2. Attach an image, see preview, send, see it rendered
  await page.locator('.attach-button input[type="file"]').setInputFiles(pngPath);
  await expect(page.locator(".image-preview")).toBeVisible();
  await page.getByRole("button", { name: "Ask Tutor" }).click();
  await expect(page.locator(".message-image").first()).toBeVisible();

  // 3. Generate practice questions
  await page.getByRole("button", { name: "Generate 5 Questions" }).click();
  await expect(page.locator(".quiz-card")).toHaveCount(5);

  // 4. Answer one question and evaluate
  await page.locator(".quiz-input").first().fill("A clear, concise answer.");
  await page.getByRole("button", { name: "Check Answer" }).first().click();
  await expect(page.locator(".eval-result").first()).toBeVisible();

  // 5. Persistence: reload, reselect subject, chat should return
  const beforeCount = await page.locator(".message").count();
  await page.reload();
  await page.locator(".subject-select").first().click();
  await expect(page.locator(".message")).toHaveCount(beforeCount);
});

test("demo: create and delete a subject", async ({ page }) => {
  await openFirstSubject(page);

  const initial = await page.locator(".subject-item").count();
  await page.fill("#subject-name", "Test Subject E2E");
  await page.getByRole("button", { name: "Create Subject" }).click();
  await expect(page.locator(".subject-item")).toHaveCount(initial + 1);

  // Delete the newly created subject via the confirm modal
  await page.locator(".subject-item").first().hover();
  await page.locator(".subject-delete").first().click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator(".subject-item")).toHaveCount(initial);
});
