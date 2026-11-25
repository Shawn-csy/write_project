"use client";

import { AnimatedSegment } from "@/components/AnimatedSegment";

export type GallerySortValue = "latest" | "top" | "random";

export const GALLERY_SORT_OPTIONS: { value: GallerySortValue; label: string }[] = [
  { value: "latest", label: "最新" },
  { value: "top", label: "熱門" },
  { value: "random", label: "隨機" },
];

/** Label for the null sort — the sectioned (lanes) homepage. */
export const GALLERY_OVERVIEW_LABEL = "總覽";
const OVERVIEW = "overview";
const GALLERY_SORT_WITH_OVERVIEW = [{ value: OVERVIEW, label: GALLERY_OVERVIEW_LABEL } as const, ...GALLERY_SORT_OPTIONS];

interface GallerySortControlProps {
  /** null = 分區瀏覽 (lanes). Clicking the active option returns to it. */
  value: GallerySortValue | null;
  onChange: (value: GallerySortValue | null) => void;
  /** Show the lanes state as an explicit first option instead of only "toggle off". */
  showOverview?: boolean;
  className?: string;
}

export function GallerySortControl({ value, onChange, showOverview = false, className = "" }: GallerySortControlProps) {
  return (
    <AnimatedSegment<GallerySortValue | typeof OVERVIEW>
      label="排序"
      options={showOverview ? GALLERY_SORT_WITH_OVERVIEW : GALLERY_SORT_OPTIONS}
      value={value ?? (showOverview ? OVERVIEW : null)}
      onChange={(next) => onChange(next === OVERVIEW || next === value ? null : next)}
      className={`gallery-sort-control h-9 items-stretch ${className || "inline-flex"}`}
      btnClassName="min-w-10 whitespace-nowrap px-2"
    />
  );
}
