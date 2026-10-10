# Playwright 学習用 Next.js アプリ仕様 (program.md)

Playwright の主要機能を一通り試せるよう、小さな Next.js アプリ「Mini Todo」を作る。

## 1. 目的

- Playwright の E2E テストの書き方を段階的に学ぶ。
- アプリケーションは **TDD (テスト駆動開発)** で実装する。先に Playwright のテストを書いて失敗させ (Red)、最小限の実装で通し (Green)、整理する (Refactor)。
- テスト対象として、ログイン・フォーム・一覧操作・非同期通信・ダイアログなど、E2E テストで頻出の要素を最小構成で用意する。

## 2. 技術スタック

| 項目 | 内容 |
| --- | --- |
| フレームワーク | Next.js (App Router) |
| 言語 | TypeScript |
| スタイル | Tailwind CSS (ユーティリティクラスのみ。CSS Modules や独自 CSS は原則使わない) |
| UI コンポーネント | shadcn/ui (Radix UI ベース。`src/components/ui/` にコードを取り込んで使う) |
| データ保存 | サーバ側のインメモリ (DB 不使用) |
| API | Next.js Route Handlers (`app/api/**`) |
| E2E テスト | `@playwright/test` |
| ランタイム | Node.js 22 LTS (WSL 内に nvm で導入。Windows 側の node / npm は使わない) |
| パッケージマネージャ | npm |
| テスト言語 | TypeScript |
| テスト対象ブラウザ | Chromium のみ |

## 2.1 実行環境

- OS: WSL2 (Windows 上の Linux)。VS Code は Remote - WSL (VS Code Server) 経由で利用。
- プロジェクトの配置先: `/home/bardblue/code/mini-todo` (WSL のファイルシステム内。`/mnt/c/...` 配下は遅いため使わない)。
- Node.js は WSL 内に nvm で導入する (`nvm install 22`)。WSL の PATH には Windows 側の `npm` (`/mnt/c/Program Files/nodejs/`) が混ざるため、`which node npm` が `~/.nvm/...` を指すことを確認する。Windows の npm を WSL から使うとパス変換・OS 違いのネイティブバイナリ・遅い I/O で正しく動かない。
- ブラウザ表示は **ヘッドレスを基本** とする (表示環境が不明でも動くため)。
- headed / UI モードは WSLg (Windows 11 または対応済みの Windows 10) が有効な場合のみ使える。使えない場合は次の代替手段で学ぶ。
  - HTML レポート: `npx playwright show-report` で出力される URL を Windows 側のブラウザで開く。
  - トレース: `trace: "on"` で取得し、`npx playwright show-trace` または https://trace.playwright.dev に zip を読み込ませる。
  - 動作確認: `npx playwright test --ui` が起動するかを手順 12 の前に確認する。

## 3. セットアップ手順

```bash
cd /home/bardblue/code
npx create-next-app@latest mini-todo --ts --app --eslint --tailwind --src-dir --import-alias "@/*" --use-npm
cd mini-todo
npx shadcn@latest init       # ベースカラーは Neutral。3.2 を参照
npx shadcn@latest add button input label textarea checkbox tabs card sonner
npm init playwright@latest   # TypeScript / tests ディレクトリ / GitHub Actions は後で追加 / ブラウザ取得は Yes
```

ブラウザは Chromium のみ取得する。WSL に必要なシステムライブラリが足りない場合は sudo で依存関係も入れる。

```bash
npx playwright install --with-deps chromium
```

`playwright.config.ts` の `webServer` で開発サーバを自動起動する。

```ts
projects: [
  { name: "setup", testMatch: /auth\.setup\.ts/ },
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
    dependencies: ["setup"],
  },
],
webServer: {
  command: "npm run dev",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
},
use: { baseURL: "http://localhost:3000", trace: "on-first-retry", headless: true },
```

- Firefox / WebKit の project は定義しない (必要になったら後から追加する)。
- `playwright/.auth/` は `.gitignore` に追加する。

### 3.1 Tailwind CSS

- `create-next-app` の `--tailwind` で導入する (最新版の Tailwind を使う。`src/app/globals.css` に `@import "tailwindcss";` が入る)。
- スタイルは JSX の `className` にユーティリティクラスで記述する。繰り返しが多い場合のみコンポーネント化で共通化する (`@apply` は使わない)。
- ダークモード、アニメーション等の凝った装飾はしない。独自のアニメーション・トランジションは付けない (shadcn/ui が持つものは、ビジュアル比較で `toHaveScreenshot()` の既定 `animations: "disabled"` により無効化される)。
- テストでは Tailwind のクラス名をセレクターに使わない (`getByRole` / `getByLabel` / `data-testid` を使う)。
- 取り消し線など見た目だけで判別する仕様 (完了タスク) は、テスト用に `data-done="true"` 属性も付与し、クラス名ではなく属性で検証する。

### 3.2 shadcn/ui

- `create-next-app` の後に `npx shadcn@latest init` で導入する。`components.json`、`src/lib/utils.ts` (`cn()`)、`globals.css` のテーマ変数が生成される。
- 使うコンポーネントは `button` `input` `label` `textarea` `checkbox` `tabs` `card` `sonner` のみ。必要になった時点で `npx shadcn@latest add <name>` で追加する (先回りで追加しない)。
- 生成された `src/components/ui/*` は shadcn/ui の提供コードなので、原則編集せず、単体のテストも書かない。アプリ固有の見た目・構成は `src/components/` 側で組み合わせて作る。
- 画面ごとの利用コンポーネント

  | 画面・要素 | 使うコンポーネント |
  | --- | --- |
  | ログイン画面 | `Card`、`Label`、`Input`、`Button` |
  | Todo 追加フォーム | `Input`、`Button` |
  | Todo 一覧の行 | `Checkbox`、`Button` |
  | フィルタ | `Tabs` (`TabsList` / `TabsTrigger`。URL クエリと連動させる制御コンポーネントとして使う) |
  | 詳細画面 | `Card`、`Label`、`Textarea`、`Button` |
  | トースト「保存しました」 | `Sonner` (`duration` は 2000ms) |

- 削除確認は、学習ステップ 6 (`page.on("dialog")`) のため、`AlertDialog` ではなくブラウザ標準の `confirm` を使う。
- テスト上の注意
  - `Checkbox` は `<input>` ではなく `role="checkbox"` の `button` になる。`getByRole("checkbox")` で取得し、`check()` / `uncheck()` と `toBeChecked()` で操作・検証する。
  - `Tabs` の各タブは `role="tab"`。`getByRole("tab", { name: "未完了" })` で取得し、選択状態は `aria-selected` で検証する。
  - `Sonner` のトーストは DOM 構造が `<li>` で、`role` や `data-testid` を自由に付けられない。テキスト (`getByText("保存しました")`) で検証し、2 秒後に消えることは `toBeHidden()` で確認する。
  - `Label` と `Input` は `htmlFor` / `id` で必ず紐付け、`getByLabel` で取得できるようにする。
  - エラー表示 (`role="alert"`) は、shadcn/ui の `Alert` を追加せず、テキストを `<p role="alert">` で描画する。

### 3.3 git 設定

- グローバル設定 (設定済み)

  ```bash
  git config --global user.name "bardblue0821"
  git config --global user.email "bardblue0821@gmail.com"
  git config --global init.defaultBranch main
  ```

- リポジトリは `/home/bardblue/code/mini-todo`。`design/` (この仕様書) も同じリポジトリに含める。
- GitHub 上のリポジトリ (`bardblue0821/mini-todo`) は作成済みで、`README.md` と `design/program.md` が入っている。作業ディレクトリが空でないため `create-next-app` は直接実行できない。一時ディレクトリに `--disable-git` で生成し、`README.md` と `.git` を除いてコピーする。
- デフォルトブランチは `main`。
- 雛形のコミットは `chore: create-next-app` とする。以降は 10.4 のコミット規約に従い、コミットごとに push する。
- `.gitignore` には Next.js 標準の項目に加えて、次を追加する。

  ```
  /playwright/.auth/
  /test-results/
  /playwright-report/
  /blob-report/
  /playwright/.cache/
  ```

- リモートは GitHub に追加する (URL は後で決定)。

  ```bash
  git remote add origin <GitHub のリポジトリ URL>
  git push -u origin main
  ```

- スクリーンショット比較の基準画像 (`tests/**-snapshots/`) はコミットする。ただし OS 依存のため、基準画像は WSL (Linux) 上で生成したものだけを使う。

## 4. 画面仕様

### 4.1 ログイン画面 `/login`

- 入力: ユーザー名 (ラベル「ユーザー名」)、パスワード (ラベル「パスワード」)
- ボタン: 「ログイン」
- 認証: 固定ユーザー `user` / `password` のみ成功
- 成功時: Cookie (`session`) を発行し `/todos` へ遷移
- 失敗時: `role="alert"` で「ユーザー名またはパスワードが違います」を表示
- 入力が空の場合: 各項目の下に「必須項目です」を表示 (送信しない)

### 4.2 Todo 一覧画面 `/todos` (要ログイン)

- 未ログインで開くと `/login` にリダイレクト
- ヘッダー: 「こんにちは、user さん」と「ログアウト」ボタン
- 追加フォーム: テキスト入力 (placeholder「新しいタスク」) と「追加」ボタン
  - 空文字は追加不可 (ボタン無効化)
  - 100 文字超はエラー表示
- 一覧: 各行に チェックボックス (完了切替)、タイトル、「削除」ボタン
  - 完了したタスクは取り消し線を表示
- 削除: `confirm` ダイアログで「本当に削除しますか?」を表示し、OK で削除
- フィルタ: 「すべて / 未完了 / 完了」のタブ (URL クエリ `?filter=active` などと連動)
- 件数表示: 「残り N 件」
- 初回表示時は API 取得中に「読み込み中...」を表示 (意図的に 500ms 遅延)

### 4.3 詳細画面 `/todos/[id]`

- タイトル、作成日時、メモ (textarea) を表示・編集
- 「保存」ボタンで保存し、トースト「保存しました」を 2 秒間表示
- 存在しない ID は 404 ページを表示

### 4.4 その他

- ヘッダーナビゲーション: 「Todo」「About」リンク
- `/about`: 静的ページ。`<h1>` と画像 1 枚 (alt あり) を表示

## 5. API 仕様 (Route Handlers)

| メソッド | パス | 概要 | 備考 |
| --- | --- | --- | --- |
| POST | `/api/login` | ログイン | body: `{ username, password }`。成功 200 + Cookie (`session`: HttpOnly / SameSite=Lax / Path=/) / 失敗 401 |
| POST | `/api/logout` | ログアウト | 200 + Cookie 削除 |
| GET | `/api/todos` | 一覧取得 | 200 `Todo[]`、500ms 遅延、未認証は 401 |
| POST | `/api/todos` | 追加 | body: `{ title }`。201 + 作成した `Todo` / title が空 (trim 後)・100 文字超は 400 |
| PATCH | `/api/todos/:id` | 更新 | body: `done` / `title` / `memo` の一部。200 + 更新後の `Todo` / 存在しない id は 404 / 不正な値は 400 |
| DELETE | `/api/todos/:id` | 削除 | 204 / 存在しない id は 404 |
| POST | `/api/test/reset` | データ初期化 | 204。`NODE_ENV !== "production"` のみ有効 (本番は 404)。テスト間の状態リセット用 |

- `/api/todos` 系は未認証なら全メソッドで 401。
- エラー時の body は `{ "error": "<メッセージ>" }`。
- セッション Cookie は HMAC 署名付きのステートレストークン。サーバー側にセッションを持たない (logout が他のテストの認証状態を壊さないため)。
- 一覧の表示用フィルタ値は `all` (既定) / `active` / `completed`。不正な値は `all` として扱う。

Todo の型:

```ts
type Todo = {
  id: string;
  title: string;
  done: boolean;
  memo: string;
  createdAt: string; // ISO8601
};
```

初期データ: 「牛乳を買う」(未完了)、「レポートを書く」(未完了)、「散歩する」(完了)

## 6. ディレクトリ構成 (案)

```
mini-todo/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx              # /todos へリダイレクト
│  │  ├─ login/page.tsx
│  │  ├─ about/page.tsx
│  │  ├─ todos/
│  │  │  ├─ page.tsx
│  │  │  └─ [id]/page.tsx
│  │  └─ api/
│  │     ├─ login/route.ts
│  │     ├─ logout/route.ts
│  │     ├─ todos/route.ts
│  │     ├─ todos/[id]/route.ts
│  │     └─ test/reset/route.ts
│  ├─ components/
│  │  └─ ui/                   # shadcn/ui が生成 (原則編集しない)
│  └─ lib/store.ts             # インメモリデータ
├─ tests/
│  ├─ auth.setup.ts            # ログイン状態を保存 (ステップ 4)
│  ├─ unit/store.spec.ts      # ロジックのテスト (TDD 10.2)
│  ├─ api/                    # API テスト (reset / auth など)
│  ├─ step04-auth-reuse.spec.ts
│  ├─ todo-detail.spec.ts     # 詳細画面 (4.3)
│  ├─ pages/TodoPage.ts        # Page Object (ステップ 10)
│  ├─ fixtures.ts              # 独自 fixture (ステップ 10)
│  ├─ step01-about.spec.ts     # 各ステップの解答例
│  ├─ step02-login.spec.ts
│  ├─ step03-navigation.spec.ts
│  ├─ step05-todos.spec.ts
│  ├─ step06-dialog.spec.ts
│  ├─ step07-filter.spec.ts
│  ├─ step08-mock-api.spec.ts
│  ├─ step09-api.spec.ts
│  ├─ step10-page-object.spec.ts
│  ├─ step11-visual.spec.ts
│  └─ step13-parallel.spec.ts
└─ playwright.config.ts
```

- 各ステップの解答例テストは `tests/stepNN-*.spec.ts` として用意する (ファイル先頭にそのステップの学習ポイントをコメントで記載)。
- ログイン不要のテスト (ステップ 1〜3 など) は `test.use({ storageState: { cookies: [], origins: [] } })` で未ログイン状態にする。
- ステップ 4 と 12 は専用ファイルを持たず、設定とコマンドで学ぶ。

## 7. テスト可能性のための実装ルール

- ラベルは `<label>` と紐付け、ボタンは `<button>` を使う (`getByRole` / `getByLabel` を使えるようにする)。
- 重要な要素には `data-testid` を付与する (例: `todo-item`, `remaining-count`)。
- エラーメッセージは `role="alert"` を付ける。トーストは shadcn/ui の `Sonner` を使うため、テキストで検証する (3.2 参照)。
- 状態は `/api/test/reset` で初期化できるようにする。

## 8. 学習ステップとテスト課題

| ステップ | 学ぶこと | 課題 (対象テストファイル) |
| --- | --- | --- |
| 1 | 基本操作・ロケーター | `/about` を開き、タイトル・見出し・画像の `alt` を検証 (`step01-about.spec.ts`) |
| 2 | フォーム入力・アサーション | ログイン成功/失敗/未入力のバリデーションを検証 (`step02-login.spec.ts`) |
| 3 | ナビゲーション・URL 検証 | 未ログインで `/todos` を開くと `/login` に遷移すること |
| 4 | 認証状態の再利用 (`storageState`) | `auth.setup.ts` でログインし、他テストで再利用 |
| 5 | リスト操作・自動待機 | タスクの追加・完了・削除、残件数の変化を検証 (`todos.spec.ts`) |
| 6 | ダイアログ処理 | 削除時の `confirm` を `page.on("dialog")` で承認/拒否 |
| 7 | フィルタと URL クエリ | タブ切替で表示件数と URL が変わること |
| 8 | ネットワークのモック | `page.route` で `/api/todos` を空配列・500 エラー・遅延に差し替え (`mock-api.spec.ts`) |
| 9 | API テスト | `request` フィクスチャで `/api/todos` を直接検証 |
| 10 | Fixture / Page Object | `TodoPage` クラスと独自 fixture でテストを整理 |
| 11 | スクリーンショット比較 | `toHaveScreenshot()` で `/about` と一覧画面を比較 (`visual.spec.ts`) |
| 12 | デバッグ・レポート | `--ui`、`--debug`、`codegen`、Trace Viewer、HTML レポートの利用 (WSL では 2.1 の代替手段を利用) |
| 13 | 並列実行・リトライ | `fullyParallel`、`workers`、`retries`、`test.describe.configure({ mode: "serial" })`、テスト間のデータ分離 (Chromium のみ) (`step13-parallel.spec.ts`) |
| 14 | CI (任意) | GitHub Actions で Playwright を実行 |

## 9. よく使うコマンド

```bash
npx playwright test                    # 全テスト実行
npx playwright test login.spec.ts      # 特定ファイルのみ
npx playwright test --project=chromium # Chromium のみ実行
npx playwright test --headed           # ブラウザ表示 (WSLg 必須)
npx playwright test --ui               # UI モード (WSLg 必須)
npx playwright test --debug            # デバッグ実行 (WSLg 必須)
npx playwright codegen localhost:3000  # テストコード自動生成 (WSLg 必須)
npx playwright show-report             # HTML レポート表示
npx playwright show-trace trace.zip    # トレース表示
```

## 10. 開発方針 (TDD)

アプリケーションの実装は、必ずテストを先に書く TDD で進める。実装コードを書く前に、対応するテストが存在し失敗していることを確認する。

### 10.1 サイクル

1. **Red**: 追加する振る舞い 1 つ分のテストを `tests/` に書き、実行して **期待どおりの理由で失敗する** ことを確認する (実装が無いための失敗であり、テストの書き間違いではないこと)。
2. **Green**: テストを通すための最小限の実装だけを書く。仕様にある機能でも、テストが無いものは先回りして実装しない。
3. **Refactor**: テストが全て通る状態を保ったまま、重複排除や命名の整理を行う。
4. 1 サイクルごとに `npx playwright test` を実行し、全て成功してから次の振る舞いへ進む。

### 10.2 テストの種類と使い分け

全て `@playwright/test` で記述する (Vitest 等は追加しない)。

| 対象 | テスト方法 | 例 |
| --- | --- | --- |
| ビジネスロジック (`lib/store.ts`) | ブラウザを使わない Playwright テスト (`tests/unit/*.spec.ts`) | 追加・更新・削除・初期データ・リセット |
| API (Route Handlers) | `request` フィクスチャによる API テスト | 認証 401、`POST /api/todos` の検証 |
| 画面 (UI) | `page` フィクスチャによる E2E テスト | ログイン、Todo の追加・削除・フィルタ |

- 下位 (ロジック → API → UI) から順に、テスト → 実装を繰り返す。
- UI の実装を始める前に、その UI が依存する API のテストが成功していること。

### 10.3 実装の順序 (TDD)

| 順 | 実装する機能 | 先に書くテスト |
| --- | --- | --- |
| 0 | プロジェクト雛形・Playwright 設定 | サンプルテストが webServer 経由で成功すること (環境確認) |
| 1 | `/about` 静的ページ | ステップ 1 |
| 2 | `lib/store.ts` とリセット API | `tests/unit/store.spec.ts`、`POST /api/test/reset` の API テスト |
| 3 | `/api/login`、`/api/logout` | ログイン API (成功 200 / 失敗 401 / Cookie) |
| 4 | `/login` 画面 | ステップ 2、3 (未入力・失敗・成功・未ログイン時のリダイレクト) |
| 5 | `auth.setup.ts` | ステップ 4 (認証状態の保存と再利用) |
| 6 | `/api/todos` (GET / POST / PATCH / DELETE) | ステップ 9 |
| 7 | `/todos` 一覧 (表示・追加・完了・件数) | ステップ 5 |
| 8 | 削除の `confirm` ダイアログ | ステップ 6 |
| 9 | フィルタ | ステップ 7 |
| 10 | 読み込み中表示・API エラー表示 | ステップ 8 (`page.route` でのモック) |
| 11 | `/todos/[id]` 詳細・トースト・404 | 詳細画面のテスト (保存・トースト・404) |
| 12 | Page Object / fixture への整理 (Refactor) | ステップ 10 (既存テストが全て通ること) |
| 13 | 見た目の固定 | ステップ 11 (スクリーンショット比較) |
| 14 | 並列実行での安定化 | ステップ 13 |

### 10.4 ルール

- テストが失敗している状態を確認せずに実装を書かない。
- 1 つのテストが通ったら、次のテストを書く前にコミットする (コミットメッセージに `test:` / `feat:` / `refactor:` の接頭辞を付ける)。
- バグを見つけたら、まず再現するテストを書いて失敗させてから修正する。
- テストを通すために、テスト側の期待値を実装に合わせて書き換えない (仕様 (4、5 章) が変わった場合を除く)。
- 非同期処理は固定時間の `waitForTimeout` で待たず、Playwright の自動待機と Web-first アサーション (`await expect(...)`) に任せる。
- テストは互いに独立させ、実行前に `/api/test/reset` で状態を初期化する。

## 11. 進め方

1. 10.3 の順序に従い、各機能を TDD (Red → Green → Refactor) で実装する。
2. 学習者は、自分でテストを書いてから実装に進む。
3. 各ステップの終了時に、解答例テスト (`tests/stepNN-*.spec.ts`) と自分のテストを比較する。
4. 解答例テストは、この TDD の過程で作ったテストを整理したものとする。

## 12. 完了条件

- 上記画面・API が動作する。
- 全ての機能に対応するテストがあり、テストが実装より先にコミットされている (履歴で確認できる)。
- ステップ 1〜13 の解答例テストが `npx playwright test` で全て成功する (Chromium のみ、ヘッドレス)。
- テストが並列実行しても互いに干渉しない (必要なら `workers: 1` や、ユーザーごとのデータ分離を検討)。
