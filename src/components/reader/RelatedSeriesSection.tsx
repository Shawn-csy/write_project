import React from "react";
import { CoverPlaceholder } from "../ui/CoverPlaceholder";
import { CoverRenderer } from "../ui/CoverRenderer";
import { useI18n } from "../../contexts/I18nContext";
import { getMediaCropStyle } from "../../lib/mediaCropRef";
import type { CoverDesign } from "../../types/coverDesign";

interface RelatedSeriesScriptItem {
  id: string;
  title: string;
  coverUrl?: string | null;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  coverDesign?: CoverDesign | null;
  seriesOrder?: string | number | null;
}

interface RelatedSeriesSectionProps {
  seriesName?: string;
  relatedSeriesScripts: RelatedSeriesScriptItem[];
  onOpenRelatedScript?: (scriptId: string) => void;
  onOpenSeries?: (seriesName: string) => void;
}

export function RelatedSeriesSection({
  seriesName,
  relatedSeriesScripts,
  onOpenRelatedScript,
  onOpenSeries,
}: RelatedSeriesSectionProps): React.JSX.Element {
  const { t } = useI18n();

  return (
    <section className="w-full max-w-4xl mx-auto px-6 pb-8">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {seriesName
            ? `${seriesName} · ${t("publicReader.relatedSeries", "同系列作品")}`
            : t("publicReader.relatedSeries", "同系列作品")}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {relatedSeriesScripts.length} {t("publicReader.worksUnit", "部")}
          </span>
          {seriesName && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => onOpenSeries?.(seriesName)}
            >
              {t("publicReader.viewSeriesAll", "查看系列全部")}
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {relatedSeriesScripts.map((item) => {
          const cropCover = getMediaCropStyle(String(item.coverUrl || ""), item.coverCrop);
          return (
          <button
            key={item.id}
            type="button"
            className="group w-[132px] shrink-0 text-left"
            onClick={() => onOpenRelatedScript?.(item.id)}
          >
            <div className="aspect-[2/3] overflow-hidden rounded-md border border-border/60 bg-muted/30">
              {item.coverUrl ? (
                <img
                  src={cropCover.src}
                  style={cropCover.style}
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
                {Number(item.seriesOrder) === 0
                  ? t("publicReader.seriesSetting", "設定/背景")
                  : Number.isFinite(Number(item.seriesOrder))
                    ? `第 ${item.seriesOrder} 作`
                    : t("publicReader.extraEpisode", "番外")}
              </p>
              <p className="line-clamp-2 text-xs font-medium text-foreground group-hover:text-primary">
                {item.title}
              </p>
            </div>
          </button>
          );
        })}
      </div>
    </section>
  );
}
