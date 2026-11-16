"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { HomepageActivity } from "@/lib/homepageBundle";

export function HomepageActivityBanner({ activities = [] }: { activities?: HomepageActivity[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (activities.length === 0) return null;

  const index = Math.min(activeIndex, activities.length - 1);
  const activity = activities[index];
  const changeActivity = (step: number) => setActiveIndex((current) => (current + step + activities.length) % activities.length);

  return (
    <section aria-label="公開活動" className="relative px-4 pt-4 sm:px-5 lg:px-8">
      <Link
        href={`/activities?event=${encodeURIComponent(activity.slug)}`}
        className="group relative isolate flex min-h-32 items-end overflow-hidden rounded-md border border-border bg-band focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-44"
      >
        {activity.coverUrl ? (
          <span className="absolute inset-0 overflow-hidden" aria-hidden>
            <img
              src={activity.coverUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover group-hover:opacity-90"
              style={activity.coverCrop ? {
                objectPosition: `${50 + (activity.coverCrop.cx ?? 0) * 20}% ${50 + (activity.coverCrop.cy ?? 0) * 20}%`,
                transform: `scale(${activity.coverCrop.zoom ?? 1})`,
              } : undefined}
            />
          </span>
        ) : (
          <span className="absolute inset-0 bg-band" aria-hidden />
        )}
        {activity.coverUrl && <span className="absolute inset-0 bg-black/50" aria-hidden />}
        <span className="relative z-10 min-w-0 flex-1 px-5 py-5 text-white sm:px-7 sm:py-6">
          <span className="block max-w-[32rem] text-lg font-bold leading-snug sm:text-2xl">{activity.title}</span>
          {activity.summary && <span className="mt-1 hidden max-w-[28rem] truncate text-sm text-white/75 sm:block">{activity.summary}</span>}
        </span>
        <span className="relative z-10 mb-5 mr-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/60 text-white group-hover:bg-white/15 sm:mb-6 sm:mr-6 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm sm:font-semibold">
          <span className="hidden sm:inline">查看活動</span><ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      </Link>
      {activities.length > 1 && (
        <div className="absolute right-7 top-7 z-20 flex items-center gap-1 rounded-md bg-black/60 p-1 text-white sm:right-9 sm:top-8">
          <button type="button" aria-label="上一個活動" onClick={() => changeActivity(-1)} className="flex h-7 w-7 items-center justify-center rounded-sm hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ChevronLeft className="h-4 w-4" aria-hidden /></button>
          <span aria-live="polite" className="min-w-10 text-center text-xs tabular-nums">{index + 1} / {activities.length}</span>
          <button type="button" aria-label="下一個活動" onClick={() => changeActivity(1)} className="flex h-7 w-7 items-center justify-center rounded-sm hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ChevronRight className="h-4 w-4" aria-hidden /></button>
        </div>
      )}
    </section>
  );
}
