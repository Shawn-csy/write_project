import React from "react";
import { CoverPlaceholder } from "../../ui/CoverPlaceholder";
import { getMediaCropStyle } from "../../../lib/mediaCropRef";
import { Badge } from "../../ui/badge";

interface SeriesDraftPreviewProps {
  name: string;
  summary: string;
  coverUrl: string;
  coverCrop: { cx?: number; cy?: number; zoom?: number } | null;
}

export function SeriesDraftPreview({
  name,
  summary,
  coverUrl,
  coverCrop,
}: SeriesDraftPreviewProps): React.JSX.Element {
  const cropCover = getMediaCropStyle(String(coverUrl || ""), coverCrop);

  return (
    <div className="space-y-2" data-testid="draft-preview">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        草稿預覽
      </p>
      <div className="flex gap-4 rounded-md border bg-muted/10 px-4 py-3">
        {/* Cover thumbnail */}
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded border bg-muted/20">
          {coverUrl ? (
            <img
              src={cropCover.src}
              style={cropCover.style}
              alt="series draft cover"
              className="h-full w-full object-cover"
            />
          ) : (
            <CoverPlaceholder title={name || "Series"} compact />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{name || "（未命名）"}</p>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              草稿
            </Badge>
          </div>
          {summary ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{summary}</p>
          ) : (
            <p className="text-xs text-muted-foreground/50">（尚未填寫摘要）</p>
          )}
          <p className="text-xs text-muted-foreground">建立後會產生系列公開頁。</p>
        </div>
      </div>
    </div>
  );
}
