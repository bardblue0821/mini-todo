"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/use-hydrated";

export function LogoutButton() {
  const router = useRouter();
  const hydrated = useHydrated();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={!hydrated} onClick={logout}>
      ログアウト
    </Button>
  );
}
