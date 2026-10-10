import { test, expect } from "./fixtures";

// Step 9: API テスト
// 学習ポイント: `request` fixture / ステータスと body の検証 / 認証の有無 / テスト間のデータ初期化
// 既定の storageState (ログイン済み) の Cookie が `request` にも自動で付く。
test.beforeEach(async ({ request }) => {
  const res = await request.post("/api/test/reset");
  expect(res.status()).toBe(204);
});

test.describe("未認証", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const cases = [
    { method: "GET", path: "/api/todos" },
    { method: "POST", path: "/api/todos", data: { title: "x" } },
    { method: "PATCH", path: "/api/todos/1", data: { done: true } },
    { method: "DELETE", path: "/api/todos/1" },
  ] as const;

  for (const { method, path, ...rest } of cases) {
    test(`${method} ${path} は 401`, async ({ request }) => {
      const res = await request.fetch(path, { method, ...rest });
      expect(res.status()).toBe(401);
      expect(await res.json()).toEqual({ error: expect.any(String) });
    });
  }

  test("改ざんした Cookie では 401", async ({ request }) => {
    const res = await request.get("/api/todos", {
      headers: { cookie: "session=forged.value" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("GET /api/todos", () => {
  test("200 で初期データ 3 件を返す", async ({ request }) => {
    const res = await request.get("/api/todos");
    expect(res.status()).toBe(200);
    const todos = await res.json();
    expect(todos).toEqual([
      expect.objectContaining({ id: "1", title: "牛乳を買う", done: false, memo: "" }),
      expect.objectContaining({ id: "2", title: "レポートを書く", done: false, memo: "" }),
      expect.objectContaining({ id: "3", title: "散歩する", done: true, memo: "" }),
    ]);
    for (const todo of todos) {
      expect(new Date(todo.createdAt).toISOString()).toBe(todo.createdAt);
    }
  });

  test("意図的に 500ms 以上かかる", async ({ request }) => {
    const start = Date.now();
    await request.get("/api/todos");
    expect(Date.now() - start).toBeGreaterThanOrEqual(490);
  });
});

test.describe("POST /api/todos", () => {
  test("201 で作成した Todo を返し、一覧に追加される", async ({ request }) => {
    const res = await request.post("/api/todos", { data: { title: "新しいタスク" } });
    expect(res.status()).toBe(201);
    const created = await res.json();
    expect(created).toMatchObject({ title: "新しいタスク", done: false, memo: "" });
    expect(created.id).toEqual(expect.any(String));

    const list = await (await request.get("/api/todos")).json();
    expect(list).toHaveLength(4);
    expect(list.at(-1)).toEqual(created);
  });

  test("title の前後の空白は取り除かれる", async ({ request }) => {
    const res = await request.post("/api/todos", { data: { title: "  空白あり  " } });
    expect((await res.json()).title).toBe("空白あり");
  });

  test("100 文字ちょうどは 201", async ({ request }) => {
    const res = await request.post("/api/todos", { data: { title: "あ".repeat(100) } });
    expect(res.status()).toBe(201);
  });

  const invalid: Array<[string, unknown]> = [
    ["空文字", { title: "" }],
    ["空白のみ", { title: "   " }],
    ["101 文字", { title: "あ".repeat(101) }],
    ["title なし", {}],
    ["title が数値", { title: 1 }],
  ];
  for (const [name, data] of invalid) {
    test(`${name}は 400 で、追加されない`, async ({ request }) => {
      const res = await request.post("/api/todos", { data: data as object });
      expect(res.status()).toBe(400);
      expect(await res.json()).toEqual({ error: expect.any(String) });
      expect(await (await request.get("/api/todos")).json()).toHaveLength(3);
    });
  }

  test("JSON でない body は 400", async ({ request }) => {
    const res = await request.post("/api/todos", {
      headers: { "content-type": "application/json" },
      data: "not json",
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("PATCH /api/todos/:id", () => {
  test("done を更新でき、他の項目は変わらない", async ({ request }) => {
    const res = await request.patch("/api/todos/1", { data: { done: true } });
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ id: "1", title: "牛乳を買う", done: true, memo: "" });
  });

  test("title と memo を更新でき、再取得しても保持される", async ({ request }) => {
    const res = await request.patch("/api/todos/2", { data: { title: "改題", memo: "メモ" } });
    expect(res.status()).toBe(200);
    const list = await (await request.get("/api/todos")).json();
    expect(list.find((t: { id: string }) => t.id === "2")).toMatchObject({
      title: "改題",
      memo: "メモ",
    });
  });

  test("存在しない id は 404", async ({ request }) => {
    const res = await request.patch("/api/todos/nope", { data: { done: true } });
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: expect.any(String) });
  });

  const invalid: Array<[string, unknown]> = [
    ["done が文字列", { done: "yes" }],
    ["title が空", { title: "" }],
    ["title が 101 文字", { title: "あ".repeat(101) }],
    ["memo が数値", { memo: 1 }],
    ["更新項目なし", {}],
  ];
  for (const [name, data] of invalid) {
    test(`${name}は 400 で、変更されない`, async ({ request }) => {
      const res = await request.patch("/api/todos/1", { data: data as object });
      expect(res.status()).toBe(400);
      expect(await res.json()).toEqual({ error: expect.any(String) });
      const list = await (await request.get("/api/todos")).json();
      expect(list[0]).toMatchObject({ title: "牛乳を買う", done: false, memo: "" });
    });
  }

  test("JSON でない body は 400", async ({ request }) => {
    const res = await request.patch("/api/todos/1", {
      headers: { "content-type": "application/json" },
      data: "not json",
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("DELETE /api/todos/:id", () => {
  test("204 (body なし) で削除され、一覧から消える", async ({ request }) => {
    const res = await request.delete("/api/todos/2");
    expect(res.status()).toBe(204);
    expect(await res.text()).toBe("");

    const list = await (await request.get("/api/todos")).json();
    expect(list.map((t: { id: string }) => t.id)).toEqual(["1", "3"]);
  });

  test("存在しない id は 404 (2 回目の削除も 404)", async ({ request }) => {
    const missing = await request.delete("/api/todos/nope");
    expect(missing.status()).toBe(404);
    expect(await missing.json()).toEqual({ error: expect.any(String) });

    expect((await request.delete("/api/todos/1")).status()).toBe(204);
    expect((await request.delete("/api/todos/1")).status()).toBe(404);
  });
});

test.describe("POST /api/test/reset", () => {
  test("追加・更新・削除を初期状態に戻す", async ({ request }) => {
    await request.post("/api/todos", { data: { title: "追加" } });
    await request.patch("/api/todos/1", { data: { done: true } });
    await request.delete("/api/todos/3");

    await request.post("/api/test/reset");

    const list = await (await request.get("/api/todos")).json();
    expect(list.map((t: { id: string; done: boolean }) => [t.id, t.done])).toEqual([
      ["1", false],
      ["2", false],
      ["3", true],
    ]);
  });
});
