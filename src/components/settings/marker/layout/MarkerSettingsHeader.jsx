import React from "react";
import { BookOpen, FileCode2, FileText } from "lucide-react";
import { CardDescription, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { cn } from "../../../../lib/utils";
import { useI18n } from "../../../../contexts/I18nContext";

export function MarkerSettingsHeader({ viewMode, setViewMode, statusText }) {
  const { t } = useI18n();
  const VIEW_MODES = [
    { id: "ui", label: t("markerSettingsHeader.viewUi"), icon: FileText },
    { id: "json", label: "JSON", icon: FileCode2 },
    { id: "guide", label: t("markerSettingsHeader.viewGuide"), icon: BookOpen },
  ];

  return (
    <CardHeader className="pb-3 px-5 py-4 border-b bg-muted/20 shrink-0">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base">{t("markerSettingsHeader.title")}</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {t("markerSettingsHeader.subtitle")}
              </CardDescription>
            </div>
          </div>
          <div className="hidden md:inline text-xs text-muted-foreground">{statusText}</div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/50">
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
          <div className="md:hidden text-[11px] text-muted-foreground">{statusText}</div>
        </div>
      </div>
    </CardHeader>
  );
}
