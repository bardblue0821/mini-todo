import { test, expect } from "@playwright/test";
import { createSessionToken, verifySessionToken } from "../../src/lib/auth";

// セッショントークン (HMAC 署名付きステートレストークン) のロジックのテスト。
test.describe("session token", () => {
  test("発行したトークンは検証でき、ユーザー名が取り出せる", () => {
    expect(verifySessionToken(createSessionToken("user"))).toBe("user");
  });

  test("ペイロードを書き換えると検証に失敗する", () => {
    const [, signature] = createSessionToken("user").split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ u: "admin", exp: Date.now() + 60_000 }),
    ).toString("base64url");
    expect(verifySessionToken(`${forgedPayload}.${signature}`)).toBeNull();
  });

  test("署名を書き換えると検証に失敗する", () => {
    const [payload] = createSessionToken("user").split(".");
    expect(verifySessionToken(`${payload}.AAAA`)).toBeNull();
  });

  test("有効期限を過ぎたトークンは検証に失敗する", () => {
    const token = createSessionToken("user", 1_000);
    expect(verifySessionToken(token, 1_000 + 24 * 60 * 60 * 1000 + 1)).toBeNull();
    expect(verifySessionToken(token, 1_000 + 24 * 60 * 60 * 1000 - 1)).toBe("user");
  });

  test("形式が不正な値・未指定は検証に失敗する", () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("no-dot")).toBeNull();
    expect(verifySessionToken("a.b.c")).toBeNull();
  });
});
