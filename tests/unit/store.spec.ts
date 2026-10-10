import { test, expect } from "@playwright/test";
import {
  addTodo,
  deleteTodo,
  getTodo,
  listTodos,
  resetTodos,
  updateTodo,
  ValidationError,
} from "../../src/lib/store";

// ブラウザを使わないロジックのテスト (TDD 10.2)。
// Playwright Test は純粋なユニットテストランナーとしても使える。
test.describe("store", () => {
  test.beforeEach(() => {
    resetTodos();
  });

  test("初期データは 3 件で、固定の内容である", () => {
    expect(listTodos().map(({ title, done, memo }) => ({ title, done, memo }))).toEqual([
      { title: "牛乳を買う", done: false, memo: "" },
      { title: "レポートを書く", done: false, memo: "" },
      { title: "散歩する", done: true, memo: "" },
    ]);
  });

  test("初期データの id と createdAt は固定である", () => {
    expect(listTodos().map((t) => t.id)).toEqual(["1", "2", "3"]);
    for (const t of listTodos()) {
      expect(new Date(t.createdAt).toISOString()).toBe(t.createdAt);
    }
    expect(listTodos()[0].createdAt).toBe("2024-01-01T09:00:00.000Z");
  });

  test("addTodo: 追加すると末尾に入り、一意の id と未完了・空メモで作られる", () => {
    const created = addTodo("新しいタスク");
    expect(created).toMatchObject({ title: "新しいタスク", done: false, memo: "" });
    expect(created.id).not.toBe("");
    expect(listTodos()).toHaveLength(4);
    expect(listTodos().at(-1)).toEqual(created);
    expect(addTodo("別のタスク").id).not.toBe(created.id);
  });

  test("addTodo: title は trim される", () => {
    expect(addTodo("  前後に空白  ").title).toBe("前後に空白");
  });

  test("addTodo: 空・空白のみ・100 文字超は ValidationError", () => {
    expect(() => addTodo("")).toThrow(ValidationError);
    expect(() => addTodo("   ")).toThrow(ValidationError);
    expect(() => addTodo("あ".repeat(101))).toThrow(ValidationError);
    expect(listTodos()).toHaveLength(3);
  });

  test("addTodo: 100 文字ちょうどは追加できる", () => {
    expect(addTodo("あ".repeat(100)).title).toHaveLength(100);
  });

  test("addTodo: 文字列以外は ValidationError", () => {
    expect(() => addTodo(undefined)).toThrow(ValidationError);
    expect(() => addTodo(123)).toThrow(ValidationError);
  });

  test("getTodo: 存在する id は返し、存在しない id は undefined", () => {
    expect(getTodo("1")?.title).toBe("牛乳を買う");
    expect(getTodo("nope")).toBeUndefined();
  });

  test("updateTodo: done / title / memo を一部だけ更新できる", () => {
    expect(updateTodo("1", { done: true })).toMatchObject({ id: "1", done: true, title: "牛乳を買う" });
    expect(updateTodo("1", { title: " 変更後 " })?.title).toBe("変更後");
    expect(updateTodo("1", { memo: "メモ" })).toMatchObject({ memo: "メモ", done: true, title: "変更後" });
    expect(getTodo("1")).toMatchObject({ memo: "メモ", done: true, title: "変更後" });
  });

  test("updateTodo: 存在しない id は undefined", () => {
    expect(updateTodo("nope", { done: true })).toBeUndefined();
  });

  test("updateTodo: 不正な値は ValidationError で、何も変更されない", () => {
    expect(() => updateTodo("1", { done: "yes" })).toThrow(ValidationError);
    expect(() => updateTodo("1", { title: "" })).toThrow(ValidationError);
    expect(() => updateTodo("1", { title: "あ".repeat(101) })).toThrow(ValidationError);
    expect(() => updateTodo("1", { memo: 1 })).toThrow(ValidationError);
    expect(() => updateTodo("1", {})).toThrow(ValidationError);
    expect(() => updateTodo("1", null)).toThrow(ValidationError);
    expect(getTodo("1")).toMatchObject({ title: "牛乳を買う", done: false, memo: "" });
  });

  test("deleteTodo: 削除すると true、存在しない id は false", () => {
    expect(deleteTodo("2")).toBe(true);
    expect(listTodos().map((t) => t.id)).toEqual(["1", "3"]);
    expect(deleteTodo("2")).toBe(false);
  });

  test("resetTodos: 追加・更新・削除を初期状態に戻す", () => {
    addTodo("追加");
    updateTodo("1", { done: true });
    deleteTodo("3");
    resetTodos();
    expect(listTodos().map(({ id, title, done }) => ({ id, title, done }))).toEqual([
      { id: "1", title: "牛乳を買う", done: false },
      { id: "2", title: "レポートを書く", done: false },
      { id: "3", title: "散歩する", done: true },
    ]);
  });

  test("返り値を書き換えてもストアの内部状態は変わらない", () => {
    listTodos()[0].title = "改ざん";
    getTodo("2")!.done = true;
    expect(getTodo("1")?.title).toBe("牛乳を買う");
    expect(getTodo("2")?.done).toBe(false);
  });
});
