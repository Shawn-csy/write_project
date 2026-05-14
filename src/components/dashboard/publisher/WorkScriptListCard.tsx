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

interface WorkScriptListCardProps {
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

export function WorkScriptListCard({
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
}: WorkScriptListCardProps): React.JSX.Element {
  const { t } = useI18n();

  return (
    <Card className="flex flex-col overflow-hidden sm:flex-row">
      <div className="relative h-32 w-full shrink-0 bg-muted sm:w-32">
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
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-serif text-lg font-semibold">{script.title}</h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("publisherWorksTab.updatedAt")}：{formatDate(script.lastModified)}</span>
              <span>•</span>
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
          </div>
          {script.status === "Public" && (
            <div className="flex gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1"><Eye className="h-4 w-4" /> {script.views || 0}</div>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-2">
          <Button size="sm" className="h-8" onClick={() => onContinueEdit?.(script)}>
            <FilePenLine className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.continueWriting")}
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setEditingScript(script)} data-guide-id="studio-works-edit-info">
            <Edit className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.editInfo")}
          </Button>
          {script.status === "Public" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-foreground"
              onClick={() => navigate(`/read/${script.id}`)}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.viewPublicPage")}
            </Button>
          )}
          <div className="flex-1" />
        </div>
      </div>
    </Card>
  );
}
