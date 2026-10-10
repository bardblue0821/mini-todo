import { test, expect } from "@playwright/test";

// Step 8: ネットワークのモック
// 学習ポイント: page.route / route.fulfill / route.continue / route.abort / 遅延の再現 /
//              リクエストの待機 (waitForRequest / waitForResponse) / 実 API との使い分け
test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

const LIST_URL = "**/api/todos";

test.describe("読み込み中表示", () => {
  test("実 API (500ms 遅延) では「読み込み中...」が出てから一覧に置き換わる", async ({ page }) => {
    await page.goto("/todos");
    await expect(page.getByText("読み込み中...")).toBeVisible();
    await expect(page.getByText("読み込み中...")).toBeHidden();
    await expect(page.getByTestId("todo-item")).toHaveCount(3);
  });

  test("レスポンスを保留している間は読み込み中が表示され続ける", async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route(LIST_URL, async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      await gate; // テストが許可するまで応答を保留する (固定 sleep より確実)
      await route.continue();
    });

    await page.goto("/todos");
    await expect(page.getByText("読み込み中...")).toBeVisible();
    await expect(page.getByTestId("todo-item")).toHaveCount(0);

    release();
    await expect(page.getByText("読み込み中...")).toBeHidden();
    await expect(page.getByTestId("todo-item")).toHaveCount(3);
  });
});

test.describe("空の一覧", () => {
  test("API が空配列を返すと「タスクがありません」が表示される", async ({ page }) => {
    await page.route(LIST_URL, (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      return route.fulfill({ json: [] });
    });

    await page.goto("/todos");
    await expect(page.getByText("タスクがありません")).toBeVisible();
    await expect(page.getByTestId("todo-item")).toHaveCount(0);
    await expect(page.getByTestId("remaining-count")).toHaveText("残り 0 件");
  });

  test("データがあるときは「タスクがありません」は表示されない", async ({ page }) => {
    await page.goto("/todos");
    await expect(page.getByTestId("todo-item")).toHaveCount(3);
    await expect(page.getByText("タスクがありません")).toHaveCount(0);
  });
});

test.describe("API エラー", () => {
  test("500 が返ると form 外のエラー表示 (role=alert) が出て、一覧は空のまま", async ({ page }) => {
    await page.route(LIST_URL, (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      return route.fulfill({ status: 500, json: { error: "internal" } });
    });

    await page.goto("/todos");
    const alert = page.getByRole("alert").filter({ hasText: "Todo の取得に失敗しました" });
    await expect(alert).toBeVisible();
    await expect(page.getByText("読み込み中...")).toBeHidden();
    await expect(page.getByTestId("todo-item")).toHaveCount(0);
  });

  test("通信自体が失敗 (abort) してもエラー表示になる", async ({ page }) => {
    await page.route(LIST_URL, (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      return route.abort("failed");
    });

    await page.goto("/todos");
    await expect(page.getByRole("alert").filter({ hasText: "Todo の取得に失敗しました" })).toBeVisible();
    await expect(page.getByText("読み込み中...")).toBeHidden();
  });
});

test.describe("リクエストの検証", () => {
  test("追加すると POST /api/todos に正しい body が送られる", async ({ page }) => {
    await page.goto("/todos");
    await expect(page.getByTestId("todo-item")).toHaveCount(3);

    const requestPromise = page.waitForRequest((req) => req.url().endsWith("/api/todos") && req.method() === "POST");
    await page.getByRole("textbox", { name: "新しいタスク" }).fill("  お風呂を洗う  ");
    await page.getByRole("button", { name: "追加" }).click();

    const request = await requestPromise;
    expect(request.postDataJSON()).toEqual({ title: "お風呂を洗う" });
    await expect(page.getByTestId("todo-item")).toHaveCount(4);
  });

  test("POST を 500 にモックすると追加に失敗したことが表示され、一覧は増えない", async ({ page }) => {
    await page.route(LIST_URL, (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({ status: 500, json: { error: "サーバーエラー" } });
    });

    await page.goto("/todos");
    await expect(page.getByTestId("todo-item")).toHaveCount(3);
    await page.getByRole("textbox", { name: "新しいタスク" }).fill("失敗する追加");
    await page.getByRole("button", { name: "追加" }).click();

    await expect(page.locator("form").getByRole("alert")).toHaveText("サーバーエラー");
    await expect(page.getByTestId("todo-item")).toHaveCount(3);
  });
});
