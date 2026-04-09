import { test, expect } from "@playwright/test";

const TEST_CODE = "demo2025";

test.describe("Analysis page (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/IMMO-/i).fill(TEST_CODE);
    await page.getByRole("button", { name: /Get Started/i }).click();
    await page.waitForURL(/analyse|dashboard/, { timeout: 10000 });
  });

  test("analyse page loads with property input", async ({ page }) => {
    // Should land on the analyse page after login
    await expect(page).toHaveURL(/analyse|dashboard/);
    // A URL input or heading should be visible
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("can type a property URL into the input", async ({ page }) => {
    const urlInput = page
      .getByPlaceholder(/immoscout|immowelt|url|link/i)
      .first();
    await urlInput.fill("https://www.immoscout24.de/expose/12345");
    await expect(urlInput).toHaveValue("https://www.immoscout24.de/expose/12345");
  });
});
