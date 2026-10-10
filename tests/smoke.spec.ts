import { test, expect } from "@playwright/test";

// 環境(Next.js 起動 / Chromium 起動 / baseURL)が正しく動くことの確認用。Phase 1 で削除する。
test("アプリが起動し、タイトルが Mini Todo である", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Mini Todo");
});
