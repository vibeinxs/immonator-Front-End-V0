import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders 3-line headline in EN", async ({ page }) => {
    await expect(page.getByText("Understand it simply.")).toBeVisible();
    await expect(page.getByText("Analyse it properly.")).toBeVisible();
    await expect(page.getByText("Manage it confidently.")).toBeVisible();
  });

  test("renders trust line", async ({ page }) => {
    await expect(page.getByText(/Independent analysis/)).toBeVisible();
  });

  test("renders analysis preview card on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByText("7.8")).toBeVisible();
    await expect(page.getByText(/Strong Buy/i)).toBeVisible();
    await expect(page.getByText("4.8%")).toBeVisible();
  });

  test("analysis preview card hidden on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    // Right panel uses md:flex so it is hidden (display:none) on mobile
    const card = page.locator(".md\:flex").first();
    await expect(card).toBeHidden();
  });

  test("switches to DE locale", async ({ page }) => {
    await page.getByRole("button", { name: /DE/i }).click();
    await expect(page.getByText("Einfach verstehen.")).toBeVisible();
    await expect(page.getByText("Richtig analysieren.")).toBeVisible();
  });

  test("shows beta code input and submit button", async ({ page }) => {
    await expect(page.getByPlaceholder(/IMMO-/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Get Started/i })).toBeVisible();
  });

  test("submit with empty code stays on login page", async ({ page }) => {
    await page.getByRole("button", { name: /Get Started/i }).click();
    await expect(page).toHaveURL(/login/);
  });
});
