export type Todo = {
  id: string;
  title: string;
  done: boolean;
  memo: string;
  createdAt: string; // ISO8601
};

export const TITLE_MAX_LENGTH = 100;

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

// Next.js は開発時の HMR やルートごとのバンドル分割でモジュールが複数回評価されうる。
// モジュール変数に持つと API ごとに別のデータになるため、globalThis に 1 つだけ保持する。
const globalForStore = globalThis as typeof globalThis & { __miniTodoStore?: Todo[] };

function todos(): Todo[] {
  return (globalForStore.__miniTodoStore ??= SEED.map((t) => ({ ...t })));
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

export function resetTodos(): void {
  globalForStore.__miniTodoStore = SEED.map((t) => ({ ...t }));
}

export function listTodos(): Todo[] {
  return todos().map((t) => ({ ...t }));
}

export function getTodo(id: string): Todo | undefined {
  const found = todos().find((t) => t.id === id);
  return found && { ...found };
}

export function addTodo(title: unknown): Todo {
  const todo: Todo = {
    id: crypto.randomUUID(),
    title: validateTitle(title),
    done: false,
    memo: "",
    createdAt: new Date().toISOString(),
  };
  todos().push(todo);
  return { ...todo };
}

export function updateTodo(id: string, patch: unknown): Todo | undefined {
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

  const target = todos().find((t) => t.id === id);
  if (!target) return undefined;
  Object.assign(target, changes);
  return { ...target };
}

export function deleteTodo(id: string): boolean {
  const list = todos();
  const index = list.findIndex((t) => t.id === id);
  if (index === -1) return false;
  list.splice(index, 1);
  return true;
}
