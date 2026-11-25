"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PublicProfileWorkCard, type PublicProfileWorkCardProps } from "./PublicProfileLayout";

export interface PublicWorkLaneItem extends Pick<PublicProfileWorkCardProps,
  "title" | "url" | "coverUrl" | "coverCrop" | "coverDesign" | "workType" | "sourceLabel"> {
  id: string;
}

const WORKS_PER_BATCH = 8;

export function PublicWorkLane({ works, label = "參與作品" }: { works: PublicWorkLaneItem[]; label?: string }) {
  const laneRef = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(WORKS_PER_BATCH);
  const loadMore = () => setLimit(Math.min(limit + WORKS_PER_BATCH, works.length));
  const loadNearEnd = (lane: HTMLDivElement) => {
    if (limit < works.length && lane.scrollWidth - lane.scrollLeft - lane.clientWidth < 320) loadMore();
  };
  if (works.length === 0) return null;
  return <section className="mt-2 min-w-0 sm:pl-[3.75rem]" aria-label={label}>
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <h3 className="[font-size:var(--public-font-caption)] font-bold text-foreground">{label}</h3>
      {works.length > 3 && <div className="flex gap-1">
        <button type="button" onClick={() => laneRef.current?.scrollBy({ left: -216, behavior: "smooth" })} aria-label="往左瀏覽作品" className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronLeft className="h-4 w-4" aria-hidden /></button>
        <button type="button" onClick={() => {
          const lane = laneRef.current;
          if (!lane) return;
          loadNearEnd(lane);
          lane.scrollBy({ left: 216, behavior: "smooth" });
        }} aria-label="往右瀏覽作品" className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronRight className="h-4 w-4" aria-hidden /></button>
      </div>}
    </div>
    <div ref={laneRef} className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1" aria-label="橫向瀏覽參與作品" onScroll={(event) => loadNearEnd(event.currentTarget)}>
      {works.slice(0, limit).map(({ id, ...work }, index) => <div
        key={id}
        className="w-20 shrink-0 snap-start sm:w-24"
        onFocus={index === limit - 1 && limit < works.length ? loadMore : undefined}
      >
        <PublicProfileWorkCard {...work} compact />
      </div>)}
    </div>
  </section>;
}
