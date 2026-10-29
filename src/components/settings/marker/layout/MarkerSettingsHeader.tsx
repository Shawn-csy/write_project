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

export type MarkerViewMode = "ui" | "json" | "guide";

interface ThemeOption {
  id: string;
  label: string;
}

interface MarkerSettingsHeaderProps {
  /** Leading control rendered before the title (e.g. mobile menu button). */
  leading?: React.ReactNode;
  /** Optional breadcrumb shown above the title on the standalone page. */
  breadcrumb?: React.ReactNode;
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
  leading,
  breadcrumb,
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
    { id: "guide", label: t("markerSettingsHeader.viewGuide") },
  ];

  return (
    <header className="shrink-0 border-b border-border px-4 pb-3 pt-3 sm:px-6 lg:px-8 lg:pt-5">
      {breadcrumb ? <div className="mb-1 flex items-center gap-1 text-[13px] text-muted-foreground">{leading}{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {!breadcrumb ? leading : null}
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("settings.markers")}</h1>

        {/* Non-modal: items open Dialogs; a modal menu plus a modal Dialog trap focus against each other. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 max-w-[16rem] gap-2" aria-label={`${t("markerThemeHeader.currentTheme")}：${currentThemeLabel}`}>
              <span className="text-xs text-muted-foreground">{t("markerThemeHeader.theme")}</span>
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
        <span className="inline-flex h-[22px] items-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">{themeBadge}</span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label={t("markerStudio.viewMode", "檢視方式")} className="inline-flex gap-0.5 rounded-lg bg-muted p-[3px]">
            {modes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={viewMode === mode.id}
                onClick={() => setViewMode(mode.id)}
                className={cn(
                  "h-9 rounded-md px-3 text-[13px] transition-colors sm:h-[30px]",
                  viewMode === mode.id ? "bg-background font-semibold text-foreground shadow-[0_0_0_1px_hsl(var(--border))]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <Button variant="outline" className="h-9 px-2.5 sm:px-3" onClick={onOpenLayout} aria-label={t("markerSettingsHeader.viewLayout")}>
            <Columns3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("markerSettingsHeader.viewLayout")}</span>
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t("markerThemeHeader.moreSettings")}>
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
          <span className="hidden text-xs text-muted-foreground sm:inline" role="status">{statusText}</span>
          <Button className="h-9 min-w-[5rem]" onClick={onSave} disabled={!canSave || isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("common.save")}
          </Button>
        </div>
      </div>
    </header>
  );
}
