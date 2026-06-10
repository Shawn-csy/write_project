import React from "react";
import { CoverPlaceholder } from "../cover/CoverPlaceholder";
import { CoverRenderer } from "../cover/CoverRenderer";
import { getMediaCropStyle } from "@write/media-crop";
import type { CoverDesign } from "../cover/types";

export interface RelatedSeriesScriptItem {
  id: string;
  title: string;
  coverUrl?: string | null;
  coverCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
  coverDesign?: CoverDesign | null;
  seriesOrder?: string | number | null;
}

export interface RelatedSeriesSectionProps {
  seriesName?: string;
  relatedSeriesScripts: RelatedSeriesScriptItem[];
  /** href builder for a script — if provided, renders <a> instead of <button> */
  scriptHref?: (id: string) => string;
  /** href for the series page */
  seriesHref?: string;
  onOpenRelatedScript?: (scriptId: string) => void;
  onOpenSeries?: (seriesName: string) => void;
}

function seriesOrderLabel(order: string | number | null | undefined): string {
  const n = Number(order);
  if (n === 0) return "設定/背景";
  if (Number.isFinite(n)) return `第 ${n} 作`;
  return "番外";
}

export function RelatedSeriesSection({
  seriesName,
  relatedSeriesScripts,
  scriptHref,
  seriesHref,
  onOpenRelatedScript,
  onOpenSeries,
}: RelatedSeriesSectionProps): React.JSX.Element {
  return (
    <section className="w-full max-w-4xl mx-auto px-6 pb-8">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {seriesName ? `${seriesName} · 同系列作品` : "同系列作品"}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {relatedSeriesScripts.length} 部
          </span>
          {seriesName && (
            seriesHref ? (
              <a href={seriesHref} className="text-xs text-primary hover:underline">
                查看系列全部
              </a>
            ) : (
              <button
                type="button"
                className="text-xs text-primary hover:underline bg-transparent border-none cursor-pointer"
                onClick={() => onOpenSeries?.(seriesName)}
              >
                查看系列全部
              </button>
            )
          )}
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {relatedSeriesScripts.map((item) => {
          const cropCover = getMediaCropStyle(String(item.coverUrl || ""), item.coverCrop);
          const href = scriptHref?.(item.id);
          const inner = (
            <>
              <div className="aspect-[2/3] overflow-hidden rounded-md border border-border/60 bg-muted/30">
                {item.coverUrl ? (
                  <img
                    src={cropCover.src}
                    style={cropCover.style as React.CSSProperties}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                ) : item.coverDesign ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <CoverRenderer design={item.coverDesign} title={item.title} compact responsive className="h-full w-full" />
                  </div>
                ) : (
                  <CoverPlaceholder title={item.title} compact />
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {seriesOrderLabel(item.seriesOrder)}
                </p>
                <p className="line-clamp-2 text-xs font-medium text-foreground group-hover:text-primary">
                  {item.title}
                </p>
              </div>
            </>
          );

          if (href) {
            return (
              <a key={item.id} href={href} className="group w-[132px] shrink-0 text-left block">
                {inner}
              </a>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              className="group w-[132px] shrink-0 text-left bg-transparent border-none cursor-pointer p-0"
              onClick={() => onOpenRelatedScript?.(item.id)}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </section>
  );
}
