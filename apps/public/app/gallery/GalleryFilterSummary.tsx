"use client";

import { X } from "lucide-react";

export interface ActiveGalleryFilterChip {
  type: "tag" | "segment" | "usage" | "q";
  label: string;
  value: string;
}

interface GalleryFilterSummaryProps {
  chips: ActiveGalleryFilterChip[];
  onRemove: (chip: ActiveGalleryFilterChip) => void;
  onClear: () => void;
}

const SEGMENT_LABELS: Record<string, string> = {
  allAges: "全年齡向",
  adult: "成人向",
  male: "男性向",
  female: "女性向",
};

function chipLabel(chip: ActiveGalleryFilterChip): string {
  if (chip.type === "q") return `搜尋：${chip.value}`;
  if (chip.type === "segment") return `分類：${SEGMENT_LABELS[chip.value] ?? chip.value}`;
  if (chip.type === "usage") return `授權：${chip.value === "commercial" ? "可商用" : chip.value}`;
  return chip.label;
}

export function GalleryFilterSummary({ chips, onRemove, onClear }: GalleryFilterSummaryProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 pb-2"
      aria-label="目前篩選條件"
      aria-live="polite"
    >
      <span className="mr-0.5 [font-size:var(--public-font-caption)] font-semibold text-muted-foreground">
        已套用
      </span>
      {chips.map((chip, index) => {
        const label = chipLabel(chip);
        return (
          <button
            key={`${chip.type}:${chip.value}:${index}`}
            type="button"
            onClick={() => onRemove(chip)}
            aria-label={`移除篩選 ${label}`}
            className="inline-flex h-6 items-center gap-1 rounded-[5px] border border-primary/35 bg-primary/10 px-2 [font-size:var(--public-font-caption)] font-medium text-primary hover:border-primary/60 hover:bg-primary/15 transition-colors"
          >
            <span>{label}</span>
            <X className="h-3 w-3" aria-hidden />
          </button>
        );
      })}
      <button
        type="button"
        onClick={onClear}
        className="ml-0.5 h-6 px-1.5 [font-size:var(--public-font-caption)] text-muted-foreground hover:text-foreground transition-colors"
      >
        清除全部
      </button>
    </div>
  );
}
