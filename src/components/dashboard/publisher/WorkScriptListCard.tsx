import React from "react";
import { Eye, Edit, FilePenLine } from "lucide-react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { CoverPlaceholder } from "../../ui/CoverPlaceholder";
import { CoverRenderer } from "../../ui/CoverRenderer";
import { useI18n } from "../../../contexts/I18nContext";
import { getMediaCropStyle } from "../../../lib/mediaCropRef";
import type { PublishReadiness, PublisherScriptItem } from "../../../hooks/publisher/usePublisherWorksTabState";
import { openPublicPath } from "../../../lib/publicNavigation";

const warningBadgeClass = "h-5 border-[color:var(--license-term-border)] bg-[color:var(--license-term-bg)] text-[10px] font-semibold text-[color:var(--license-term-fg)]";
const errorBadgeClass = "h-5 border-destructive/40 bg-destructive/10 text-[10px] font-semibold text-destructive";

interface WorkScriptListCardProps {
  script: PublisherScriptItem;
  failedCover: boolean;
  onCoverError: (id: string) => void;
  hasCover: (value: unknown) => boolean;
  hasCompleteLicense: (script: PublisherScriptItem) => boolean;
  statusBadgeClass: (script: PublisherScriptItem) => string;
  readiness: PublishReadiness;
  formatDate: (value?: number) => string;
  onContinueEdit?: (script: PublisherScriptItem) => void;
  setEditingScript: (script: PublisherScriptItem) => void;
  navigate: (to: string) => void;
}

export function WorkScriptListCard({
  script,
  failedCover,
  onCoverError,
  hasCover,
  hasCompleteLicense,
  statusBadgeClass,
  readiness,
  formatDate,
  onContinueEdit,
  setEditingScript,
  navigate,
}: WorkScriptListCardProps): React.JSX.Element {
  const { t } = useI18n();
  const cropCover = getMediaCropStyle(String(script.coverUrl || ""));

  return (
    <Card className="group flex flex-col overflow-hidden border border-border/60 bg-card transition-all duration-200 hover:-translate-y-px hover:border-border hover:shadow-md sm:flex-row">
      {/* 封面：書脊比例 */}
      <div className="relative h-28 w-full shrink-0 overflow-hidden bg-muted/40 sm:h-auto sm:w-24">
        {hasCover(script.coverUrl) && !failedCover ? (
          <img
            src={cropCover.src || undefined}
            style={cropCover.style}
            alt={script.title || "cover"}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => onCoverError(script.id)}
          />
        ) : script.coverDesign ? (
          <div className="flex h-full w-full items-center justify-center">
            <CoverRenderer design={script.coverDesign} title={script.title || ""} compact responsive className="h-full w-full" />
          </div>
        ) : (
          <CoverPlaceholder title={script.title || t("publisherWorksTab.noCover")} compact />
        )}
        {/* 狀態色條 */}
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${readiness.status === "needs_work" ? "bg-destructive/70" : readiness.status === "ready" ? "bg-primary/70" : "bg-foreground/20"}`} />
      </div>

      <div className="flex flex-1 flex-col justify-between px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* 標題行 */}
            <div className="flex items-center gap-2">
              <h3 className="truncate font-serif text-base font-semibold leading-snug">{script.title}</h3>
              <Badge
                variant="outline"
                className={`shrink-0 h-5 text-[10px] font-semibold ${statusBadgeClass(script)}`}
              >
                {readiness.label}
              </Badge>
            </div>
            {/* 元資料行 */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/70">
              <span>{formatDate(script.lastModified)}</span>
              {readiness.missingRequired.length > 0 && (
                <span className="text-destructive/80">
                  缺：{readiness.missingRequired.slice(0, 3).join("、")}
                </span>
              )}
              {readiness.missingRequired.length === 0 && readiness.missingRecommended.length > 0 && (
                <span className="text-[color:var(--license-term-fg)]/80">
                  建議補：{readiness.missingRecommended.slice(0, 2).join("、")}
                </span>
              )}
            </div>
          </div>
          {readiness.status === "published" && (
            <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground/60">
              <Eye className="h-3.5 w-3.5" />
              <span className="font-mono">{script.views || 0}</span>
            </div>
          )}
        </div>

        {/* 操作列 */}
        <div className="mt-3 flex items-center gap-1.5">
          <Button size="sm" className="h-7 px-3 text-xs" onClick={() => onContinueEdit?.(script)}>
            <FilePenLine className="mr-1 h-3 w-3" /> {t("publisherWorksTab.continueWriting")}
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={() => setEditingScript(script)} data-guide-id="studio-works-edit-info">
            <Edit className="mr-1 h-3 w-3" /> {readiness.primaryActionLabel}
          </Button>
          {readiness.status === "published" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground/60 hover:text-foreground"
              onClick={() => openPublicPath(`/read/${script.id}`)}
            >
              <Eye className="mr-1 h-3 w-3" /> {t("publisherWorksTab.viewPublicPage")}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
