import React from "react";
import { Columns3, Maximize2 } from "lucide-react";
import { Button } from "../../ui/button";
import { useI18n } from "../../../contexts/I18nContext";
import type { TrackConfig } from "../../../lib/v2";
import type { EditableMarkerConfig, UpdateMarkerFn } from "./types";

interface MarkerLayoutContextPanelProps {
  selectedConfig: EditableMarkerConfig | null;
  selectedIndex: number;
  tracks: TrackConfig[];
  updateMarker: UpdateMarkerFn;
  onOpenFullLayoutEditor: () => void;
  readOnly?: boolean;
}

export function MarkerLayoutContextPanel({
  selectedConfig,
  selectedIndex,
  tracks,
  updateMarker,
  onOpenFullLayoutEditor,
  readOnly = false,
}: MarkerLayoutContextPanelProps): React.JSX.Element {
  const { t } = useI18n();
  const enabledTracks = React.useMemo(
    () => tracks.filter((track) => track.enabled).sort((a, b) => a.order - b.order),
    [tracks]
  );
  const selectedTrackId = String(selectedConfig?.v2TrackId || "");

  return (
    <aside className="hidden h-full min-h-0 border-l border-border/40 bg-muted/10 xl:flex xl:flex-col">
      <div className="border-b bg-background/40 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
          <Columns3 className="h-3.5 w-3.5 text-muted-foreground" />
          {t("markerLayoutContext.title")}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <div className="rounded-md border border-border/60 bg-background/70 p-3">
          <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">
            {t("markerLayoutContext.routeLabel")}
          </label>
          <select
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={selectedTrackId}
            disabled={!selectedConfig || readOnly}
            onChange={(event) => updateMarker(selectedIndex, "v2TrackId", event.target.value || undefined)}
          >
            <option value="">{t("markerLayoutContext.routeAuto")}</option>
            {enabledTracks.map((track) => (
              <option key={track.id} value={track.id}>{track.name} ({track.id})</option>
            ))}
          </select>
        </div>

        <div className="rounded-md border border-border/60 bg-background/70 p-3">
          <div className="mb-2 text-[10px] font-semibold text-muted-foreground">
            {t("markerLayoutContext.previewLabel")}
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(enabledTracks.length, 1)}, minmax(0, 1fr))` }}>
            {enabledTracks.map((track) => {
              const active = selectedTrackId ? selectedTrackId === track.id : false;
              return (
                <div
                  key={track.id}
                  className={`min-h-20 rounded border px-2 py-1.5 text-[10px] ${
                    active
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/50 bg-muted/30 text-muted-foreground"
                  }`}
                >
                  <div className="truncate font-semibold">{track.name}</div>
                  <div className="mt-2 rounded bg-background/70 px-1.5 py-1 text-[10px]">
                    {active ? selectedConfig?.label || selectedConfig?.id : " "}
                  </div>
                </div>
              );
            })}
          </div>
          {!selectedTrackId && selectedConfig ? (
            <p className="mt-2 text-[10px] text-muted-foreground">{t("markerLayoutContext.autoHint")}</p>
          ) : null}
        </div>
      </div>

      <div className="border-t bg-background/40 p-3">
        <Button type="button" variant="outline" size="sm" className="h-8 w-full gap-1.5 text-xs" onClick={onOpenFullLayoutEditor}>
          <Maximize2 className="h-3.5 w-3.5" />
          {t("markerLayoutContext.openFullEditor")}
        </Button>
      </div>
    </aside>
  );
}
