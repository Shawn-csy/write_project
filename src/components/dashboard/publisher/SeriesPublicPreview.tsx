import React from "react";
import { SeriesGalleryCard } from "@write/public-ui";
import { buildPreviewSeriesGroup, getSeriesReadiness } from "../../../lib/publisher/seriesEditorModel";
import type { SeriesChapterRow, SeriesOrderConflict } from "../../../lib/publisher/seriesEditorModel";
import type { BaseScriptApi } from "../../../types/api";

interface SeriesPublicPreviewProps {
  seriesId: string;
  name: string;
  summary: string;
  coverUrl: string;
  scripts: BaseScriptApi[];
  chapterRows: SeriesChapterRow[];
  conflicts: SeriesOrderConflict[];
}

export function SeriesPublicPreview({
  seriesId,
  name,
  summary,
  coverUrl,
  scripts,
  chapterRows,
  conflicts,
}: SeriesPublicPreviewProps): React.JSX.Element {
  const readiness = React.useMemo(
    () =>
      getSeriesReadiness({
        name,
        summary,
        coverUrl,
        chapterRows,
        conflicts,
      }),
    [name, summary, coverUrl, chapterRows, conflicts]
  );

  const previewGroup = React.useMemo(
    () => buildPreviewSeriesGroup(seriesId, name, summary, coverUrl, scripts),
    [seriesId, name, summary, coverUrl, scripts]
  );

  const publicHref = name.trim()
    ? `/series/${encodeURIComponent(name.trim())}`
    : "#";

  return (
    <div className="space-y-4">
      {/* Readiness summary */}
      <div className="rounded-md border bg-muted/20 px-4 py-3 space-y-2">
        <h4 className="text-sm font-semibold">發布準備度</h4>
        <ul className="space-y-1 text-xs">
          <ReadinessItem ok={readiness.hasName} label="系列名稱" />
          <ReadinessItem ok={readiness.hasSummary} label="系列摘要" />
          <ReadinessItem ok={readiness.hasCover} label="封面圖片" />
          <ReadinessItem ok={readiness.hasChapters} label="至少一部章節" />
          <ReadinessItem ok={!readiness.hasMissingOrders} label="所有章節已設定順序" />
          <ReadinessItem ok={!readiness.hasConflicts} label="無重複章節順序" />
        </ul>
        <p
          className={`text-xs font-medium ${readiness.isReady ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
        >
          {readiness.isReady ? "✓ 系列已準備好公開展示" : "尚有待完善項目"}
        </p>
      </div>

      {/* Public URL */}
      {name.trim() && (
        <div className="rounded-md border bg-muted/20 px-4 py-3 space-y-1">
          <p className="text-xs text-muted-foreground">公開頁網址</p>
          <a
            href={publicHref}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary underline-offset-2 hover:underline break-all"
          >
            {publicHref}
          </a>
        </div>
      )}

      {/* Card preview */}
      {previewGroup !== null && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">系列卡片預覽（接近公開頁效果）</p>
          <div className="max-w-[200px]">
            <SeriesGalleryCard
              series={previewGroup}
              href={publicHref}
              variant="standard"
            />
          </div>
        </div>
      )}

      {/* Chapter order preview */}
      {chapterRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">章節順序預覽（與公開頁相同排序）</p>
          <ol className="space-y-1">
            {chapterRows.map((row, i) => (
              <li key={row.id} className="flex items-center gap-2 text-xs">
                <span className="w-5 shrink-0 text-right text-muted-foreground/60">{i + 1}.</span>
                <span
                  className={`truncate ${row.isMissingOrder || conflicts.some((c) => c.scriptIds.includes(row.id)) ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}
                >
                  {row.title || "Untitled"}
                </span>
                <span className="shrink-0 text-muted-foreground/60">
                  {row.isPrologue
                    ? "(設定/背景)"
                    : row.isMissingOrder
                      ? "(未設定順序)"
                      : `#${row.seriesOrder}`}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function ReadinessItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-foreground" : "text-muted-foreground"}`}>
      <span className={`text-[11px] ${ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground/50"}`}>
        {ok ? "✓" : "○"}
      </span>
      {label}
    </li>
  );
}
