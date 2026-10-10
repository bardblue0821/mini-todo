import { deleteTodo, updateTodo } from "@/lib/store";
import { errorResponse, readJson, requireAuth, toErrorResponse } from "@/lib/api";

const NOT_FOUND = "Todo が見つかりません";

export async function PATCH(request: Request, ctx: RouteContext<"/api/todos/[id]">) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  const { id } = await ctx.params;
  const body = await readJson(request);
  try {
    const updated = updateTodo(id, body);
    return updated ? Response.json(updated) : errorResponse(NOT_FOUND, 404);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/todos/[id]">) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  const { id } = await ctx.params;
  return deleteTodo(id) ? new Response(null, { status: 204 }) : errorResponse(NOT_FOUND, 404);
}
