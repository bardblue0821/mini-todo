import { addTodo, listTodos } from "@/lib/store";
import { getScope } from "@/lib/scope";
import { readJson, requireAuth, toErrorResponse } from "@/lib/api";

// 読み込み中表示 (ローディング UI) を学習できるよう、意図的に遅延させる。
const LIST_DELAY_MS = 500;

export async function GET() {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const scope = await getScope();
    await new Promise((resolve) => setTimeout(resolve, LIST_DELAY_MS));
    return Response.json(listTodos(scope));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  const body = await readJson(request);
  const title = typeof body === "object" && body !== null ? (body as { title?: unknown }).title : undefined;
  try {
    return Response.json(addTodo(title, await getScope()), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
