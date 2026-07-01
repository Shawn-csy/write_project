export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 border-b border-border/60 animate-pulse bg-muted/20" />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="h-8 w-1/3 rounded bg-muted/60 animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-muted/40 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
