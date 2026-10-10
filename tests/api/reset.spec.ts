import { test, expect } from "../fixtures";

// API テスト: ブラウザ画面を使わず `request` fixture で HTTP を直接検証する。
// 認証 Cookie なしで呼べる reset API の仕様をここで固定する。
test.describe("POST /api/test/reset", () => {
  test("204 を返す", async ({ request }) => {
    const res = await request.post("/api/test/reset");
    expect(res.status()).toBe(204);
  });
});
