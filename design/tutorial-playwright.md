# Playwright チュートリアル・ハンズオン (mini-todo 版)

mini-todo を題材に、Playwright による E2E テストを「読む → 動かす → 書く → 応用する」の順で学ぶ。

- 対象: Web 開発経験 3 年程度 / JavaScript・TypeScript・HTML・CSS・Node.js・Git は一通り分かる / E2E テストは未経験
- 環境: Windows + WSL2 (Ubuntu)。コマンドはすべて WSL のターミナルで実行する
- 方針: 要点と最小の手順のみ。演習の解答は文書末尾に載せている (先に自力で書いてから見ること)
- 動作確認済みバージョン: Node.js 22 / Next.js 16.4 / `@playwright/test` 1.64

## 学習の流れ

| 章 | 内容 | 目安 |
| --- | --- | --- |
| 1 | Playwright の概要 | 読むだけ |
| 2 | 環境構築 | 手を動かす |
| 3 | 基本的な起動と終了 | 手を動かす |
| 4 | 既存の E2E テストを実行する | 手を動かす |
| 5 | E2E テストを自作する (演習 1〜3) | 手を動かす |
| 6 | 応用編 (演習 4〜7) | 手を動かす |
| 7 | 次に学習すべきこと | 読むだけ |
| 8 | 演習の解答 | 答え合わせ |

---

## 1. Playwright の概要

### 1.1 何か

Playwright は、ブラウザを自動操作してアプリを実際のユーザーと同じ経路で検証する、E2E (End-to-End) テストのフレームワーク。

- Chromium / Firefox / WebKit (Safari 相当) を 1 つの API で操作できる
- `@playwright/test` にテストランナー・アサーション・レポート・トレースが同梱されている (Jest 等を別途用意しなくてよい)
- 言語は TypeScript / JavaScript のほか Python・Java・.NET にも対応する (本書は TypeScript)

### 1.2 単体テストとの違い

| | 単体テスト (Jest / Vitest 等) | E2E テスト (Playwright) |
| --- | --- | --- |
| 対象 | 関数・コンポーネント | 画面 + API + サーバー全体 |
| 速度 | 速い (ms) | 遅い (秒) |
| 壊れる理由 | ロジックの誤り | 画面・通信・タイミング・環境 |
| 得意なこと | 細かい分岐の網羅 | 「ユーザーが目的を達成できるか」の保証 |

E2E は遅く不安定になりやすいので、重要な導線に絞り、細かい分岐は単体テストに任せるのが基本。

### 1.3 重要な考え方 (先に知っておくと楽になる)

1. **自動待機 (auto-waiting)**: `click()` などの操作は、要素が表示・有効・安定するまで自動で待つ。`sleep` は原則書かない。
2. **Web ファーストのアサーション**: `await expect(locator).toHaveText(...)` は条件を満たすまで再試行する (既定 5 秒)。「今の値を 1 回だけ比べる」のではなく「満たされるまで待つ」。
3. **Locator はユーザーの見え方で探す**: CSS セレクターより「役割 (role) と名前」を優先する。画面の壊れにくい指定になり、アクセシビリティの確認にもなる。
4. **テストごとに独立したブラウザコンテキスト**: Cookie やストレージは各テストで新品になる (必要なら明示的に引き継ぐ)。

---

## 2. 環境構築

### 2.1 必要なもの

| 項目 | 内容 |
| --- | --- |
| WSL2 (Ubuntu) | プロジェクトは WSL のファイルシステム内 (`/home/<user>/...`) に置く。`/mnt/c/...` 配下は遅いので使わない |
| Node.js 22 | WSL 内に nvm で導入する |
| Git | リポジトリの取得用 |
| VS Code (任意) | Remote - WSL 拡張。Playwright Test for VS Code 拡張があると、テストの実行・デバッグが GUI でできる |

### 2.2 手順

```bash
# 1) Node.js (WSL 内)。入っていれば不要
nvm install 22
nvm use 22

# 2) WSL の node / npm を使っているか確認する (重要)
which node npm        # → ~/.nvm/... を指すこと。/mnt/c/Program Files/nodejs/ なら NG

# 3) リポジトリを取得して依存をインストール
git clone https://github.com/bardblue0821/mini-todo.git ~/code/mini-todo
cd ~/code/mini-todo
npm install

# 4) Playwright のブラウザ (Chromium) を取得する
npx playwright install chromium

# 5) ブラウザの起動に必要な OS ライブラリ (Ubuntu / WSL で初回のみ。sudo が必要)
sudo env "PATH=$PATH" npx playwright install-deps chromium
```

- `which node npm` が Windows 側を指すと、パス変換・ネイティブバイナリの OS 違い・遅い I/O で正しく動かない。
- 手順 4 で取得したブラウザはリポジトリの外 (`~/.cache/ms-playwright`) に保存される。
- 手順 5 を忘れると、起動時に「共有ライブラリが見つからない」という趣旨のエラーが出る。

### 2.3 (参考) 空のプロジェクトに導入する場合

mini-todo にはすでに設定済みなので実行不要。新規プロジェクトでは次のとおり。

```bash
npm init playwright@latest   # 対話形式で設定ファイルとサンプルテストを生成する
```

### 2.4 mini-todo の設定を読む

[playwright.config.ts](../playwright.config.ts) を開き、次の項目を確認する。

| 設定 | 意味 |
| --- | --- |
| `testDir: "./tests"` | テストの置き場所 |
| `use.baseURL` | `page.goto("/todos")` のように相対パスで書ける |
| `use.locale / timezoneId / colorScheme` | 実行環境による差をなくす (日本語・JST・ライト固定) |
| `projects` | `setup` (ログイン) → `chromium` (本編) の 2 段構成。`dependencies` で順序を保証する |
| `webServer` | テスト前に `npm run dev` を自動で起動する。すでに起動中なら再利用する (`reuseExistingServer`) |
| `fullyParallel: true` | テストを並列に実行する (第 6.6 節) |
| `reporter` | 標準出力 (list) と HTML レポート |

### 2.5 動作確認

```bash
npx playwright --version      # Version 1.64.0
npx playwright test --list    # テスト一覧が出れば設定は読めている
```

---

## 3. 基本的な起動と終了

### 3.1 アプリ (被テスト側) の起動と終了

```bash
npm run dev       # http://localhost:3000 で起動。停止は Ctrl+C
```

ブラウザで http://localhost:3000 を開き、**テストを書く前に自分の手で一通り操作する**。

- ログイン: ユーザー名 `user` / パスワード `password`
- 一覧で、追加・完了切替・削除・タブ切替を試す。タイトルをクリックすると詳細 (メモ保存) へ進む
- データはメモリ上にあり、サーバーを再起動すると初期状態 (3 件) に戻る

### 3.2 テストの実行と終了

テスト実行時は Playwright が dev サーバーを自動起動し、終了時に停止する (ただし第 2.4 節のとおり、すでに起動していれば再利用し、停止しない)。

```bash
npx playwright test                            # 全テスト (ヘッドレス)
npx playwright test tests/step01-about.spec.ts # ファイル指定
npx playwright test -g "h1"                    # テスト名で絞り込み
npx playwright test --headed                   # ブラウザを表示して実行 (WSLg が必要)
npx playwright test --ui                       # UI モード (WSLg が必要)
npx playwright test --reporter=list            # 1 テスト 1 行の出力
```

- 実行中の停止は Ctrl+C。
- 終了コード: 全件成功なら `0`、失敗があれば `1`。CI はこの値で成否を判定する。
- ブラウザが WSL で表示できない場合 (WSLg 未対応) は、ヘッドレス実行と次の HTML レポート / トレースで代用する。

```bash
npx playwright show-report     # 直前の HTML レポートを開く。表示された URL を Windows のブラウザで開く
```

### 3.3 よくある起動トラブル

| 症状 | 原因と対処 |
| --- | --- |
| ブラウザ起動時に共有ライブラリのエラー | 第 2.2 節の手順 5 (`install-deps`) を実行する |
| `Executable doesn't exist` | 手順 4 (`npx playwright install chromium`) を実行する |
| `http://localhost:3000 is already used` 系 | 別プロセスが 3000 番を使っている。`pkill -f next-server` で止める |
| 以前の実行が残って動作が変 | `pkill -f "playwright test"; pkill -f next-server` で掃除してから再実行する |

---

## 4. 既存の E2E テストを実行する

### 4.1 最初のテストを読む

[tests/step01-about.spec.ts](../tests/step01-about.spec.ts) を開く。

```ts
import { test, expect } from "@playwright/test";

test.describe("About ページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/about");                       // ① ページを開く
  });

  test("h1 に 'About' が表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("About");  // ② 探す + ③ 検証
  });
});
```

テストの基本形は次の 3 ステップ。

1. **操作**: `page.goto(...)` / `click()` / `fill()` など
2. **探す**: `page.getByRole(...)` などで Locator を得る
3. **検証**: `await expect(locator).toXxx()` で期待する状態を確かめる

`page` は「テストごとに新しく用意されたブラウザタブ」で、テスト関数の引数として受け取る (これが fixture)。

### 4.2 実行する

```bash
npx playwright test tests/step01-about.spec.ts --reporter=list
```

期待結果: `setup` の 1 件 + `step01` の 3 件が成功 (`4 passed`)。

### 4.3 わざと失敗させる

1. [tests/step01-about.spec.ts](../tests/step01-about.spec.ts) の `toHaveText("About")` を `toHaveText("Abouttt")` に書き換える
2. もう一度実行する
3. 失敗メッセージを読む。`Expected` / `Received` / 5 秒間再試行したこと / 失敗した行が出る
4. `npx playwright show-report` で、失敗時のスクリーンショットなどを確認する
5. `git checkout tests/step01-about.spec.ts` で元に戻す

「失敗の読み方」を先に知っておくと、以降のデバッグが速くなる。

### 4.4 認証済みの状態で始まる仕組み

step01 は認証不要だが、他のテストは `/todos` を直接開ける。ログイン操作をしていないのはなぜか。

- [tests/auth.setup.ts](../tests/auth.setup.ts) が、全テストの前に 1 度だけログインし、Cookie を `playwright/.auth/user.json` に保存する
- `chromium` プロジェクトは `storageState` でそれを読み込んでから各テストを始める

詳細は第 6.3 節。

### 4.5 ほかのテストも読む

`tests/` の学習用テストは、番号順に 1 つずつ要素を足す構成になっている。冒頭コメントの「学習ポイント」を目安に読む。

| ファイル | 学べること |
| --- | --- |
| step01-about | 最小のテスト、タイトル・見出し・画像 |
| step02-login | フォーム入力、エラー表示、リダイレクト、ネットワーク監視 |
| step03-navigation | リンク遷移、URL の検証、リダイレクト、API でログイン状態を作る |
| step04-auth-reuse | 認証状態の再利用 |
| step05-todos | 複数要素、チェックボックス、CSS の検証 |
| step06-dialog | `confirm` ダイアログの扱い |
| step07-filter | タブ、URL クエリ、戻る・進む |
| step08-mock-api | `page.route` による通信のモック |
| step09-api | `request` による API テスト |
| step10-page-object | Fixture と Page Object |
| step11-visual | スクリーンショット比較 |
| step13-parallel | 並列実行とデータ分離 |

---

## 5. E2E テストを自作する

ここからは自分でテストを書く。新規ファイル `tests/practice.spec.ts` を作り、演習ごとに追記する。

### 5.1 書き始める前の準備

先頭は次のとおり。`@playwright/test` ではなく `./fixtures` から import する。

```ts
import { test, expect } from "./fixtures";
```

[tests/fixtures.ts](../tests/fixtures.ts) は標準の `test` を拡張したもので、次の 2 つを自動で行う。

- テストごとにデータを初期状態 (3 件) に戻す
- テストごとに別のデータ領域を使い、並列に実行しても干渉しない

標準の `test` を使うと、他のテストと同じデータを読み書きして不安定になることがある。

### 5.2 Locator の選び方 (優先順位)

| 優先 | 書き方 | 例 |
| --- | --- | --- |
| 1 | role + name | `getByRole("button", { name: "追加" })` |
| 2 | ラベル | `getByLabel("メモ")` |
| 3 | プレースホルダー / テキスト | `getByPlaceholder("新しいタスク")` / `getByText("読み込み中...")` |
| 4 | test id | `getByTestId("todo-item")` (意味のない一覧要素向け) |
| 最終手段 | CSS / XPath | `locator(".foo > li")` |

注意点:

- `name` は既定で**部分一致**。`"完了"` は `"未完了"` にも一致するので、完全一致したいときは `{ exact: true }` を付ける。
- 複数一致すると strict モード違反で失敗する。絞り込みは `filter({ hasText })`、`nth()`、`first()`、`last()` を使う。
- 画面にない要素を探す手がかりは、ブラウザの開発者ツールの「Accessibility」ツリーや、第 6.7 節の codegen が便利。

### 5.3 よく使う操作と検証

```ts
// 操作
await page.goto("/todos");
await locator.click();
await locator.fill("文字");            // 入力欄を上書き
await locator.check();                 // チェックボックスをオン (click との違いは後述)
await page.reload();

// 検証 (すべて再試行される)
await expect(locator).toBeVisible();
await expect(locator).toHaveText("残り 2 件");            // 完全一致 (配列も可)
await expect(locator).toContainText("牛乳");               // 部分一致
await expect(locator).toHaveCount(3);
await expect(locator).toBeChecked();
await expect(locator).toBeEnabled();
await expect(page).toHaveURL("/todos");
await expect(page).toHaveTitle("About | Mini Todo");
```

「ない」ことの検証は `toHaveCount(0)` か `toBeHidden()` を使う。`not.toBeVisible()` でも書けるが、意図が伝わりやすい前者を勧める。

### 演習 1: タスクを追加する

目標: 「新しいタスク」に `Playwright を学ぶ` と入力して追加すると、末尾に表示され、「残り 3 件」になる。

ヒント:

- 入力欄は `getByRole("textbox", { name: "新しいタスク" })`
- 初期状態は 3 件 (未完了 2 件)。追加後は 4 件
- 末尾の要素は `getByTestId("todo-item").last()`

### 演習 2: 完了にして「完了」タブで確認する

目標: 「牛乳を買う」を完了にし、「完了」タブで 2 件 (牛乳を買う・散歩する) が表示されることを確かめる。

ヒント:

- チェックボックスは `getByRole("checkbox", { name: "牛乳を買う" })`
- タブは `getByRole("tab", { name: "完了", exact: true })`。`exact` を付けないと「未完了」にも一致する
- URL に `filter=completed` が付く

### 演習 3: 詳細画面でメモを保存する

目標: 一覧から「レポートを書く」を開き、メモ欄に入力して保存すると、トースト「保存しました」が表示される。

ヒント:

- 遷移先の URL は `/todos/2`
- メモ欄は `getByLabel("メモ")`、保存は `getByRole("button", { name: "保存" })`

### 5.4 つまずきやすい点

- **`check()` と `click()`**: `check()` は操作後に「チェック済みか」を再確認する。操作で要素が消える・入れ替わる場合は `click()` を使う。
- **楽観的更新**: このアプリのチェックボックスは、サーバー応答より先に画面が変わる。画面の変化だけを確認して `reload()` すると、保存が間に合っていないことがある (第 8 章の解答参照)。
- **追加直後の件数確認**: 連続で追加するときは、1 件追加するたびに件数を検証してから次へ進む。
- **`sleep` / `waitForTimeout` は使わない**: 待つべき状態 (表示・件数・URL・応答) を `expect` で書く。

---

## 6. 応用編

### 6.1 通信のモック (`page.route`) — 演習 4

実サーバーでは再現しにくい状況 (エラー・空データ・遅延) を、通信を差し替えて再現する。

```ts
await page.route("**/api/todos", (route) => {
  if (route.request().method() !== "GET") return route.fallback();  // GET 以外は素通し
  return route.fulfill({ status: 500, json: { error: "boom" } });
});
await page.goto("/todos");
```

- `route.fulfill()`: 偽の応答を返す / `route.continue()`: そのまま通す / `route.abort()`: 通信失敗にする
- `route.fallback()`: 条件に合わないときに、次のハンドラーまたは実通信へ回す
- **`goto()` より前に** `route` を登録する
- 実装は [tests/step08-mock-api.spec.ts](../tests/step08-mock-api.spec.ts)。応答を保留して「読み込み中」を検証する例もある

演習 4: 一覧 API が 500 を返したとき、「Todo の取得に失敗しました」が表示され、一覧が 0 件になることを確かめる。

### 6.2 API テスト (`request`) — 演習 5

画面を使わず HTTP だけを検証する。画面より速く、入力検証の網羅に向く。

```ts
test("例", async ({ request }) => {
  const res = await request.post("/api/todos", { data: { title: "" } });
  expect(res.status()).toBe(400);
});
```

- `request` は `page` と同じ認証 Cookie を使う (`storageState` が効く)
- 実装は [tests/step09-api.spec.ts](../tests/step09-api.spec.ts)

演習 5: `title` が空の `POST /api/todos` が 400 を返し、エラー本文があり、一覧が増えていないことを確かめる。

### 6.3 認証状態の再利用 (`storageState`)

毎テストでログイン画面を操作すると遅く、ログイン画面の不具合で全テストが落ちる。

1. `setup` プロジェクトでログインし、`storageState` ファイルに Cookie を保存する (`tests/auth.setup.ts`)
2. 本編のプロジェクトは、そのファイルを読み込んで始める (`playwright.config.ts` の `storageState`)
3. 未ログインの挙動を検証したいテストだけ、`test.use({ storageState: { cookies: [], origins: [] } })` で空にする

保存ファイル (`playwright/.auth/`) は認証情報なので Git に含めない (`.gitignore` 済み)。

### 6.4 Fixture と Page Object — 演習 6

同じ操作・Locator が複数のテストに出てきたら、集約する。

- **Page Object**: 画面ごとのクラスに Locator と操作を集める ([tests/pages/TodoPage.ts](../tests/pages/TodoPage.ts))。画面が変わっても、修正箇所はクラス内だけになる
- **Fixture**: `test.extend` で、テストに渡す部品や前処理を定義する ([tests/fixtures.ts](../tests/fixtures.ts))。`auto: true` を付けると、全テストで自動実行される

```ts
test("追加", async ({ todoPage }) => {
  await todoPage.goto();
  await todoPage.add("お風呂を洗う");
  await expect(todoPage.items).toHaveCount(4);
});
```

Page Object には「操作」を書き、「検証」はテスト側に書くのが基本。検証まで隠すと、テストを読んでも何を保証しているのか分からなくなる。

演習 6: `todoPage` を使い、「A」「B」の 2 件を続けて追加し、5 件になること、「A」を完了にすると「残り 3 件」になることを確かめる。

### 6.5 スクリーンショット比較 — 演習 7

見た目の崩れを検出する。初回は基準画像がなく失敗し、基準画像が生成される。

```ts
await expect(page).toHaveScreenshot("detail.png", { fullPage: true });
```

```bash
npx playwright test tests/practice.spec.ts --update-snapshots   # 基準画像を作る / 更新する
```

- 基準画像は `tests/<ファイル名>-snapshots/` に作られ、Git にコミットする。意図した見た目の変更では、更新して差分をレビューする
- **OS・ブラウザごとに別ファイル** (`...-chromium-linux.png`)。WSL (Linux) で作った画像は Windows や macOS では使えない。CI も Linux にそろえる
- アニメーションは既定で無効化される。動的な日時などは `mask: [locator]` で隠す
- **安定させる鍵は、撮影前に「画面が完成した」ことを待つこと**。このアプリは、操作可能になる (ハイドレーション完了) まで一部のボタンが無効表示になる。待たずに撮ると、ボタンの見た目が違う画像になり、まれに失敗する。`toBeEnabled()` などで完成を待ってから撮る
- 開発モードの Next.js の「N」バッジが写り込むため、`next.config.ts` で `devIndicators: false` にしている
- 実装は [tests/step11-visual.spec.ts](../tests/step11-visual.spec.ts)

演習 7: `/todos/1` の詳細画面を撮影して比較する。

### 6.6 並列実行とデータ分離

並列実行は速いが、全テストが同じサーバーのデータを触ると互いに干渉する (追加したタスクが、他のテストの件数検証を壊すなど)。

このアプリでは次の方式で分離している。

1. [tests/fixtures.ts](../tests/fixtures.ts) が、テストごとに一意の `x-test-scope` ヘッダーを、すべてのリクエストに付与する (`extraHTTPHeaders`)
2. サーバーはスコープごとに別のデータ領域を持つ ([src/lib/scope.ts](../src/lib/scope.ts))。本番ではこのヘッダーを無視する
3. 各テストの開始前に、自分のスコープだけを初期化する (`resetData` の auto fixture)

並列まわりの設定:

```ts
// playwright.config.ts
fullyParallel: true,        // ファイル内のテストも並列にする
// workers は既定 (CPU コア数の半分)。--workers=1 で直列にできる

// 互いに依存する一連のテストだけ直列にする
test.describe.configure({ mode: "serial" });   // 途中で失敗すると残りはスキップされる
```

- 実装とデモは [tests/step13-parallel.spec.ts](../tests/step13-parallel.spec.ts)
- 安定性の確認は `--repeat-each=10 --workers=4` のように、繰り返して負荷をかける
- リトライ (`retries`) は不安定さを隠すだけなので、原因を直すのが先。CI での一時的な失敗の保険として使う

### 6.7 デバッグ

| 手段 | コマンド / 設定 | 使いどころ |
| --- | --- | --- |
| UI モード | `npx playwright test --ui` | 各ステップの前後の DOM を、時系列で見る。ウォッチ実行にも使える (WSLg 必要) |
| ヘッド付き実行 | `--headed` (+ `--debug` で 1 ステップずつ) | 実際の動きを目で見る (WSLg 必要) |
| Trace Viewer | `--trace on` → `npx playwright show-trace <trace.zip>` | 失敗の原因調査。ヘッドレスでも使える。WSLg がなければ https://trace.playwright.dev に zip を読み込ませる |
| HTML レポート | `npx playwright show-report` | 失敗時のスクリーンショット・動画・エラーの確認 |
| codegen | `npx playwright codegen http://localhost:3000` | 操作を記録して、テストコードと Locator の候補を得る (WSLg 必要) |
| `page.pause()` | テスト中に挿入 | その場で止めて、Inspector で調べる (headed のみ) |

- 設定の `trace: "on-first-retry"` は、リトライ時のみトレースを保存する。ローカルで調べたいときは `--trace on` を付ける。
- トレースは、`test-results/<テスト名>/trace.zip` に出力される。
- codegen の出力はそのまま使わず、第 5.2 節の優先順位とテストの意図に沿って書き直す。

### 6.8 CI (GitHub Actions) で実行する

以下は構成例。この環境では実行しておらず、`.github/workflows/` には含まれていない。導入時に自分のリポジトリで確かめること。

```yaml
# .github/workflows/e2e.yml
name: e2e
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
```

- `playwright.config.ts` は `process.env.CI` を見て、`forbidOnly`(`test.only` の混入を禁止)・`retries: 2` を有効にし、`webServer` の再利用をやめる
- スクリーンショットの基準画像は Linux 版を使う。ローカルが WSL (Ubuntu) であれば、CI の `ubuntu-latest` と OS はそろう。ただしフォントの違いで差が出ることがあるため、初回の CI で確認すること
- 失敗時の調査用に、レポートとトレースを成果物として保存する

---

## 7. 次に学習すべきこと

学習の優先順位の目安。

1. **自分のプロジェクトで 1 本書く**: ログイン → 主要な 1 導線 (例: 購入・申請) だけのスモークテストから始める
2. **テスト設計**: 何を E2E で守り、何を単体・API テストに任せるか (テストピラミッド)。「壊れたら困る導線」だけを選ぶ
3. **安定化の技術**: 自動待機の仕組み、`expect.poll`、`waitForResponse` で応答を待つ方法、テストデータの作り方 (API で準備する)
4. **複数ブラウザ・デバイス**: `projects` に Firefox / WebKit / モバイル端末を追加する (`devices`)
5. **アクセシビリティ検査**: `@axe-core/playwright` による自動チェック
6. **コンポーネントテスト** (実験的): `@playwright/experimental-ct-react` など
7. **大規模化**: シャーディング (`--shard`)、レポートのマージ (blob レポート)、フレーキー対策の運用
8. **公式ドキュメント**: https://playwright.dev/docs/intro (特に Best Practices / Locators / Assertions / Fixtures)

---

## 8. 演習の解答

一例であり、これ以外の書き方でもよい。先に自力で書き、動かしてから見比べる。ここに載せたコードは、実際にこのリポジトリで実行し、成功することを確認している (演習 7 は基準画像の生成後に、60 回連続で成功)。

### 演習 1〜7 (`tests/practice.spec.ts`)

```ts
import { test, expect } from "./fixtures";

test("演習1: タスクを追加できる", async ({ page }) => {
  await page.goto("/todos");
  await page.getByRole("textbox", { name: "新しいタスク" }).fill("Playwright を学ぶ");
  await page.getByRole("button", { name: "追加" }).click();

  await expect(page.getByTestId("todo-item")).toHaveCount(4);
  await expect(page.getByTestId("todo-item").last()).toContainText("Playwright を学ぶ");
  await expect(page.getByTestId("remaining-count")).toHaveText("残り 3 件");
});

test("演習2: 完了にすると「完了」タブに移る", async ({ page }) => {
  await page.goto("/todos");
  await page.getByRole("checkbox", { name: "牛乳を買う" }).click();
  await expect(page.getByTestId("remaining-count")).toHaveText("残り 1 件");

  await page.getByRole("tab", { name: "完了", exact: true }).click();
  await expect(page).toHaveURL(/filter=completed/);
  await expect(page.getByTestId("todo-item")).toHaveCount(2);
  await expect(page.getByTestId("todo-item")).toContainText(["牛乳を買う", "散歩する"]);
});

test("演習3: メモを保存するとトーストが出る", async ({ page }) => {
  await page.goto("/todos");
  await page.getByRole("link", { name: "レポートを書く" }).click();
  await expect(page).toHaveURL("/todos/2");

  await page.getByLabel("メモ").fill("金曜まで");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();
});

test("演習4: 一覧 API が 500 のときエラー表示になる", async ({ page }) => {
  await page.route("**/api/todos", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({ status: 500, json: { error: "boom" } });
  });

  await page.goto("/todos");
  await expect(page.getByText("Todo の取得に失敗しました")).toBeVisible();
  await expect(page.getByTestId("todo-item")).toHaveCount(0);
});

test("演習5: title が空だと POST は 400", async ({ request }) => {
  const res = await request.post("/api/todos", { data: { title: "" } });
  expect(res.status()).toBe(400);
  expect(await res.json()).toEqual({ error: expect.any(String) });

  const list = await (await request.get("/api/todos")).json();
  expect(list).toHaveLength(3);
});

test("演習6: Page Object で追加と完了", async ({ todoPage }) => {
  await todoPage.goto();
  await todoPage.add("A");
  await expect(todoPage.items).toHaveCount(4);   // 1 件ずつ確認してから次へ進む
  await todoPage.add("B");
  await expect(todoPage.items).toHaveCount(5);
  await todoPage.toggle("A");
  await expect(todoPage.remaining).toHaveText("残り 3 件");
});

test("演習7: 詳細画面のスクリーンショット", async ({ page }) => {
  await page.goto("/todos/1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("牛乳を買う");
  await expect(page.getByRole("button", { name: "保存" })).toBeEnabled(); // ハイドレーション完了を待つ
  await expect(page).toHaveScreenshot("detail.png", { fullPage: true });
});
```

実行方法:

```bash
npx playwright test tests/practice.spec.ts --reporter=list
# 演習 7 は初回に基準画像がなく失敗する。次のコマンドで生成してから、再実行する
npx playwright test tests/practice.spec.ts -g "演習7" --update-snapshots
```

### 解説

- **演習 1**: `last()` で末尾を指定し、件数と「残り」の両方を検証している。
- **演習 2**: 完了タブの `exact: true` が要点。`toContainText` に配列を渡すと、順序つきで各要素を検証できる。
- **演習 3**: 遷移後に `toHaveURL` で到達を待ってから操作する。保存直後のトーストは、約 2 秒で消えるので、`toBeVisible()` は表示された直後に検証する。
- **演習 4**: `route.fallback()` で GET 以外を実通信へ回している。登録は `goto()` の前。
- **演習 5**: ブラウザを起動しないため速い。「追加されていない」副作用も、一覧の件数で確認している。
- **演習 6**: 連続追加の間に件数を検証している。1 件目の追加が完了する前に、2 件目の `fill()` と `click()` を行うと、1 件目の完了時に入力欄が空に戻されて「追加」ボタンが無効になり、`click()` が待ち続けてタイムアウトする (検証中に実際に起きた)。
- **演習 7**: 撮影前に「保存」ボタンの有効化を待つ。待たずに撮ると、ハイドレーション前後でボタンの見た目が変わるため、まれに差分で失敗した (調査して原因を特定済み)。

### 楽観的更新のテストで、リロード前に待つべきもの

チェックボックスの切替は、サーバーの応答前に画面が変わる。「リロードしても保持される」を検証するときは、`PATCH` の完了を待ってから `reload()` する。

```ts
const saved = page.waitForResponse((res) => res.request().method() === "PATCH" && res.ok());
await page.getByRole("checkbox", { name: "レポートを書く" }).check();
await expect(page.getByTestId("remaining-count")).toHaveText("残り 1 件");
await saved;                 // サーバーへの反映を待つ
await page.reload();
await expect(page.getByRole("checkbox", { name: "レポートを書く" })).toBeChecked();
```

実例は [tests/step05-todos.spec.ts](../tests/step05-todos.spec.ts) の「完了状態はリロードしても保持される」。並列実行にしたことで、この待ち漏れが顕在化した。
