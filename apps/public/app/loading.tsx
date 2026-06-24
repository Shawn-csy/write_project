export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="h-14 rounded-lg bg-muted/60 animate-pulse" />
        <div className="mt-6 h-40 rounded-xl bg-muted/50 animate-pulse" />
        <div className="mt-6 flex gap-6">
          <div className="hidden lg:block w-60 shrink-0 space-y-3">
            <div className="h-8 rounded bg-muted/50 animate-pulse" />
            <div className="h-32 rounded bg-muted/40 animate-pulse" />
            <div className="h-24 rounded bg-muted/40 animate-pulse" />
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-[4/3] rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
