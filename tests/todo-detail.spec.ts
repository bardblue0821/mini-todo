import { test, expect } from "./fixtures";

// Step 12 相当: 詳細画面 /todos/[id]
// 学習ポイント: 動的ルート / タイムゾーン (Asia/Tokyo) / getByLabel / トースト (Sonner) の出現と消滅 /
//              request フィクスチャでの状態確認 / HTTP ステータスの検証 (404) / 未ログインのリダイレクト
// データ初期化は auto fixture (resetData) が行う。

test.describe("表示", () => {
  test("タイトル・作成日時 (JST)・空のメモが表示される", async ({ page }) => {
    await page.goto("/todos/1");
    await expect(page).toHaveTitle("牛乳を買う | Mini Todo");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("牛乳を買う");
    // 2024-01-01T09:00:00Z は Asia/Tokyo では 18:00
    await expect(page.getByText("作成日時: 2024/01/01 18:00")).toBeVisible();
    await expect(page.getByLabel("メモ")).toHaveValue("");
  });

  test("「一覧へ戻る」で /todos に戻れる", async ({ page }) => {
    await page.goto("/todos/2");
    await page.getByRole("link", { name: "一覧へ戻る" }).click();
    await expect(page).toHaveURL("/todos");
  });
});

test.describe("一覧からの遷移", () => {
  test("一覧のタイトルをクリックすると詳細画面へ遷移する", async ({ page }) => {
    await page.goto("/todos");
    await page.getByRole("link", { name: "レポートを書く" }).click();
    await expect(page).toHaveURL("/todos/2");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("レポートを書く");
  });
});

test.describe("保存", () => {
  test("メモを入力して保存すると、トースト「保存しました」が出て約 2 秒後に消える", async ({ page }) => {
    await page.goto("/todos/1");
    await page.getByLabel("メモ").fill("スーパーで 2 本買う");
    await page.getByRole("button", { name: "保存" }).click();

    const toast = page.getByText("保存しました");
    await expect(toast).toBeVisible();
    await expect(toast).toBeHidden({ timeout: 5000 });
  });

  test("保存した内容はリロードしても残り、API にも反映されている", async ({ page, request }) => {
    await page.goto("/todos/1");
    await page.getByLabel("メモ").fill("スーパーで 2 本買う");
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page.getByText("保存しました")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("メモ")).toHaveValue("スーパーで 2 本買う");

    const res = await request.get("/api/todos");
    const todos: { id: string; memo: string }[] = await res.json();
    expect(todos.find((t) => t.id === "1")?.memo).toBe("スーパーで 2 本買う");
  });

  test("保存に失敗したときはトーストではなくエラー (role=alert) が表示される", async ({ page }) => {
    await page.route("**/api/todos/1", (route) =>
      route.request().method() === "PATCH"
        ? route.fulfill({ status: 500, json: { error: "サーバーエラー" } })
        : route.fallback(),
    );
    await page.goto("/todos/1");
    await page.getByLabel("メモ").fill("失敗する保存");
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page.locator("main").getByRole("alert")).toHaveText("サーバーエラー");
    await expect(page.getByText("保存しました")).toHaveCount(0);
  });
});

test.describe("存在しない ID", () => {
  test("HTTP 404 が返り、404 ページが表示される", async ({ page }) => {
    const response = await page.goto("/todos/999");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("404")).toBeVisible();
  });
});

test.describe("未ログイン", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("詳細画面に直接アクセスすると /login へリダイレクトされる", async ({ page }) => {
    await page.goto("/todos/1");
    await expect(page).toHaveURL("/login");
  });
});
