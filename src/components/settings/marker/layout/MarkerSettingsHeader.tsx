import React from "react";
import { FileCode2, FileText, BookOpen, Save, Loader2 } from "lucide-react";
import { CardHeader } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { cn } from "../../../../lib/utils";
import { useI18n } from "../../../../contexts/I18nContext";

interface MarkerSettingsHeaderProps {
  viewMode: "ui" | "json" | "guide";
  setViewMode: React.Dispatch<React.SetStateAction<"ui" | "json" | "guide">>;
  statusText: string;
  isDirty?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
}

export function MarkerSettingsHeader({ viewMode, setViewMode, statusText, isDirty, isSaving, onSave }: MarkerSettingsHeaderProps): React.JSX.Element {
  const { t } = useI18n();
  const VIEW_MODES = [
    { id: "ui", label: t("markerSettingsHeader.viewRules"), icon: FileText },
    { id: "json", label: "JSON", icon: FileCode2 },
    { id: "guide", label: t("markerSettingsHeader.viewGuide"), icon: BookOpen },
  ] as const;

  return (
    <CardHeader className="px-4 py-2 border-b bg-muted/20 shrink-0">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-muted/50 border border-border/50">
          {VIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <Button
                key={mode.id}
                variant={viewMode === mode.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode(mode.id)}
                className={cn("h-7 text-xs gap-1.5", viewMode === mode.id && "shadow-sm")}
              >
                <Icon className="w-3.5 h-3.5" />
                {mode.label}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{statusText}</span>
          {onSave && (
            <Button
              size="sm"
              variant={isDirty ? "default" : "ghost"}
              onClick={onSave}
              disabled={!isDirty || isSaving}
              className="h-7 px-2 gap-1.5 text-xs"
            >
              {isSaving
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Save className="w-3 h-3" />
              }
              {t("common.save")}
            </Button>
          )}
        </div>
      </div>
    </CardHeader>
  );
}
