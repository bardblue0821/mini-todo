import { test as setup, expect } from "@playwright/test";
import { AUTH_FILE } from "./auth-file";

// 全テストの前に 1 度だけ実行し、ログイン後の状態 (Cookie) をファイルに保存する。
// 各テストはこのファイルを storageState として読み込むため、毎回ログインしなくてよい。
setup("ログインして認証状態を保存する", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("ユーザー名").fill("user");
  await page.getByLabel("パスワード").fill("password");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL("/todos");

  await page.context().storageState({ path: AUTH_FILE });
});
