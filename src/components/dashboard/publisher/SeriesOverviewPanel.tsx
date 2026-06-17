import React from "react";
import { CoverPlaceholder } from "../../ui/CoverPlaceholder";
import { getMediaCropStyle } from "../../../lib/mediaCropRef";
import { getLatestChapter } from "../../../lib/publisher/seriesEditorModel";
import type { SeriesChapterRow } from "../../../lib/publisher/seriesEditorModel";

interface SeriesOverviewPanelProps {
  name: string;
  summary: string;
  coverUrl: string;
  coverCrop: { cx?: number; cy?: number; zoom?: number } | null;
  chapterRows: SeriesChapterRow[];
}

export function SeriesOverviewPanel({
  name,
  summary,
  coverUrl,
  coverCrop,
  chapterRows,
}: SeriesOverviewPanelProps): React.JSX.Element {
  const cropCover = getMediaCropStyle(String(coverUrl || ""), coverCrop);

  const latestChapter = React.useMemo(() => getLatestChapter(chapterRows), [chapterRows]);

  const publicHref = name.trim()
    ? `/series/${encodeURIComponent(name.trim())}`
    : null;

  return (
    <div className="flex gap-4 rounded-md border bg-muted/10 px-4 py-3">
      {/* Cover thumbnail */}
      <div className="h-20 w-14 shrink-0 overflow-hidden rounded border bg-muted/20">
        {coverUrl ? (
          <img
            src={cropCover.src}
            style={cropCover.style}
            alt="series cover"
            className="h-full w-full object-cover"
          />
        ) : (
          <CoverPlaceholder title={name || "Series"} compact />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-semibold">{name || "（未命名）"}</p>
        {summary && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{summary}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {chapterRows.length} 部章節
          {latestChapter && (
            <span className="before:mx-1 before:content-['·']">
              最新：{latestChapter.title || "Untitled"}
            </span>
          )}
        </p>
        {publicHref && (
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-xs text-muted-foreground shrink-0">儲存後：</span>
            <a
              href={publicHref}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline-offset-2 hover:underline truncate"
            >
              {publicHref}
            </a>
            <a
              href={publicHref}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
            >
              查看公開頁 ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
