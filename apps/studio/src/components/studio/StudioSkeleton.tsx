import React from "react";
import { cn } from "../../lib/utils";

/** Neutral placeholder block that matches the Studio surface tokens. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

/** Rows that mimic the work / file list while data loads. */
export function ListRowsSkeleton({ rows = 5, label = "載入中", className }: { rows?: number; label?: string; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={cn("overflow-hidden rounded-[10px] border border-border bg-card", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-border/70 px-4 py-3 last:border-b-0">
          <Skeleton className="h-10 w-9 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-[22px] w-16 rounded-full sm:block" />
          <Skeleton className="hidden h-7 w-20 sm:block" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Stacked cards that mimic a form page while data loads. */
export function FormSkeleton({ blocks = 3, label = "載入中", className }: { blocks?: number; label?: string; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={cn("space-y-4", className)}>
      {Array.from({ length: blocks }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-border/70 bg-background p-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
