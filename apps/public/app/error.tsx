"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <p className="text-4xl font-serif font-bold text-foreground">出了一點問題</p>
      <p className="mt-3 text-muted-foreground text-sm">頁面載入時發生錯誤，請稍後再試。</p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        重新載入
      </button>
    </main>
  );
}
