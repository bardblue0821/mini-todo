import { resetTodos } from "@/lib/store";
import { getScope } from "@/lib/scope";
import { toErrorResponse } from "@/lib/api";

// テスト間の状態リセット用。本番ビルドでは存在しないものとして 404 を返す。
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not Found" }, { status: 404 });
  }
  try {
    resetTodos(await getScope());
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
