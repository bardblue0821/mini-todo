import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Todo | Mini Todo",
};

export default async function TodosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <p>こんにちは、{user} さん</p>
    </main>
  );
}
