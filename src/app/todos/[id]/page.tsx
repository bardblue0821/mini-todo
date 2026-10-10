import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTodo } from "@/lib/store";
import { getSessionUser } from "@/lib/session";
import { MemoForm } from "./memo-form";

const createdAtFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export async function generateMetadata({ params }: PageProps<"/todos/[id]">): Promise<Metadata> {
  const todo = getTodo((await params).id);
  return { title: todo ? `${todo.title} | Mini Todo` : "Mini Todo" };
}

export default async function TodoDetailPage({ params }: PageProps<"/todos/[id]">) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const todo = getTodo((await params).id);
  if (!todo) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <Link href="/todos" className="text-sm underline underline-offset-4">
        一覧へ戻る
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl font-semibold">{todo.title}</h1>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            作成日時: {createdAtFormat.format(new Date(todo.createdAt))}
          </p>
        </CardHeader>
        <CardContent>
          <MemoForm id={todo.id} initialMemo={todo.memo} />
        </CardContent>
      </Card>
    </main>
  );
}
