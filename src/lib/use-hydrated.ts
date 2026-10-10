import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * ハイドレーション完了後に true になる。
 * 完了前に操作されると React のハンドラーが未接続で入力や操作が失われるため、
 * 操作系の要素は false の間 disabled にしておく (Playwright は有効になるまで自動で待つ)。
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
