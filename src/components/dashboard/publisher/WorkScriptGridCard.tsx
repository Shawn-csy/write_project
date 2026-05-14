import React from "react";
import { Eye, Edit, FilePenLine } from "lucide-react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { CoverPlaceholder } from "../../ui/CoverPlaceholder";
import { useI18n } from "../../../contexts/I18nContext";
import type { PublisherScriptItem } from "../../../hooks/publisher/usePublisherWorksTabState";

const warningBadgeClass = "h-5 border-[color:var(--license-term-border)] bg-[color:var(--license-term-bg)] text-[10px] font-semibold text-[color:var(--license-term-fg)]";
const errorBadgeClass = "h-5 border-destructive/40 bg-destructive/10 text-[10px] font-semibold text-destructive";

interface WorkScriptGridCardProps {
  script: PublisherScriptItem;
  failedCover: boolean;
  onCoverError: (id: string) => void;
  hasCover: (value: unknown) => boolean;
  hasCompleteLicense: (script: PublisherScriptItem) => boolean;
  statusBadgeClass: (script: PublisherScriptItem) => string;
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
  formatDate,
  onContinueEdit,
  setEditingScript,
  navigate,
}: WorkScriptGridCardProps): React.JSX.Element {
  const { t } = useI18n();

  return (
    <Card className="overflow-hidden p-0">
      <div className="aspect-[2/3] w-full bg-muted/30">
        {hasCover(script.coverUrl) && !failedCover ? (
          <img
            src={script.coverUrl || undefined}
            alt={script.title || "cover"}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => onCoverError(script.id)}
          />
        ) : (
          <CoverPlaceholder title={script.title || t("publisherWorksTab.noCover")} compact />
        )}
      </div>
      <div className="space-y-3 p-3">
        <div className="space-y-1">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5">{script.title || "Untitled"}</h3>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={`h-5 text-[10px] font-semibold ${statusBadgeClass(script)}`}>
                {script.status === "Public" ? t("publisherWorksTab.statusPublic") : t("publisherWorksTab.statusPrivate")}
              </Badge>
              {!hasCover(script.coverUrl) && (
                <Badge variant="outline" className={warningBadgeClass}>缺封面</Badge>
              )}
              {!hasCompleteLicense(script) && (
                <Badge variant="outline" className={errorBadgeClass}>缺授權</Badge>
              )}
            </div>
            {script.status === "Public" && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                {script.views || 0}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t("publisherWorksTab.updatedAt")}：{formatDate(script.lastModified)}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          <Button size="sm" className="h-8 justify-start" onClick={() => onContinueEdit?.(script)}>
            <FilePenLine className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.continueWriting")}
          </Button>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-8 flex-1 justify-start" onClick={() => setEditingScript(script)} data-guide-id="studio-works-edit-info">
              <Edit className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.editInfo")}
            </Button>
            {script.status === "Public" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 flex-1 justify-start text-muted-foreground hover:text-foreground"
                onClick={() => navigate(`/read/${script.id}`)}
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.viewPublicPage")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
