import { test, expect } from "@playwright/test";

// ログイン / ログアウト API のテスト。
// Cookie の属性は `request.storageState()` で、Set-Cookie ヘッダーは生のレスポンスで確認する。
test.describe("POST /api/login", () => {
  test("正しい資格情報なら 200 で session Cookie (HttpOnly / SameSite=Lax / Path=/) を発行する", async ({
    request,
  }) => {
    const res = await request.post("/api/login", {
      data: { username: "user", password: "password" },
    });
    expect(res.status()).toBe(200);

    const setCookie = res.headers()["set-cookie"];
    expect(setCookie).toMatch(/^session=[^;]+/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Path=\//);

    const { cookies } = await request.storageState();
    const session = cookies.find((c) => c.name === "session");
    expect(session).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
    expect(session?.value).not.toBe("");
  });

  test("パスワードが違うと 401 で Cookie を発行せず、error を返す", async ({ request }) => {
    const res = await request.post("/api/login", {
      data: { username: "user", password: "wrong" },
    });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "ユーザー名またはパスワードが違います" });
    expect(res.headers()["set-cookie"]).toBeUndefined();
  });

  test("ユーザー名が違うと 401", async ({ request }) => {
    const res = await request.post("/api/login", {
      data: { username: "other", password: "password" },
    });
    expect(res.status()).toBe(401);
  });

  test("項目が欠けている・型が違う・JSON でない場合も 401", async ({ request }) => {
    for (const data of [{}, { username: "user" }, { username: 1, password: 2 }]) {
      const res = await request.post("/api/login", { data });
      expect(res.status(), JSON.stringify(data)).toBe(401);
    }
    const res = await request.post("/api/login", {
      headers: { "content-type": "application/json" },
      data: "not json",
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("POST /api/logout", () => {
  test("200 を返し、session Cookie を削除する", async ({ request }) => {
    await request.post("/api/login", { data: { username: "user", password: "password" } });
    expect((await request.storageState()).cookies.some((c) => c.name === "session")).toBe(true);

    const res = await request.post("/api/logout");
    expect(res.status()).toBe(200);
    expect((await request.storageState()).cookies.some((c) => c.name === "session")).toBe(false);
  });

  test("未ログインでも 200", async ({ request }) => {
    expect((await request.post("/api/logout")).status()).toBe(200);
  });
});
