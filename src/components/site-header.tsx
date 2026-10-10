import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-8 py-3">
        <span className="font-semibold">Mini Todo</span>
        <nav aria-label="メイン" className="flex gap-4 text-sm">
          <Link href="/todos" className="hover:underline">
            Todo
          </Link>
          <Link href="/about" className="hover:underline">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
