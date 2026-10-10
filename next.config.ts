import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
