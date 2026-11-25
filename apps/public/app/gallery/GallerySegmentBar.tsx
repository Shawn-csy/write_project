"use client";

import { SEGMENT_KEYS } from "@write/public-ui";
import { PublicMorphDropdown } from "@/components/PublicMorphDropdown";

const RATING_OPTIONS = [
  { value: SEGMENT_KEYS.allAges, label: "全年齡向" },
  { value: SEGMENT_KEYS.adult, label: "成人向" },
];
const AUDIENCE_OPTIONS = [
  { value: SEGMENT_KEYS.male, label: "男性向" },
  { value: SEGMENT_KEYS.female, label: "女性向" },
];
const CATEGORY_GROUPS: { label?: string; options: { value: string; label: string }[] }[] = [
  { options: [{ value: SEGMENT_KEYS.all, label: "全部作品" }] },
  { label: "內容分級", options: RATING_OPTIONS },
  { label: "受眾", options: AUDIENCE_OPTIONS },
];

interface GallerySegmentBarProps {
  segment: string;
  onSegmentChange: (value: string) => void;
  demoOnly?: boolean;
  onDemoOnlyChange?: (enabled: boolean) => void;
  fit?: boolean;
}

export function GallerySegmentBar({ segment, onSegmentChange, demoOnly = false, onDemoOnlyChange, fit = false }: GallerySegmentBarProps) {
  const categoryLabel = CATEGORY_GROUPS.flatMap((group) => group.options).find((option) => option.value === segment)?.label;
  const summary = demoOnly && onDemoOnlyChange ? [categoryLabel && segment !== SEGMENT_KEYS.all ? categoryLabel : null, "有 Demo"].filter(Boolean).join(" · ") : undefined;

  return (
    <PublicMorphDropdown
      label={onDemoOnlyChange ? "作品篩選" : "作品分類"}
      value={segment}
      groups={CATEGORY_GROUPS}
      onChange={onSegmentChange}
      summary={summary}
      checkbox={onDemoOnlyChange ? { label: "只看有 Demo", checked: demoOnly, onChange: onDemoOnlyChange } : undefined}
      className={`${fit ? "w-full min-w-0" : "min-w-[5.25rem] sm:min-w-24"} ${segment !== SEGMENT_KEYS.all || demoOnly ? "bg-muted font-semibold" : ""}`}
    />
  );
}
