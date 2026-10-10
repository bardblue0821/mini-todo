import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "About | Mini Todo",
};

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-3xl font-semibold">About</h1>
      <Image
        src="/img/about.svg"
        alt="Mini Todo のロゴ"
        width={160}
        height={160}
        priority
      />
      <p className="text-muted-foreground">
        Mini Todo は Playwright を学習するための小さな Todo アプリです。
      </p>
    </main>
  );
}
