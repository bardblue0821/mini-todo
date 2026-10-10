import type { Locator, Page } from "@playwright/test";

/** /todos 画面の Page Object。locator と操作をここに集約し、spec には「何をするか」だけを書く。 */
export class TodoPage {
  readonly items: Locator;
  readonly remaining: Locator;
  readonly newTaskInput: Locator;
  readonly addButton: Locator;

  constructor(private readonly page: Page) {
    this.items = page.getByTestId("todo-item");
    this.remaining = page.getByTestId("remaining-count");
    this.newTaskInput = page.getByRole("textbox", { name: "新しいタスク" });
    this.addButton = page.getByRole("button", { name: "追加" });
  }

  /** 一覧を開き、読み込み完了 (「読み込み中...」の消滅) まで待つ。 */
  async goto(filter?: "active" | "completed") {
    await this.page.goto(filter ? `/todos?filter=${filter}` : "/todos");
    await this.page.getByText("読み込み中...").waitFor({ state: "hidden" });
  }

  item(title: string): Locator {
    return this.items.filter({ hasText: title });
  }

  async add(title: string) {
    await this.newTaskInput.fill(title);
    await this.addButton.click();
  }

  async toggle(title: string) {
    await this.page.getByRole("checkbox", { name: title, exact: true }).click();
  }

  /** 削除ボタンを押し、confirm を accept / dismiss する。ハンドラーは click より前に登録する。 */
  async remove(title: string, { accept = true }: { accept?: boolean } = {}) {
    this.page.once("dialog", (dialog) => (accept ? dialog.accept() : dialog.dismiss()));
    await this.item(title).getByRole("button", { name: "削除" }).click();
  }

  async selectFilter(label: "すべて" | "未完了" | "完了") {
    await this.page.getByRole("tab", { name: label, exact: true }).click();
  }
}
