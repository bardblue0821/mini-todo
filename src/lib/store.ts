import { TITLE_MAX_LENGTH, type Todo } from "./todo";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const SEED: readonly Todo[] = [
  { id: "1", title: "牛乳を買う", done: false, memo: "", createdAt: "2024-01-01T09:00:00.000Z" },
  { id: "2", title: "レポートを書く", done: false, memo: "", createdAt: "2024-01-02T09:00:00.000Z" },
  { id: "3", title: "散歩する", done: true, memo: "", createdAt: "2024-01-03T09:00:00.000Z" },
];

/** スコープを指定しない場合に使う共有のスコープ。 */
export const DEFAULT_SCOPE = "default";

// Next.js は開発時の HMR やルートごとのバンドル分割でモジュールが複数回評価されうる。
// モジュール変数に持つと API ごとに別のデータになるため、globalThis に 1 つだけ保持する。
// データはスコープ名ごとに分けて持つ (テストの並列実行時に互いに干渉しないようにするため)。
const globalForStore = globalThis as typeof globalThis & { __miniTodoStore?: Map<string, Todo[]> };

function seed(): Todo[] {
  return SEED.map((t) => ({ ...t }));
}

function todos(scope: string): Todo[] {
  const store = (globalForStore.__miniTodoStore ??= new Map());
  let list = store.get(scope);
  if (!list) {
    list = seed();
    store.set(scope, list);
  }
  return list;
}

function validateTitle(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("title は文字列で指定してください");
  }
  const title = value.trim();
  if (title === "") {
    throw new ValidationError("title は必須です");
  }
  if (title.length > TITLE_MAX_LENGTH) {
    throw new ValidationError(`title は ${TITLE_MAX_LENGTH} 文字以内で指定してください`);
  }
  return title;
}

export function resetTodos(scope: string = DEFAULT_SCOPE): void {
  (globalForStore.__miniTodoStore ??= new Map()).set(scope, seed());
}

export function listTodos(scope: string = DEFAULT_SCOPE): Todo[] {
  return todos(scope).map((t) => ({ ...t }));
}

export function getTodo(id: string, scope: string = DEFAULT_SCOPE): Todo | undefined {
  const found = todos(scope).find((t) => t.id === id);
  return found && { ...found };
}

export function addTodo(title: unknown, scope: string = DEFAULT_SCOPE): Todo {
  const todo: Todo = {
    id: crypto.randomUUID(),
    title: validateTitle(title),
    done: false,
    memo: "",
    createdAt: new Date().toISOString(),
  };
  todos(scope).push(todo);
  return { ...todo };
}

export function updateTodo(id: string, patch: unknown, scope: string = DEFAULT_SCOPE): Todo | undefined {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    throw new ValidationError("更新内容をオブジェクトで指定してください");
  }
  const { done, title, memo } = patch as Record<string, unknown>;

  // 値の検証は更新対象の存在確認より先に行い、不正な入力は 400 として扱えるようにする。
  const changes: Partial<Pick<Todo, "done" | "title" | "memo">> = {};
  if (done !== undefined) {
    if (typeof done !== "boolean") throw new ValidationError("done は真偽値で指定してください");
    changes.done = done;
  }
  if (title !== undefined) {
    changes.title = validateTitle(title);
  }
  if (memo !== undefined) {
    if (typeof memo !== "string") throw new ValidationError("memo は文字列で指定してください");
    changes.memo = memo;
  }
  if (Object.keys(changes).length === 0) {
    throw new ValidationError("done / title / memo のいずれかを指定してください");
  }

  const target = todos(scope).find((t) => t.id === id);
  if (!target) return undefined;
  Object.assign(target, changes);
  return { ...target };
}

export function deleteTodo(id: string, scope: string = DEFAULT_SCOPE): boolean {
  const list = todos(scope);
  const index = list.findIndex((t) => t.id === id);
  if (index === -1) return false;
  list.splice(index, 1);
  return true;
}
