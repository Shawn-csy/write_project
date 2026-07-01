export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Topbar skeleton */}
      <div className="h-14 border-b border-border/60 bg-background/95 px-4 flex items-center gap-3">
        <div className="h-5 w-5 rounded bg-muted/60 animate-pulse" />
        <div className="h-4 w-32 rounded bg-muted/50 animate-pulse" />
      </div>
      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-3">
        <div className="h-7 w-2/3 rounded bg-muted/60 animate-pulse" />
        <div className="h-4 w-1/3 rounded bg-muted/40 animate-pulse" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-muted/40 animate-pulse" style={{ width: `${70 + (i % 4) * 8}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
