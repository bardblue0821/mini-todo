import { resetTodos } from "@/lib/store";

// テスト間の状態リセット用。本番ビルドでは存在しないものとして 404 を返す。
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not Found" }, { status: 404 });
  }
  resetTodos();
  return new Response(null, { status: 204 });
}
