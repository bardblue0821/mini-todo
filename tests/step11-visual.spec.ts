import { test, expect } from "./fixtures";

// Step 11: スクリーンショット比較 (ビジュアルリグレッション)
// 学習ポイント: toHaveScreenshot / 基準画像 (-snapshots/) の生成と更新 (--update-snapshots) /
//              animations: "disabled" / mask による動的部分の除外 / fullPage / OS 依存 (基準画像は WSL/Linux で生成)
// 基準画像の更新: npx playwright test tests/step11-visual.spec.ts --update-snapshots

test.describe("ログイン済み", () => {
  test("/about の見た目が変わっていない", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("img", { name: "Mini Todo のロゴ" })).toBeVisible();
    await expect(page).toHaveScreenshot("about.png", { fullPage: true });
  });

  test("/todos の一覧の見た目が変わっていない", async ({ todoPage, page }) => {
    await todoPage.goto();
    await expect(todoPage.items).toHaveCount(3);
    await expect(page).toHaveScreenshot("todos.png", { fullPage: true });
  });

  test("/todos の「未完了」タブの見た目が変わっていない", async ({ todoPage, page }) => {
    await todoPage.goto("active");
    await expect(todoPage.items).toHaveCount(2);
    await expect(page).toHaveScreenshot("todos-active.png", { fullPage: true });
  });

  test("一覧の 1 行だけを切り出して比較できる (要素単位のスクリーンショット)", async ({ todoPage }) => {
    await todoPage.goto();
    await expect(todoPage.item("散歩する")).toHaveScreenshot("todo-item-done.png");
  });
});

test.describe("未ログイン", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/login の見た目が変わっていない", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "ログイン" })).toBeEnabled();
    await expect(page).toHaveScreenshot("login.png", { fullPage: true });
  });
});
