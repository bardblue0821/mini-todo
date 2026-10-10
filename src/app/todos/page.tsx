import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { parseFilter } from "@/lib/todo";
import { LogoutButton } from "./logout-button";
import { TodoApp } from "./todo-app";

export const metadata: Metadata = {
  title: "Todo | Mini Todo",
};

export default async function TodosPage({ searchParams }: PageProps<"/todos">) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const filter = parseFilter((await searchParams).filter);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <p>こんにちは、{user} さん</p>
        <LogoutButton />
      </div>
      <TodoApp filter={filter} />
    </main>
  );
}
