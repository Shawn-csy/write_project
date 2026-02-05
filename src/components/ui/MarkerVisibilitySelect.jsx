import React, { useMemo } from "react";
import { Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
} from "./select";

export function MarkerVisibilitySelect({
  markerConfigs = [],
  visibleMarkerIds,
  hiddenMarkerIds,
  onToggleMarker,
  triggerClassName,
  contentAlign = "end",
  label = "顯示標記",
  titlePrefix = "標記"
}) {
  const computedVisibleIds = useMemo(() => {
    if (Array.isArray(visibleMarkerIds)) return visibleMarkerIds;
    if (!Array.isArray(markerConfigs) || markerConfigs.length === 0) return [];
    const hidden = Array.isArray(hiddenMarkerIds) ? hiddenMarkerIds : [];
    return markerConfigs.filter((c) => !hidden.includes(c.id)).map((c) => c.id);
  }, [markerConfigs, visibleMarkerIds, hiddenMarkerIds]);

  if (!markerConfigs || markerConfigs.length === 0 || !onToggleMarker) return null;

  return (
    <Select value="markers" onValueChange={() => {}}>
      <SelectTrigger className={triggerClassName}>
        <span className="truncate">
          {titlePrefix} ({computedVisibleIds.length}/{markerConfigs.length})
        </span>
      </SelectTrigger>
      <SelectContent align={contentAlign}>
        <SelectGroup>
          <SelectLabel>{label}</SelectLabel>
          {markerConfigs.map((config) => {
            const isVisible = computedVisibleIds.includes(config.id);
            return (
              <div
                key={config.id}
                className="flex items-center px-2 py-1.5 cursor-pointer hover:bg-muted text-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleMarker(config.id);
                }}
              >
                <div
                  className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${
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
              </div>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
