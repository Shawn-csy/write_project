import React from "react";
import { Palette, ChevronDown, Check } from "lucide-react";
import { Button } from "./button";
import { MarkerVisibilitySelect } from "./MarkerVisibilitySelect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  themeTriggerClassName = "",
  contentAlign = "end",
  compact = false,
  iconOnly = false,
  iconOnlyOnMobile = false,
  className = "",
}) {
  const { t } = useI18n();
  if (!markerConfigs?.length || !onToggleMarker) return null;

  return (
    <div className={`inline-flex items-stretch ${className}`}>
      <MarkerVisibilitySelect
        markerConfigs={markerConfigs}
        hiddenMarkerIds={hiddenMarkerIds}
        visibleMarkerIds={visibleMarkerIds}
        onToggleMarker={onToggleMarker}
        triggerClassName={visibilityTriggerClassName}
        contentAlign={contentAlign}
        titlePrefix={titlePrefix || t("editorHeader.markerPrefix")}
        compact={compact}
        iconOnly={iconOnly}
        iconOnlyOnMobile={iconOnlyOnMobile}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={themeTriggerClassName}
            title={t("editorHeader.markerTheme")}
            aria-label={t("editorHeader.markerTheme")}
          >
            <Palette className="h-4 w-4" />
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={contentAlign} className="w-64">
          <DropdownMenuLabel>{t("editorHeader.markerTheme")}</DropdownMenuLabel>
          {(markerThemes || []).map((theme) => {
            const isActive = theme?.id === currentThemeId;
            return (
              <DropdownMenuItem
                key={theme?.id || "unknown-theme"}
                onSelect={() => {
                  if (theme?.id) onSwitchMarkerTheme(theme.id);
                }}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{theme?.name || theme?.id || t("editorHeader.unknownTheme")}</span>
                {isActive ? <Check className="h-4 w-4 text-primary" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
