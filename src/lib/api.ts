import { ValidationError } from "@/lib/store";
import { getSessionUser } from "@/lib/session";

export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** 未認証なら 401 のレスポンスを、認証済みなら null を返す。 */
export async function requireAuth(): Promise<Response | null> {
  const user = await getSessionUser();
  return user ? null : errorResponse("ログインが必要です", 401);
}

/** JSON として読めない body は null として扱う (検証側で 400 になる)。 */
export function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

/** ストアの検証エラーは 400、それ以外は想定外なのでそのまま投げる。 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof ValidationError) return errorResponse(error.message, 400);
  throw error;
}
