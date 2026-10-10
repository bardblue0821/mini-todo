// サーバー (store) とクライアント (UI) の両方から参照する、副作用のない定義。
export type Todo = {
  id: string;
  title: string;
  done: boolean;
  memo: string;
  createdAt: string; // ISO8601
};

export const TITLE_MAX_LENGTH = 100;

export const FILTERS = ["all", "active", "completed"] as const;
export type Filter = (typeof FILTERS)[number];

/** URL クエリの値を Filter に変換する。不正な値・複数指定は all として扱う。 */
export function parseFilter(value: string | string[] | undefined): Filter {
  return FILTERS.find((f) => f === value) ?? "all";
}

export function applyFilter(todos: Todo[], filter: Filter): Todo[] {
  if (filter === "active") return todos.filter((t) => !t.done);
  if (filter === "completed") return todos.filter((t) => t.done);
  return todos;
}
