"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
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
        className="group relative isolate flex min-h-32 items-end overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition-[border-color,box-shadow] hover:border-primary/55 hover:shadow-[0_16px_36px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-44"
      >
        {activity.coverUrl ? (
          <span className="absolute inset-0 overflow-hidden" aria-hidden>
            <img
              src={activity.coverUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              style={activity.coverCrop ? {
                objectPosition: `${50 + (activity.coverCrop.cx ?? 0) * 20}% ${50 + (activity.coverCrop.cy ?? 0) * 20}%`,
                transform: `scale(${activity.coverCrop.zoom ?? 1})`,
              } : undefined}
            />
          </span>
        ) : (
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(122,162,219,0.28),transparent_38%),linear-gradient(125deg,#0f1726,#1a2b43)]" aria-hidden>
            <CalendarDays className="absolute -right-4 -top-8 h-44 w-44 rotate-12 text-white/10" />
          </span>
        )}
        <span className="absolute inset-0 bg-gradient-to-r from-[#0b1220]/90 via-[#0b1220]/70 to-[#0b1220]/10" aria-hidden />
        <span className="relative z-10 min-w-0 flex-1 px-5 py-5 text-white sm:px-7 sm:py-6">
          <span className="block max-w-[32rem] text-lg font-bold leading-snug [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-2xl">{activity.title}</span>
          {activity.summary && <span className="mt-1 hidden max-w-[28rem] truncate text-sm text-white/75 sm:block">{activity.summary}</span>}
        </span>
        <span className="relative z-10 mb-5 mr-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/15 text-white backdrop-blur-sm transition-colors group-hover:bg-white/25 sm:mb-6 sm:mr-6 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-full sm:px-4 sm:py-2 sm:text-sm sm:font-semibold">
          <span className="hidden sm:inline">查看活動</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
      {activities.length > 1 && (
        <div className="absolute right-7 top-7 z-20 flex items-center gap-1 rounded-full border border-white/20 bg-[#0b1220]/75 p-1 text-white backdrop-blur-md sm:right-9 sm:top-8">
          <button type="button" aria-label="上一個活動" onClick={() => changeActivity(-1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ChevronLeft className="h-4 w-4" aria-hidden /></button>
          <span aria-live="polite" className="min-w-10 text-center text-xs tabular-nums">{index + 1} / {activities.length}</span>
          <button type="button" aria-label="下一個活動" onClick={() => changeActivity(1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ChevronRight className="h-4 w-4" aria-hidden /></button>
        </div>
      )}
    </section>
  );
}
