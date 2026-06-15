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

interface WorkScriptGridCardProps {
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

export function WorkScriptGridCard({
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
}: WorkScriptGridCardProps): React.JSX.Element {
  const { t } = useI18n();
  const cropCover = getMediaCropStyle(String(script.coverUrl || ""));

  return (
    <Card className="group overflow-hidden border border-border/60 bg-card p-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-lg">
      {/* 封面主體 */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted/40">
        {hasCover(script.coverUrl) && !failedCover ? (
          <img
            src={cropCover.src || undefined}
            style={cropCover.style}
            alt={script.title || "cover"}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
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
        {/* 頂部狀態條 */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-2 pt-2">
          <Badge
            variant="outline"
            className={`h-5 border-0 text-[10px] font-semibold backdrop-blur-sm ${statusBadgeClass(script)} bg-background/80`}
          >
            {readiness.label}
          </Badge>
          {readiness.status === "published" && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
              <Eye className="h-2.5 w-2.5" />
              <span className="font-mono">{script.views || 0}</span>
            </span>
          )}
        </div>
        {/* 缺失警示條 */}
        {(readiness.missingRequired.length > 0 || readiness.missingRecommended.length > 0) && (
          <div className={`absolute bottom-0 left-0 right-0 px-2 py-1.5 backdrop-blur-sm ${readiness.missingRequired.length > 0 ? "bg-destructive/80" : "bg-[color:var(--license-term-bg)]/90"}`}>
            <p className={`text-[10px] font-medium leading-tight ${readiness.missingRequired.length > 0 ? "text-destructive-foreground" : "text-[color:var(--license-term-fg)]"}`}>
              {readiness.missingRequired.length > 0
                ? `缺：${readiness.missingRequired.slice(0, 2).join("、")}`
                : `建議補：${readiness.missingRecommended.slice(0, 2).join("、")}`}
            </p>
          </div>
        )}
      </div>

      {/* 資訊 + 操作區 */}
      <div className="space-y-2.5 p-3">
        <div>
          <h3 className="line-clamp-2 min-h-[2.4rem] text-sm font-semibold leading-tight">{script.title || "Untitled"}</h3>
          <p className="mt-1 text-[11px] text-muted-foreground/60">
            {formatDate(script.lastModified)}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-1">
          <Button size="sm" className="h-7 justify-start px-3 text-xs" onClick={() => onContinueEdit?.(script)}>
            <FilePenLine className="mr-1.5 h-3 w-3" /> {t("publisherWorksTab.continueWriting")}
          </Button>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 flex-1 justify-start px-2 text-xs" onClick={() => setEditingScript(script)} data-guide-id="studio-works-edit-info">
              <Edit className="mr-1 h-3 w-3" /> {readiness.primaryActionLabel}
            </Button>
            {readiness.status === "published" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground/60 hover:text-foreground"
                onClick={() => openPublicPath(`/read/${script.id}`)}
                title={t("publisherWorksTab.viewPublicPage")}
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
