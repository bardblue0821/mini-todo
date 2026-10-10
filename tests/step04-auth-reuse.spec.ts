import { test, expect } from "@playwright/test";

// Step 4: 認証状態の再利用 (storageState)
// 学習ポイント: setup project でログインして storageState を保存し、各テストで再利用する。
// このファイルはログイン操作を一切しない。既定の storageState (playwright.config.ts) によって
// 最初からログイン済みの状態でテストが始まる。
test.describe("保存済みの認証状態を再利用する", () => {
  test("/todos を直接開ける (ログイン画面に飛ばされない)", async ({ page }) => {
    await page.goto("/todos");
    await expect(page).toHaveURL("/todos");
    await expect(page.getByText("こんにちは、user さん")).toBeVisible();
  });

  test("ルート / からも /todos に着く", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/todos");
  });

  test("session Cookie が最初から入っている", async ({ context }) => {
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "session")).toMatchObject({ httpOnly: true });
  });
});
