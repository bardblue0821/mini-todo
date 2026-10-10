import { test as base } from "@playwright/test";
import { TodoPage } from "./pages/TodoPage";

type Fixtures = {
  todoPage: TodoPage;
  resetData: void;
};

/**
 * 独自 fixture。spec では `@playwright/test` ではなくこのファイルから test / expect を import する。
 * - todoPage: TodoPage を提供する
 * - resetData: auto: true のため、各テストの開始前に必ずサーバー側データを初期化する
 */
export const test = base.extend<Fixtures>({
  resetData: [
    async ({ request }, use) => {
      await request.post("/api/test/reset");
      await use();
    },
    { auto: true },
  ],
  todoPage: async ({ page }, use) => {
    await use(new TodoPage(page));
  },
});

export { expect } from "@playwright/test";
