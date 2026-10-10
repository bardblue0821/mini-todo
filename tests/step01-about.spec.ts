import { test, expect } from "@playwright/test";

// Step 1: 最初のテスト(認証不要の静的ページ)
test.describe("About ページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/about");
  });

  test("タイトルが 'About | Mini Todo' である", async ({ page }) => {
    await expect(page).toHaveTitle("About | Mini Todo");
  });

  test("h1 に 'About' が表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("About");
  });

  test("画像が alt 付きで表示され、実際に読み込まれている", async ({ page }) => {
    const image = page.getByRole("img", { name: "Mini Todo のロゴ" });
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  });
});
