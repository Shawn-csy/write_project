import React from "react";
import { Eye, FilePenLine, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";
import { CoverPlaceholder } from "../../ui/CoverPlaceholder";
import { CoverRenderer } from "../../ui/CoverRenderer";
import { useI18n } from "../../../contexts/I18nContext";
import { getMediaCropStyle } from "../../../lib/mediaCropRef";
import type { PublishReadiness, PublisherScriptItem } from "../../../hooks/publisher/usePublisherWorksTabState";
import { openPublicPath } from "../../../lib/publicNavigation";
import { StatusPill, readinessToStudioStatus } from "../../studio/StatusPill";

interface WorkScriptListCardProps {
  script: PublisherScriptItem;
  failedCover: boolean;
  onCoverError: (id: string) => void;
  hasCover: (value: unknown) => boolean;
  hasCompleteLicense: (script: PublisherScriptItem) => boolean;
  readiness: PublishReadiness;
  formatDate: (value?: number) => string;
  onContinueEdit?: (script: PublisherScriptItem) => void;
  onDeleteScript?: (script: PublisherScriptItem) => void;
  setEditingScript: (script: PublisherScriptItem) => void;
}

/** Column template shared with the list header in PublisherWorksTab. */
export const WORK_ROW_GRID = "sm:grid-cols-[minmax(0,1fr)_6.5rem_6rem_15rem]";

export function WorkScriptListCard({
  script,
  failedCover,
  onCoverError,
  hasCover,
  readiness,
  formatDate,
  onContinueEdit,
  onDeleteScript,
  setEditingScript,
}: WorkScriptListCardProps): React.JSX.Element {
  const { t } = useI18n();
  const cropCover = getMediaCropStyle(String(script.coverUrl || ""));
  const status = readinessToStudioStatus(readiness.status);

  return (
    <div className={`group grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-b border-border/70 px-3 py-3 last:border-b-0 hover:bg-muted/40 sm:gap-x-4 sm:px-4 ${WORK_ROW_GRID}`}>
      <div className="flex min-w-0 items-center gap-3 max-sm:contents">
        <div className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded-md bg-muted">
          {hasCover(script.coverUrl) && !failedCover ? (
            <img
              src={cropCover.src || undefined}
              style={cropCover.style}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => onCoverError(script.id)}
            />
          ) : script.coverDesign ? (
            <CoverRenderer design={script.coverDesign} title={script.title || ""} compact responsive className="h-full w-full" />
          ) : (
            <CoverPlaceholder title={script.title || t("publisherWorksTab.noCover")} compact />
          )}
        </div>
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onContinueEdit?.(script)}
            className="block max-w-full truncate text-left text-sm font-semibold text-foreground hover:underline"
          >
            {script.title || "未命名"}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="sm:hidden"><StatusPill status={status}>{readiness.label}</StatusPill></span>
            <span className="sm:hidden">{formatDate(script.lastModified)}</span>
            {readiness.status === "published" ? (
              <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" aria-hidden="true" />{script.views || 0} 次觀看</span>
            ) : null}
            {readiness.status === "ready" && readiness.missingRecommended.length > 0 ? (
              <span>建議補：{readiness.missingRecommended.slice(0, 2).join("、")}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="hidden sm:block"><StatusPill status={status}>{readiness.label}</StatusPill></div>
      <div className="hidden text-[13px] text-muted-foreground sm:block">{formatDate(script.lastModified)}</div>

      <div className="col-span-2 flex flex-wrap items-center gap-1.5 sm:col-span-1 sm:grid sm:grid-cols-[5rem_7rem_2rem] sm:justify-end sm:gap-1">
        <Button variant="outline" size="sm" className="h-10 sm:h-7 sm:w-full" onClick={() => onContinueEdit?.(script)}>
          <FilePenLine className="h-3.5 w-3.5" />
          {t("publisherWorksTab.continueWriting", "編輯")}
        </Button>
        <Button variant="outline" size="sm" className="h-10 sm:h-7 sm:w-full" onClick={() => setEditingScript(script)}>
          {readiness.primaryActionLabel}
        </Button>
        {readiness.status === "published" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 px-0 text-muted-foreground sm:h-7 sm:w-8"
            title={t("publisherWorksTab.viewPublicPage")}
            aria-label={t("publisherWorksTab.viewPublicPage")}
            onClick={() => openPublicPath(`/read/${script.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ) : onDeleteScript ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 px-0 text-muted-foreground hover:text-destructive sm:h-7 sm:w-8"
            title={t("publisherWorksTab.deleteUnpublished", "刪除未公開作品")}
            aria-label={`${t("publisherWorksTab.deleteUnpublished", "刪除未公開作品")}：${script.title || "未命名"}`}
            onClick={() => onDeleteScript(script)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : <span className="hidden sm:block" aria-hidden="true" />}
      </div>
    </div>
  );
}
