import React from "react";
import { cn } from "../../lib/utils";

export type StudioStatus = "draft" | "ready" | "live";

const toneClass: Record<StudioStatus, string> = {
  draft: "bg-[hsl(var(--status-draft-bg))] text-[hsl(var(--status-draft-fg))]",
  ready: "bg-[hsl(var(--status-ready-bg))] text-[hsl(var(--status-ready-fg))]",
  live: "bg-[hsl(var(--status-live-bg))] text-[hsl(var(--status-live-fg))]",
};

export function StatusPill({ status, children, className }: { status: StudioStatus; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium",
        toneClass[status],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

/** Maps the publish-readiness status used by the API to the Studio status tone. */
export function readinessToStudioStatus(status: string | undefined): StudioStatus {
  if (status === "published") return "live";
  if (status === "ready") return "ready";
  return "draft";
}
