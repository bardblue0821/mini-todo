import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Todo",
  description: "Playwright 学習用の小さな Todo アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
