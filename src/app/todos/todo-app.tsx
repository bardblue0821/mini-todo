"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TITLE_MAX_LENGTH, type Todo } from "@/lib/todo";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

export function TodoApp() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/todos").then(async (res) => {
      if (cancelled) return;
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      setTodos(await res.json());
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed === "") return;
    if (trimmed.length > TITLE_MAX_LENGTH) {
      setTitleError(`${TITLE_MAX_LENGTH} 文字以内で入力してください`);
      return;
    }
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    if (!res.ok) {
      const body: { error?: string } | null = await res.json().catch(() => null);
      setTitleError(body?.error ?? "追加に失敗しました");
      return;
    }
    const created: Todo = await res.json();
    setTodos((current) => [...current, created]);
    setTitle("");
  }

  async function toggleTodo(todo: Todo, done: boolean) {
    // クリック直後に状態を反映する (楽観的更新)。失敗したら元に戻す。
    const apply = (value: boolean) =>
      setTodos((current) => current.map((t) => (t.id === todo.id ? { ...t, done: value } : t)));
    apply(done);
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ done }),
    });
    if (!res.ok) apply(todo.done);
  }

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <section className="flex flex-col gap-4">
      <form noValidate onSubmit={addTodo} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            name="title"
            placeholder="新しいタスク"
            aria-label="新しいタスク"
            autoComplete="off"
            disabled={!hydrated}
            value={title}
            aria-invalid={titleError ? true : undefined}
            onChange={(event) => {
              setTitle(event.target.value);
              setTitleError(null);
            }}
          />
          <Button type="submit" disabled={!hydrated || title.trim() === ""}>
            追加
          </Button>
        </div>
        {titleError && (
          <p role="alert" className="text-sm text-destructive">
            {titleError}
          </p>
        )}
      </form>

      <p data-testid="remaining-count" className="text-sm text-muted-foreground">
        残り {remaining} 件
      </p>

      <ul className="flex flex-col gap-2">
        {todos.map((todo) => (
          <li
            key={todo.id}
            data-testid="todo-item"
            data-done={todo.done}
            className="flex items-center gap-3 rounded-lg border px-3 py-2"
          >
            <Checkbox
              aria-label={todo.title}
              checked={todo.done}
              onCheckedChange={(checked) => toggleTodo(todo, checked === true)}
            />
            <span className={cn("flex-1", todo.done && "text-muted-foreground line-through")}>
              {todo.title}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
