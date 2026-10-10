import { test as base } from "@playwright/test";
import { TodoPage } from "./pages/TodoPage";

type Fixtures = {
  todoPage: TodoPage;
  resetData: void;
};

/**
 * 独自 fixture。spec では `@playwright/test` ではなくこのファイルから test / expect を import する。
 * - extraHTTPHeaders: テストごとに一意な x-test-scope を付ける。page / request の両方に効き、
 *   サーバーはスコープごとに別のデータを持つため、並列実行しても互いに干渉しない
 * - todoPage: TodoPage を提供する
 * - resetData: auto: true のため、各テストの開始前に必ず自分のスコープのデータを初期化する
 */
export const test = base.extend<Fixtures>({
  extraHTTPHeaders: async ({}, use, testInfo) => {
    const scope = `t-${testInfo.testId}-${testInfo.repeatEachIndex}-${testInfo.retry}`;
    await use({ "x-test-scope": scope });
  },
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
