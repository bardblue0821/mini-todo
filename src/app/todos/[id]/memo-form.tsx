"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/lib/use-hydrated";

export function MemoForm({ id, initialMemo }: { id: string; initialMemo: string }) {
  const hydrated = useHydrated();
  const [memo, setMemo] = useState(initialMemo);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memo }),
      });
      if (!res.ok) {
        const body: { error?: string } | null = await res.json().catch(() => null);
        setError(body?.error ?? "保存に失敗しました");
        return;
      }
      toast.success("保存しました", { duration: 2000 });
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <Label htmlFor="memo">メモ</Label>
      <Textarea
        id="memo"
        name="memo"
        rows={6}
        disabled={!hydrated}
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="self-start" disabled={!hydrated || saving}>
        保存
      </Button>
    </form>
  );
}
