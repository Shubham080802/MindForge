import { expect, test } from "@playwright/test";

test("public product and legal routes are usable", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  await expect(page.getByRole("heading", { name: /understand your material/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an account" }).first()).toHaveAttribute("href", "/auth/signup");

  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();

  await page.goto("/security");
  await expect(page.getByRole("heading", { name: "Security", exact: true })).toBeVisible();
});

test("readiness is public and machine readable", async ({ request }) => {
  const response = await request.get("/api/health");
  expect([200, 503]).toContain(response.status());
  await expect(response.json()).resolves.toMatchObject({ checks: { database: expect.any(String), configuration: expect.any(String) } });
});
