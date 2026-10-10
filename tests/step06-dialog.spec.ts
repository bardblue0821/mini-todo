import { test, expect } from "@playwright/test";

// Step 6: ダイアログ処理
// 学習ポイント: page.on("dialog") / page.once("dialog") / dialog.type() / dialog.message() / accept() / dismiss()
// 注意: ダイアログのハンドラーは、ダイアログを開く操作 (click) より前に登録する。
//       ハンドラーが無いと Playwright は自動で dismiss する。
test.beforeEach(async ({ page, request }) => {
  await request.post("/api/test/reset");
  await page.goto("/todos");
  await expect(page.getByTestId("todo-item")).toHaveCount(3);
});

test.describe("削除の確認ダイアログ", () => {
  test("各行に「削除」ボタンがある", async ({ page }) => {
    await expect(page.getByRole("button", { name: "削除" })).toHaveCount(3);
  });

  test("削除ボタンで confirm が開き、メッセージが正しい", async ({ page }) => {
    const dialogPromise = page.waitForEvent("dialog");
    await page.getByTestId("todo-item").filter({ hasText: "牛乳を買う" }).getByRole("button", { name: "削除" }).click();

    const dialog = await dialogPromise;
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toBe("本当に削除しますか?");
    await dialog.dismiss();
  });

  test("OK (accept) すると項目が消え、残件数が更新される", async ({ page }) => {
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("todo-item").filter({ hasText: "牛乳を買う" }).getByRole("button", { name: "削除" }).click();

    const items = page.getByTestId("todo-item");
    await expect(items).toHaveCount(2);
    await expect(items).toContainText(["レポートを書く", "散歩する"]);
    await expect(page.getByTestId("remaining-count")).toHaveText("残り 1 件");
  });

  test("キャンセル (dismiss) すると項目は残る", async ({ page }) => {
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByTestId("todo-item").filter({ hasText: "牛乳を買う" }).getByRole("button", { name: "削除" }).click();

    await expect(page.getByTestId("todo-item")).toHaveCount(3);
    await expect(page.getByTestId("remaining-count")).toHaveText("残り 2 件");
  });

  test("削除はサーバーにも反映され、リロードしても戻らない", async ({ page }) => {
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("todo-item").filter({ hasText: "散歩する" }).getByRole("button", { name: "削除" }).click();
    await expect(page.getByTestId("todo-item")).toHaveCount(2);

    await page.reload();
    await expect(page.getByTestId("todo-item")).toHaveCount(2);
    await expect(page.getByText("散歩する")).toHaveCount(0);
  });

  test("キャンセルした項目はリロード後も残る", async ({ page }) => {
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByTestId("todo-item").filter({ hasText: "散歩する" }).getByRole("button", { name: "削除" }).click();

    await page.reload();
    await expect(page.getByTestId("todo-item")).toHaveCount(3);
  });
});
