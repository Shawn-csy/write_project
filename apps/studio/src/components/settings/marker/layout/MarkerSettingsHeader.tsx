import React from "react";
import { Check, ChevronDown, Columns3, Ellipsis, Loader2, Plus } from "lucide-react";
import { Button } from "../../../ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../ui/dropdown-menu";
import { useI18n } from "../../../../contexts/I18nContext";
import { cn } from "../../../../lib/utils";

export type MarkerViewMode = "ui" | "json";

interface ThemeOption {
  id: string;
  label: string;
}

interface MarkerSettingsHeaderProps {
  viewMode: MarkerViewMode;
  setViewMode: (mode: MarkerViewMode) => void;
  statusText: string;
  canSave: boolean;
  isSaving?: boolean;
  onSave: () => void;
  themes: ThemeOption[];
  currentThemeId: string;
  currentThemeLabel: string;
  themeBadge: string;
  onSwitchTheme: (id: string) => void;
  onCreateTheme: () => void;
  onOpenThemeDetails: () => void;
  onOpenPublicity?: () => void;
  publicityLabel?: string;
  onDeleteTheme?: () => void;
  onOpenLayout: () => void;
  multiColumn: boolean;
  onToggleMultiColumn: (value: boolean) => void;
}

export function MarkerSettingsHeader({
  viewMode,
  setViewMode,
  statusText,
  canSave,
  isSaving = false,
  onSave,
  themes,
  currentThemeId,
  currentThemeLabel,
  themeBadge,
  onSwitchTheme,
  onCreateTheme,
  onOpenThemeDetails,
  onOpenPublicity,
  publicityLabel,
  onDeleteTheme,
  onOpenLayout,
  multiColumn,
  onToggleMultiColumn,
}: MarkerSettingsHeaderProps): React.JSX.Element {
  const { t } = useI18n();
  const modes: Array<{ id: MarkerViewMode; label: string }> = [
    { id: "ui", label: t("markerSettingsHeader.viewRules") },
    { id: "json", label: "JSON" },
  ];

  return (
    <header className="shrink-0 border-b border-border px-3 py-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
        {/* Non-modal: items open Dialogs; a modal menu plus a modal Dialog trap focus against each other. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 max-w-[15rem] gap-2 px-2.5 sm:px-3" aria-label={`${t("markerThemeHeader.currentTheme")}：${currentThemeLabel}`}>
              <span className="hidden text-xs text-muted-foreground sm:inline">{t("markerThemeHeader.theme")}</span>
              <span className="truncate font-semibold">{currentThemeLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t("markerThemeHeader.currentTheme")}</DropdownMenuLabel>
            {themes.map((theme) => (
              <DropdownMenuItem key={theme.id} onClick={() => onSwitchTheme(theme.id)} className="gap-2">
                <Check className={cn("h-4 w-4", theme.id === currentThemeId ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{theme.label}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateTheme} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("markerThemeHeader.newTheme")}…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="hidden h-[22px] items-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground md:inline-flex">{themeBadge}</span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <div role="tablist" aria-label={t("markerStudio.viewMode", "檢視方式")} className="inline-flex gap-0.5 rounded-lg bg-muted p-[3px]">
            {modes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={viewMode === mode.id}
                onClick={() => setViewMode(mode.id)}
                className={cn(
                  "h-8 rounded-md px-2.5 text-[13px] transition-colors",
                  viewMode === mode.id ? "bg-background font-semibold text-foreground shadow-[0_0_0_1px_hsl(var(--border))]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <Button variant="outline" className="h-8 px-2.5" onClick={onOpenLayout} aria-label={t("markerSettingsHeader.viewLayout")}>
            <Columns3 className="h-4 w-4" />
            <span className="hidden lg:inline">{t("markerSettingsHeader.viewLayout")}</span>
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("markerThemeHeader.moreSettings")}>
                <Ellipsis className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onClick={onOpenThemeDetails}>{t("markerStudio.themeDetails", "主題名稱與說明…")}</DropdownMenuItem>
              {onOpenPublicity ? <DropdownMenuItem onClick={onOpenPublicity}>{publicityLabel}</DropdownMenuItem> : null}
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={multiColumn} onCheckedChange={(value) => onToggleMultiColumn(Boolean(value))}>
                {t("appearance.multiTrackRenderer")}
              </DropdownMenuCheckboxItem>
              {onDeleteTheme ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDeleteTheme} className="text-destructive focus:text-destructive">
                    {t("markerStudio.deleteTheme", "刪除這個主題…")}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="hidden text-xs text-muted-foreground xl:inline" role="status">{statusText}</span>
          <Button className="h-8 min-w-[4.5rem] px-3" onClick={onSave} disabled={!canSave || isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("common.save")}
          </Button>
        </div>
      </div>
    </header>
  );
}
