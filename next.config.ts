import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 開発モードの Next.js インジケーター (左下の「N」バッジ) はスクリーンショットに
  // 写り込み、比較の不安定要因になるため無効化する。
  devIndicators: false,
  // cacheComponents / partialPrefetching は使わない (仕様の「存在しない ID は HTTP 404」
  // と、リクエスト時に動的に描画する素直なモデルを保つため)。
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
