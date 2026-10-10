import { test, expect } from "@playwright/test";

// Step 7: フィルタと URL クエリ
// 学習ポイント: getByRole('tab') / aria-selected / toHaveURL (文字列・正規表現・URL オブジェクト) /
//              URL 直アクセス / 戻る・進む (goBack/goForward) / 不正値のフォールバック
test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

const tab = (page: import("@playwright/test").Page, name: string) => page.getByRole("tab", { name });

test.describe("タブの表示", () => {
  test("「すべて」「未完了」「完了」の 3 タブがあり、既定は「すべて」が選択されている", async ({ page }) => {
    await page.goto("/todos");
    await expect(page.getByRole("tab")).toHaveText(["すべて", "未完了", "完了"]);
    await expect(tab(page, "すべて")).toHaveAttribute("aria-selected", "true");
    await expect(tab(page, "未完了")).toHaveAttribute("aria-selected", "false");
    await expect(page.getByTestId("todo-item")).toHaveCount(3);
  });
});

test.describe("タブ切替", () => {
  test("「未完了」を押すと未完了の 2 件だけが表示され、URL に filter=active が付く", async ({ page }) => {
    await page.goto("/todos");
    await expect(page.getByTestId("todo-item")).toHaveCount(3);

    await tab(page, "未完了").click();
    await expect(page).toHaveURL(/\?filter=active$/);
    await expect(tab(page, "未完了")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("todo-item")).toContainText(["牛乳を買う", "レポートを書く"]);
    await expect(page.getByTestId("todo-item")).toHaveCount(2);
  });

  test("「完了」を押すと完了の 1 件だけが表示され、URL に filter=completed が付く", async ({ page }) => {
    await page.goto("/todos");
    await expect(page.getByTestId("todo-item")).toHaveCount(3);

    await tab(page, "完了").click();
    await expect(page).toHaveURL(/\?filter=completed$/);
    await expect(page.getByTestId("todo-item")).toHaveText(/散歩する/);
    await expect(page.getByTestId("todo-item")).toHaveCount(1);
  });

  test("「すべて」に戻すと 3 件が表示され、クエリは外れる", async ({ page }) => {
    await page.goto("/todos?filter=completed");
    await expect(page.getByTestId("todo-item")).toHaveCount(1);

    await tab(page, "すべて").click();
    await expect(page).toHaveURL("/todos");
    await expect(page.getByTestId("todo-item")).toHaveCount(3);
  });

  test("残り件数はフィルタに関係なく全体の未完了数を表す", async ({ page }) => {
    await page.goto("/todos?filter=completed");
    await expect(page.getByTestId("todo-item")).toHaveCount(1);
    await expect(page.getByTestId("remaining-count")).toHaveText("残り 2 件");
  });
});

test.describe("URL 直アクセス", () => {
  test("/todos?filter=active に直接アクセスすると「未完了」が選択され 2 件表示される", async ({ page }) => {
    await page.goto("/todos?filter=active");
    await expect(tab(page, "未完了")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("todo-item")).toHaveCount(2);
  });

  test("/todos?filter=completed に直接アクセスすると「完了」が選択され 1 件表示される", async ({ page }) => {
    await page.goto("/todos?filter=completed");
    await expect(tab(page, "完了")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("todo-item")).toHaveCount(1);
  });

  test("不正な filter 値は「すべて」として扱われる", async ({ page }) => {
    await page.goto("/todos?filter=bogus");
    await expect(tab(page, "すべて")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("todo-item")).toHaveCount(3);
  });
});

test.describe("履歴", () => {
  test("ブラウザの戻る・進むでフィルタが復元される", async ({ page }) => {
    await page.goto("/todos");
    await expect(page.getByTestId("todo-item")).toHaveCount(3);

    await tab(page, "未完了").click();
    await expect(page).toHaveURL(/filter=active/);
    await tab(page, "完了").click();
    await expect(page).toHaveURL(/filter=completed/);

    await page.goBack();
    await expect(page).toHaveURL(/filter=active/);
    await expect(tab(page, "未完了")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("todo-item")).toHaveCount(2);

    await page.goForward();
    await expect(page).toHaveURL(/filter=completed/);
    await expect(page.getByTestId("todo-item")).toHaveCount(1);
  });
});

test.describe("フィルタと操作の組み合わせ", () => {
  test("「未完了」表示中にタスクを完了にすると一覧から消える", async ({ page }) => {
    await page.goto("/todos?filter=active");
    await expect(page.getByTestId("todo-item")).toHaveCount(2);

    await page.getByRole("checkbox", { name: "牛乳を買う" }).check();
    await expect(page.getByTestId("todo-item")).toHaveCount(1);
    await expect(page.getByTestId("remaining-count")).toHaveText("残り 1 件");
  });
});
