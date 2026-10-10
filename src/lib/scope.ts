import { headers } from "next/headers";
import { DEFAULT_SCOPE, ValidationError } from "@/lib/store";

export const SCOPE_HEADER = "x-test-scope";

const SCOPE_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

/**
 * リクエストヘッダー x-test-scope からデータのスコープ名を得る。
 * テストが並列に走っても互いのデータに干渉しないようにするための仕組みで、本番では常に無視する。
 * ヘッダーが無い / 空の場合は共有の既定スコープになる。
 */
export async function getScope(): Promise<string> {
  if (process.env.NODE_ENV === "production") return DEFAULT_SCOPE;

  const value = (await headers()).get(SCOPE_HEADER);
  if (!value) return DEFAULT_SCOPE;
  if (!SCOPE_PATTERN.test(value)) {
    throw new ValidationError(`${SCOPE_HEADER} は英数字・ハイフン・アンダースコアで 100 文字以内で指定してください`);
  }
  return value;
}
