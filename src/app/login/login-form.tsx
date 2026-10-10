"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Errors = { username?: string; password?: string; form?: string };

const REQUIRED = "必須項目です";

const noopSubscribe = () => () => {};

export function LoginForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  // ハイドレーション完了前にボタンが押せてしまうと、React のハンドラーが未接続のまま
  // ブラウザ標準のフォーム送信 (資格情報が URL に載る GET) が走る。完了までボタンを無効にしておく。
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") ?? "");
    const password = String(data.get("password") ?? "");

    const next: Errors = {};
    if (username === "") next.username = REQUIRED;
    if (password === "") next.password = REQUIRED;
    setErrors(next);
    if (next.username || next.password) return;

    setPending(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.replace("/todos");
        return;
      }
      const body: { error?: string } | null = await res.json().catch(() => null);
      setErrors({ form: body?.error ?? "ログインに失敗しました" });
    } catch {
      setErrors({ form: "通信エラーが発生しました" });
    }
    setPending(false);
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">ユーザー名</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          aria-invalid={errors.username ? true : undefined}
          aria-describedby={errors.username ? "username-error" : undefined}
        />
        {errors.username && (
          <p id="username-error" className="text-sm text-destructive">
            {errors.username}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password}
          </p>
        )}
      </div>

      {errors.form && (
        <p role="alert" className="text-sm text-destructive">
          {errors.form}
        </p>
      )}

      <Button type="submit" disabled={!hydrated || pending}>
        ログイン
      </Button>
    </form>
  );
}
