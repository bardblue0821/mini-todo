import { test, expect } from "@playwright/test";

// Step 3: ナビゲーション
// 学習ポイント: getByRole('link') / toHaveURL / リダイレクト / page.request でログイン状態を作る
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("ヘッダーナビゲーション", () => {
  test("「Todo」「About」リンクが表示される", async ({ page }) => {
    await page.goto("/about");
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Todo" })).toHaveAttribute("href", "/todos");
    await expect(nav.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
  });

  test("「About」リンクで /about へ移動できる", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("navigation").getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL("/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("About");
  });

  test("ログイン済みなら「Todo」リンクで /todos へ移動できる", async ({ page }) => {
    // page.request はブラウザと Cookie を共有するため、UI を経由せずログイン状態を作れる
    await page.request.post("/api/login", { data: { username: "user", password: "password" } });
    await page.goto("/about");
    await page.getByRole("navigation").getByRole("link", { name: "Todo" }).click();
    await expect(page).toHaveURL("/todos");
  });

  test("未ログインなら「Todo」リンクは /login に行き着く", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("navigation").getByRole("link", { name: "Todo" }).click();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("ルート /", () => {
  test("未ログインで開くと /login に行き着く", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("ログイン済みで開くと /todos に行き着く", async ({ page }) => {
    await page.request.post("/api/login", { data: { username: "user", password: "password" } });
    await page.goto("/");
    await expect(page).toHaveURL("/todos");
  });
});
