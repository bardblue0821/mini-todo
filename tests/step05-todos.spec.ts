import { test, expect } from "@playwright/test";

// Step 5: 要素の操作・複数要素・状態の検証
// 学習ポイント: getByTestId / getByRole('checkbox') / locator.filter / toHaveCount / toContainText(配列) /
//              toBeChecked / toBeDisabled / toHaveAttribute / toHaveCSS / リロードしても残ることの確認
// 既定の storageState でログイン済み。テストごとにサーバー側データを初期化する。
test.beforeEach(async ({ page, request }) => {
  await request.post("/api/test/reset");
  await page.goto("/todos");
});

test.describe("ヘッダー", () => {
  test("「こんにちは、user さん」と「ログアウト」ボタンが表示される", async ({ page }) => {
    await expect(page.getByText("こんにちは、user さん")).toBeVisible();
    await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();
  });

  test("ログアウトすると /login へ遷移し、/todos に戻っても入れない", async ({ page, context }) => {
    await page.getByRole("button", { name: "ログアウト" }).click();
    await expect(page).toHaveURL("/login");
    expect((await context.cookies()).some((c) => c.name === "session")).toBe(false);

    await page.goto("/todos");
    await expect(page).toHaveURL("/login");
  });
});

test.describe("一覧", () => {
  test("初期データの 3 件が順番どおりに表示される", async ({ page }) => {
    const items = page.getByTestId("todo-item");
    await expect(items).toHaveCount(3);
    await expect(items).toContainText(["牛乳を買う", "レポートを書く", "散歩する"]);
  });

  test("完了状態が data-done とチェックボックスに反映される", async ({ page }) => {
    const items = page.getByTestId("todo-item");
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toHaveAttribute("data-done", "false");
    await expect(items.nth(2)).toHaveAttribute("data-done", "true");
    await expect(items.nth(0).getByRole("checkbox")).not.toBeChecked();
    await expect(items.nth(2).getByRole("checkbox")).toBeChecked();
  });

  test("完了したタスクのタイトルには取り消し線が付く", async ({ page }) => {
    const items = page.getByTestId("todo-item");
    await expect(items.nth(2).getByText("散歩する")).toHaveCSS("text-decoration-line", "line-through");
    await expect(items.nth(0).getByText("牛乳を買う")).toHaveCSS("text-decoration-line", "none");
  });

  test("「残り N 件」は未完了の件数を表示する", async ({ page }) => {
    await expect(page.getByTestId("remaining-count")).toHaveText("残り 2 件");
  });

  test("チェックボックスは、タイトルを名前として取得できる", async ({ page }) => {
    await expect(page.getByRole("checkbox", { name: "牛乳を買う" })).toBeVisible();
  });
});

test.describe("追加", () => {
  test("入力が空の間は「追加」ボタンが無効で、入力すると有効になる", async ({ page }) => {
    const add = page.getByRole("button", { name: "追加" });
    const input = page.getByPlaceholder("新しいタスク");

    await expect(add).toBeDisabled();
    await input.fill("   ");
    await expect(add).toBeDisabled();
    await input.fill("買い物");
    await expect(add).toBeEnabled();
    await input.clear();
    await expect(add).toBeDisabled();
  });

  test("追加すると末尾に未完了で表示され、入力欄が空になり、件数が増える", async ({ page }) => {
    await page.getByPlaceholder("新しいタスク").fill("部屋を掃除する");
    await page.getByRole("button", { name: "追加" }).click();

    const items = page.getByTestId("todo-item");
    await expect(items).toHaveCount(4);
    await expect(items.last()).toContainText("部屋を掃除する");
    await expect(items.last()).toHaveAttribute("data-done", "false");
    await expect(page.getByPlaceholder("新しいタスク")).toHaveValue("");
    await expect(page.getByTestId("remaining-count")).toHaveText("残り 3 件");
  });

  test("Enter キーでも追加できる", async ({ page }) => {
    await page.getByPlaceholder("新しいタスク").fill("Enter で追加");
    await page.getByPlaceholder("新しいタスク").press("Enter");
    await expect(page.getByTestId("todo-item").last()).toContainText("Enter で追加");
  });

  test("追加したタスクはリロードしても残る", async ({ page }) => {
    await page.getByPlaceholder("新しいタスク").fill("永続化の確認");
    await page.getByRole("button", { name: "追加" }).click();
    await expect(page.getByTestId("todo-item")).toHaveCount(4);

    await page.reload();
    await expect(page.getByTestId("todo-item")).toHaveCount(4);
    await expect(page.getByTestId("todo-item").last()).toContainText("永続化の確認");
  });

  test("100 文字ちょうどは追加できる", async ({ page }) => {
    await page.getByPlaceholder("新しいタスク").fill("あ".repeat(100));
    await page.getByRole("button", { name: "追加" }).click();
    await expect(page.getByTestId("todo-item")).toHaveCount(4);
  });

  test("100 文字を超えるとエラーが表示され、追加されない", async ({ page }) => {
    await expect(page.getByTestId("todo-item")).toHaveCount(3);
    await page.getByPlaceholder("新しいタスク").fill("あ".repeat(101));
    await page.getByRole("button", { name: "追加" }).click();

    // Next.js のルートアナウンサー (role="alert") と区別するため form 内に限定する
    const error = page.locator("form").getByRole("alert");
    await expect(error).toHaveText("100 文字以内で入力してください");
    await expect(page.getByTestId("todo-item")).toHaveCount(3);

    // 入力を直すとエラーは消え、追加できる
    await page.getByPlaceholder("新しいタスク").fill("あ".repeat(100));
    await expect(error).toBeHidden();
    await page.getByRole("button", { name: "追加" }).click();
    await expect(page.getByTestId("todo-item")).toHaveCount(4);
  });
});

test.describe("完了切替", () => {
  test("未完了のチェックボックスをオンにすると完了になり、残り件数が減る", async ({ page }) => {
    const item = page.getByTestId("todo-item").filter({ hasText: "牛乳を買う" });
    await item.getByRole("checkbox").check();

    await expect(item).toHaveAttribute("data-done", "true");
    await expect(item.getByText("牛乳を買う")).toHaveCSS("text-decoration-line", "line-through");
    await expect(page.getByTestId("remaining-count")).toHaveText("残り 1 件");
  });

  test("完了済みのチェックボックスをオフにすると未完了に戻り、残り件数が増える", async ({ page }) => {
    const item = page.getByTestId("todo-item").filter({ hasText: "散歩する" });
    await item.getByRole("checkbox").uncheck();

    await expect(item).toHaveAttribute("data-done", "false");
    await expect(page.getByTestId("remaining-count")).toHaveText("残り 3 件");
  });

  test("完了状態はリロードしても保持される", async ({ page }) => {
    await page.getByRole("checkbox", { name: "レポートを書く" }).check();
    await expect(page.getByTestId("remaining-count")).toHaveText("残り 1 件");

    await page.reload();
    await expect(page.getByRole("checkbox", { name: "レポートを書く" })).toBeChecked();
    await expect(page.getByTestId("remaining-count")).toHaveText("残り 1 件");
  });
});
