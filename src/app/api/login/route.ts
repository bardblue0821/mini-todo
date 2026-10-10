import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifyCredentials,
} from "@/lib/auth";

export async function POST(request: Request) {
  // JSON として読めない・形が違う場合も「資格情報が正しくない」として 401 にする。
  const body: unknown = await request.json().catch(() => null);
  const { username, password } =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  if (!verifyCredentials(username, password)) {
    return NextResponse.json({ error: "ユーザー名またはパスワードが違います" }, { status: 401 });
  }

  const response = NextResponse.json({ username });
  response.cookies.set(SESSION_COOKIE, createSessionToken(username as string), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
