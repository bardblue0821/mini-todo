import { test, expect } from "@playwright/test";

// Step 2: フォーム操作・アサーション・ナビゲーション待ち
// 学習ポイント: getByLabel / getByRole / fill / click / toHaveURL / toBeVisible / ネットワーク監視
// ログイン状態を持たない (storageState を空にする)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("ログイン画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("ユーザー名・パスワード・ログインボタンが表示される", async ({ page }) => {
    await expect(page).toHaveTitle("ログイン | Mini Todo");
    await expect(page.getByLabel("ユーザー名")).toBeVisible();
    await expect(page.getByLabel("パスワード")).toBeVisible();
    await expect(page.getByLabel("パスワード")).toHaveAttribute("type", "password");
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });

  test("正しい資格情報でログインすると /todos へ遷移し、session Cookie が発行される", async ({
    page,
    context,
  }) => {
    await page.getByLabel("ユーザー名").fill("user");
    await page.getByLabel("パスワード").fill("password");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL("/todos");
    await expect(page.getByText("こんにちは、user さん")).toBeVisible();
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "session")).toMatchObject({ httpOnly: true });
  });

  test("パスワードが違うとエラーが表示され、/login に留まる", async ({ page }) => {
    await page.getByLabel("ユーザー名").fill("user");
    await page.getByLabel("パスワード").fill("wrong");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page.getByRole("alert")).toHaveText("ユーザー名またはパスワードが違います");
    await expect(page).toHaveURL("/login");
  });

  test("再入力して成功するとエラーは消えて遷移する", async ({ page }) => {
    await page.getByLabel("ユーザー名").fill("user");
    await page.getByLabel("パスワード").fill("wrong");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page.getByRole("alert")).toBeVisible();

    await page.getByLabel("パスワード").fill("password");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL("/todos");
  });

  test("両方空のまま送信すると各項目の下に「必須項目です」が出て、リクエストは送られない", async ({
    page,
  }) => {
    const loginRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/login")) loginRequests.push(req.url());
    });

    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page.getByText("必須項目です")).toHaveCount(2);
    await expect(page.getByLabel("ユーザー名")).toHaveAccessibleDescription("必須項目です");
    await expect(page.getByLabel("パスワード")).toHaveAccessibleDescription("必須項目です");
    await expect(page).toHaveURL("/login");
    expect(loginRequests).toHaveLength(0);
  });

  test("片方だけ空の場合は、空の項目の下にだけ「必須項目です」が出る", async ({ page }) => {
    await page.getByLabel("ユーザー名").fill("user");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page.getByText("必須項目です")).toHaveCount(1);
    await expect(page.getByLabel("パスワード")).toHaveAccessibleDescription("必須項目です");
    await expect(page.getByLabel("ユーザー名")).not.toHaveAccessibleDescription("必須項目です");
  });

  test("Enter キーでも送信できる", async ({ page }) => {
    await page.getByLabel("ユーザー名").fill("user");
    await page.getByLabel("パスワード").fill("password");
    await page.getByLabel("パスワード").press("Enter");
    await expect(page).toHaveURL("/todos");
  });
});

test.describe("未ログインのアクセス制御", () => {
  test("未ログインで /todos を開くと /login にリダイレクトされる", async ({ page }) => {
    await page.goto("/todos");
    await expect(page).toHaveURL("/login");
  });
});
