import { test, expect } from "./fixtures";

// Step 10: Fixture と Page Object
// 学習ポイント: test.extend による独自 fixture / auto fixture (毎回自動で実行) / Page Object (操作と locator の集約)
// この spec は todoPage fixture 経由で操作する。データ初期化は auto fixture が行うため beforeEach は不要。

test("todoPage.goto() で一覧を開くと、初期データ 3 件が読み込まれる", async ({ todoPage }) => {
  await todoPage.goto();
  await expect(todoPage.items).toHaveCount(3);
  await expect(todoPage.items).toContainText(["牛乳を買う", "レポートを書く", "散歩する"]);
  await expect(todoPage.remaining).toHaveText("残り 2 件");
});

test("todoPage.add() でタスクを追加できる", async ({ todoPage }) => {
  await todoPage.goto();
  await todoPage.add("お風呂を洗う");
  await expect(todoPage.items).toHaveCount(4);
  await expect(todoPage.item("お風呂を洗う")).toBeVisible();
  await expect(todoPage.remaining).toHaveText("残り 3 件");
});

test("todoPage.toggle() で完了状態を切り替えられる", async ({ todoPage }) => {
  await todoPage.goto();
  await todoPage.toggle("牛乳を買う");
  await expect(todoPage.item("牛乳を買う")).toHaveAttribute("data-done", "true");
  await expect(todoPage.remaining).toHaveText("残り 1 件");
});

test("todoPage.remove() は confirm を承認して削除する", async ({ todoPage }) => {
  await todoPage.goto();
  await todoPage.remove("散歩する");
  await expect(todoPage.items).toHaveCount(2);
  await expect(todoPage.item("散歩する")).toHaveCount(0);
});

test("todoPage.remove(title, { accept: false }) は confirm を拒否して残す", async ({ todoPage }) => {
  await todoPage.goto();
  await todoPage.remove("散歩する", { accept: false });
  await expect(todoPage.items).toHaveCount(3);
});

test("todoPage.selectFilter() でタブを切り替えられる", async ({ todoPage, page }) => {
  await todoPage.goto();
  await todoPage.selectFilter("未完了");
  await expect(page).toHaveURL(/filter=active/);
  await expect(todoPage.items).toHaveCount(2);
});

test("auto fixture により、前のテストの変更が次のテストに持ち越されない", async ({ todoPage }) => {
  // 直前のテストまでに追加・削除・完了切替をしているが、初期状態に戻っている
  await todoPage.goto();
  await expect(todoPage.items).toHaveCount(3);
  await expect(todoPage.remaining).toHaveText("残り 2 件");
});
