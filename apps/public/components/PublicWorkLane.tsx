"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PublicProfileWorkCard } from "./PublicProfileLayout";

export interface PublicWorkLaneItem {
  id: string;
  title: string;
  url: string;
  coverUrl?: string | null;
  workType?: "audio" | "game" | "video" | "other" | "script";
  sourceLabel?: string;
}

export function PublicWorkLane({ works, label = "參與作品" }: { works: PublicWorkLaneItem[]; label?: string }) {
  const laneRef = useRef<HTMLDivElement>(null);
  if (works.length === 0) return null;
  return <section className="mt-2 min-w-0 sm:pl-[3.75rem]" aria-label={label}>
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <h3 className="[font-size:var(--public-font-caption)] font-bold text-foreground">{label}</h3>
      {works.length > 3 && <div className="flex gap-1">
        <button type="button" onClick={() => laneRef.current?.scrollBy({ left: -216, behavior: "smooth" })} aria-label="往左瀏覽作品" className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronLeft className="h-4 w-4" aria-hidden /></button>
        <button type="button" onClick={() => laneRef.current?.scrollBy({ left: 216, behavior: "smooth" })} aria-label="往右瀏覽作品" className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronRight className="h-4 w-4" aria-hidden /></button>
      </div>}
    </div>
    <div ref={laneRef} className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1" aria-label="橫向瀏覽參與作品">
      {works.map((work) => <div key={work.id} className="w-20 shrink-0 snap-start sm:w-24">
        <PublicProfileWorkCard title={work.title} url={work.url} coverUrl={work.coverUrl || undefined} workType={work.workType} sourceLabel={work.sourceLabel} compact />
      </div>)}
    </div>
  </section>;
}
