import React, { useMemo } from "react";
import { Eye, Palette, Check } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { useI18n } from "../../contexts/I18nContext";

export function MarkerThemeVisibilityControl({
  markerConfigs = [],
  hiddenMarkerIds,
  visibleMarkerIds,
  onToggleMarker,
  markerThemes = [],
  currentThemeId = "default",
  onSwitchMarkerTheme = () => {},
  titlePrefix,
  visibilityTriggerClassName = "",
  themeTriggerClassName: _themeTriggerClassName = "",
  contentAlign = "end",
  compact: _compact = false,
  iconOnly: _iconOnly = false,
  iconOnlyOnMobile: _iconOnlyOnMobile = false,
  className = "",
}: {
  markerConfigs?: Array<{ id: string; label?: string; [key: string]: unknown }>;
  hiddenMarkerIds?: string[];
  visibleMarkerIds?: string[];
  onToggleMarker: (id: string) => void;
  markerThemes?: Array<{ id: string; name?: string; [key: string]: unknown }>;
  currentThemeId?: string;
  onSwitchMarkerTheme?: (themeId: string) => void;
  titlePrefix?: string;
  visibilityTriggerClassName?: string;
  themeTriggerClassName?: string;
  contentAlign?: "start" | "center" | "end";
  compact?: boolean;
  iconOnly?: boolean;
  iconOnlyOnMobile?: boolean;
  className?: string;
}) {
  const { t } = useI18n();

  const computedVisibleIds = useMemo(() => {
    if (Array.isArray(visibleMarkerIds)) return visibleMarkerIds;
    if (!Array.isArray(markerConfigs) || markerConfigs.length === 0) return [];
    const hidden = Array.isArray(hiddenMarkerIds) ? hiddenMarkerIds : [];
    return markerConfigs.filter((c) => !hidden.includes(c.id)).map((c) => c.id);
  }, [markerConfigs, visibleMarkerIds, hiddenMarkerIds]);

  if (!markerConfigs?.length || !onToggleMarker) return null;

  const resolvedTitlePrefix = titlePrefix || t("editorHeader.markerPrefix");
  const visibleCount = computedVisibleIds.length;
  const totalCount = markerConfigs.length;
  const triggerTitle = `${resolvedTitlePrefix} (${visibleCount}/${totalCount})`;

  return (
    <div className={`inline-flex items-stretch ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={visibilityTriggerClassName ? "default" : "icon"}
            className={visibilityTriggerClassName || "h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"}
            title={triggerTitle}
            aria-label={triggerTitle}
          >
            <Eye className="h-4 w-4 shrink-0" />
            {visibilityTriggerClassName && (
              <span className="truncate">{triggerTitle}</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={contentAlign} className="w-56">
          <DropdownMenuLabel>{resolvedTitlePrefix}</DropdownMenuLabel>
          {markerConfigs.map((config) => {
            const isVisible = computedVisibleIds.includes(config.id);
            return (
              <DropdownMenuItem
                key={config.id}
                onSelect={(e) => {
                  e.preventDefault();
                  onToggleMarker(config.id);
                }}
                className="flex items-center gap-2"
              >
                <div
                  className={`w-4 h-4 shrink-0 border rounded flex items-center justify-center ${
                    isVisible
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input"
                  }`}
                >
                  {isVisible && <Check className="w-2 h-2" />}
                </div>
                <span className={!isVisible ? "opacity-50" : ""}>
                  {config.label || config.id}
                </span>
              </DropdownMenuItem>
            );
          })}

          {markerThemes.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span>{t("editorHeader.markerTheme")}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-[240px] overflow-y-auto w-48">
                  {markerThemes.map((theme) => {
                    const isActive = theme?.id === currentThemeId;
                    return (
                      <DropdownMenuItem
                        key={theme?.id || "unknown-theme"}
                        onSelect={() => {
                          if (theme?.id) onSwitchMarkerTheme(theme.id);
                        }}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          {theme?.name || theme?.id || t("editorHeader.unknownTheme")}
                        </span>
                        {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
