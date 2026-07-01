"use client";

import Link from "next/link";

export default function ReaderError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <p className="text-4xl font-serif font-bold text-foreground">載入失敗</p>
      <p className="mt-3 text-muted-foreground text-sm">台本載入時發生錯誤，請稍後再試。</p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          重新載入
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          回到首頁
        </Link>
      </div>
    </main>
  );
}
