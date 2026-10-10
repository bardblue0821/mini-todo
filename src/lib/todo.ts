// サーバー (store) とクライアント (UI) の両方から参照する、副作用のない定義。
export type Todo = {
  id: string;
  title: string;
  done: boolean;
  memo: string;
  createdAt: string; // ISO8601
};

export const TITLE_MAX_LENGTH = 100;
