import { test, expect } from "./fixtures";

// Step 13: 並列実行とテスト間のデータ分離
// 学習ポイント: fullyParallel / workers / test.describe.configure({ mode }) / テスト間のデータ分離
// データ分離の方式: リクエストヘッダー x-test-scope の値ごとにサーバー側のストアを分ける。
//   fixtures.ts が extraHTTPHeaders でテストごとに一意なスコープを付与するため、
//   テストは互いのデータに干渉せず、並列に実行できる。

const SCOPE_HEADER = "x-test-scope";
const scopeHeaders = (scope: string) => ({ [SCOPE_HEADER]: scope });

test.describe("スコープ分離 (API)", () => {
  test("あるスコープでの変更は別のスコープに見えない", async ({ request }) => {
    const a = scopeHeaders("isolation-a");
    const b = scopeHeaders("isolation-b");
    await request.post("/api/test/reset", { headers: a });
    await request.post("/api/test/reset", { headers: b });

    const created = await request.post("/api/todos", { headers: a, data: { title: "A だけのタスク" } });
    expect(created.status()).toBe(201);

    const listA = await (await request.get("/api/todos", { headers: a })).json();
    const listB = await (await request.get("/api/todos", { headers: b })).json();
    expect(listA).toHaveLength(4);
    expect(listB).toHaveLength(3);
  });

  test("リセットは自分のスコープだけを初期化する", async ({ request }) => {
    const a = scopeHeaders("reset-a");
    const b = scopeHeaders("reset-b");
    await request.post("/api/test/reset", { headers: a });
    await request.post("/api/test/reset", { headers: b });
    await request.post("/api/todos", { headers: a, data: { title: "A のタスク" } });
    await request.post("/api/todos", { headers: b, data: { title: "B のタスク" } });

    await request.post("/api/test/reset", { headers: a });

    expect(await (await request.get("/api/todos", { headers: a })).json()).toHaveLength(3);
    expect(await (await request.get("/api/todos", { headers: b })).json()).toHaveLength(4);
  });

  test("スコープが空なら従来どおり共有の既定スコープを使う", async ({ request }) => {
    const res = await request.get("/api/todos", { headers: { [SCOPE_HEADER]: "" } });
    expect(res.status()).toBe(200);
  });

  test("不正なスコープ名は 400 で拒否される", async ({ request }) => {
    const res = await request.get("/api/todos", { headers: scopeHeaders("../evil scope") });
    expect(res.status()).toBe(400);
  });

  test("詳細ページ (サーバーコンポーネント) もスコープごとのデータを読む", async ({ page, request }) => {
    const a = scopeHeaders("detail-a");
    await request.post("/api/test/reset", { headers: a });
    await request.patch("/api/todos/1", { headers: a, data: { title: "A で改名した" } });

    await page.setExtraHTTPHeaders(a);
    await page.goto("/todos/1");
    await expect(page.getByRole("heading", { name: "A で改名した" })).toBeVisible();

    await page.setExtraHTTPHeaders(scopeHeaders("detail-b"));
    await page.goto("/todos/1");
    await expect(page.getByRole("heading", { name: "牛乳を買う" })).toBeVisible();
  });
});

test.describe("並列実行 (各テストが同じデータを書き換えても干渉しない)", () => {
  // 同一ファイル内でもテスト単位で並列に走らせる。
  test.describe.configure({ mode: "parallel" });

  for (const n of [1, 2, 3, 4]) {
    test(`テスト ${n}: 追加して件数が自分の分だけ増える`, async ({ todoPage }) => {
      await todoPage.goto();
      await expect(todoPage.items).toHaveCount(3);

      await todoPage.add(`並列タスク ${n}`);
      await expect(todoPage.items).toHaveCount(4);
      await todoPage.remove("散歩する");
      await expect(todoPage.items).toHaveCount(3);
      await expect(todoPage.remaining).toHaveText("残り 3 件");
    });
  }
});

test.describe("直列実行 (前のテストの結果に依存する一連の操作)", () => {
  // 互いに依存するテストは serial にする。途中で失敗すると残りはスキップされる。
  test.describe.configure({ mode: "serial" });

  const serialScope = (workerIndex: number) => `serial-demo-${workerIndex}`;

  // serial のテスト間で状態 (ブラウザーページ) を共有するため beforeAll で作る。
  let page: import("@playwright/test").Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      storageState: "playwright/.auth/user.json",
      extraHTTPHeaders: scopeHeaders(serialScope(testInfo.workerIndex)),
      baseURL: testInfo.project.use.baseURL,
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
    });
    page = await context.newPage();
    await page.request.post("/api/test/reset");
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("1. タスクを追加する", async () => {
    await page.goto("/todos");
    await page.getByRole("textbox", { name: "新しいタスク" }).fill("直列タスク");
    await page.getByRole("button", { name: "追加" }).click();
    await expect(page.getByTestId("todo-item")).toHaveCount(4);
  });

  test("2. 追加したタスクを完了にする (1 の結果に依存)", async () => {
    // 楽観的更新なので、次のテストがリロードする前にサーバーへの反映を待つ。
    const saved = page.waitForResponse((res) => res.request().method() === "PATCH" && res.ok());
    await page.getByRole("checkbox", { name: "直列タスク", exact: true }).click();
    await expect(page.getByTestId("remaining-count")).toHaveText("残り 2 件");
    await saved;
  });

  test("3. リロードしても完了状態が残る (1・2 の結果に依存)", async () => {
    await page.reload();
    await expect(page.getByTestId("todo-item")).toHaveCount(4);
    await expect(page.getByRole("checkbox", { name: "直列タスク", exact: true })).toBeChecked();
  });
});
