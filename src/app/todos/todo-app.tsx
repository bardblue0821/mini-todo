"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FILTERS, TITLE_MAX_LENGTH, applyFilter, parseFilter, type Filter, type Todo } from "@/lib/todo";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

const FILTER_LABELS: Record<Filter, string> = {
  all: "すべて",
  active: "未完了",
  completed: "完了",
};

export function TodoApp({ filter }: { filter: Filter }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/todos")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (!res.ok) throw new Error(`GET /api/todos failed: ${res.status}`);
        setTodos(await res.json());
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
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

  async function deleteTodo(todo: Todo) {
    if (!window.confirm("本当に削除しますか?")) return;
    const res = await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
    // 404 は「すでに存在しない」状態なので、画面からも消してよい。
    if (res.ok || res.status === 404) {
      setTodos((current) => current.filter((t) => t.id !== todo.id));
    }
  }

  const remaining = todos.filter((t) => !t.done).length;
  const visibleTodos = applyFilter(todos, filter);

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

      <Tabs
        value={filter}
        onValueChange={(value) => {
          const next = parseFilter(value);
          router.push(next === "all" ? "/todos" : `/todos?filter=${next}`);
        }}
      >
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f} value={f} disabled={!hydrated}>
              {FILTER_LABELS[f]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <p data-testid="remaining-count" className="text-sm text-muted-foreground">
        残り {remaining} 件
      </p>

      {status === "loading" && <p className="text-sm text-muted-foreground">読み込み中...</p>}
      {status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          Todo の取得に失敗しました
        </p>
      )}
      {status === "ready" && visibleTodos.length === 0 && (
        <p className="text-sm text-muted-foreground">タスクがありません</p>
      )}

      <ul className="flex flex-col gap-2">
        {visibleTodos.map((todo) => (
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
            <Link
              href={`/todos/${todo.id}`}
              className={cn("flex-1 hover:underline", todo.done && "text-muted-foreground line-through")}
            >
              {todo.title}
            </Link>
            <Button type="button" variant="outline" size="sm" onClick={() => deleteTodo(todo)}>
              削除
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
