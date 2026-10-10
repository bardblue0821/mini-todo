import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

const VALID_USERNAME = "user";
const VALID_PASSWORD = "password";
const DEV_SECRET = "mini-todo-dev-secret-do-not-use-in-production";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return DEV_SECRET;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

// 長さの違いで比較時間が変わらないよう、ハッシュ化してから定数時間で比較する。
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function verifyCredentials(username: unknown, password: unknown): boolean {
  if (typeof username !== "string" || typeof password !== "string") return false;
  // 両方を必ず評価して、どちらが違うかで処理時間が変わらないようにする。
  const userOk = safeEqual(username, VALID_USERNAME);
  const passOk = safeEqual(password, VALID_PASSWORD);
  return userOk && passOk;
}

/** サーバー側にセッションを持たない、HMAC 署名付きトークンを発行する。 */
export function createSessionToken(username: string, now: number = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: now + SESSION_MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** 有効なら紐づくユーザー名、無効 (改ざん・期限切れ・形式不正) なら null。 */
export function verifySessionToken(
  token: string | undefined,
  now: number = Date.now(),
): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!safeEqual(signature, sign(payload))) return null;

  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof u !== "string" || typeof exp !== "number" || now >= exp) return null;
    return u;
  } catch {
    return null;
  }
}
