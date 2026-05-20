import React from "react";
import { Columns3, Maximize2, Rows3 } from "lucide-react";
import { Button } from "../../ui/button";
import { useI18n } from "../../../contexts/I18nContext";
import type { EventKind, LayoutConfig, TrackConfig } from "../../../lib/v2";
import type { EditableMarkerConfig, UpdateMarkerFn } from "./types";

interface MarkerLayoutContextPanelProps {
  selectedConfig: EditableMarkerConfig | null;
  selectedIndex: number;
  tracks: TrackConfig[];
  layoutConfig?: LayoutConfig;
  onLayoutChange?: (config: LayoutConfig) => void;
  updateMarker: UpdateMarkerFn;
  onOpenFullLayoutEditor: () => void;
  readOnly?: boolean;
}

export function MarkerLayoutContextPanel({
  selectedConfig,
  selectedIndex,
  tracks,
  layoutConfig,
  onLayoutChange,
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
  const selectedEventKind = String(selectedConfig?.v2EventKind || "");
  const rowGrouping = layoutConfig?.rowGrouping === "adjacent_dialogue" ? "adjacent_dialogue" : "line";
  const eventKindOptions: Array<{ value: "" | EventKind; label: string }> = [
    { value: "", label: t("markerLayoutContext.purposeAuto") },
    { value: "speech", label: t("markerLayoutContext.purposeSpeech") },
    { value: "sfx", label: t("markerLayoutContext.purposeSfx") },
    { value: "bgm", label: t("markerLayoutContext.purposeBgm") },
    { value: "narration", label: t("markerLayoutContext.purposeNarration") },
    { value: "stage_direction", label: t("markerLayoutContext.purposeStageDirection") },
    { value: "meta", label: t("markerLayoutContext.purposeMeta") },
    { value: "custom", label: t("markerLayoutContext.purposeCustom") },
  ];

  const updateRowGrouping = (nextRowGrouping: LayoutConfig["rowGrouping"]) => {
    if (!layoutConfig || !onLayoutChange || readOnly) return;
    onLayoutChange({ ...layoutConfig, rowGrouping: nextRowGrouping });
  };

  return (
    <aside className="hidden h-full min-h-0 border-l border-border/40 bg-muted/10 lg:flex lg:w-[300px] lg:flex-col xl:w-[320px]">
      <div className="border-b bg-background/40 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
          <Columns3 className="h-3.5 w-3.5 text-muted-foreground" />
          {t("markerLayoutContext.title")}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <div className="rounded-md border border-border/60 bg-background/70 p-3">
          <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">
            {t("markerLayoutContext.purposeLabel")}
          </label>
          <select
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={selectedEventKind}
            disabled={!selectedConfig || readOnly}
            onChange={(event) => updateMarker(selectedIndex, "v2EventKind", event.target.value || undefined)}
          >
            {eventKindOptions.map((option) => (
              <option key={option.value || "auto"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
            {t("markerLayoutContext.purposeHint")}
          </p>
        </div>

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

        <div className="rounded-md border border-border/60 bg-background/70 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Rows3 className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground">
                {t("appearance.dialogueRowLayout")}
              </div>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                {t("appearance.dialogueRowLayoutDesc")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-border/50 bg-muted/30 p-1">
            {[
              { value: "line", label: t("appearance.dialogueRowNormal") },
              { value: "adjacent_dialogue", label: t("appearance.dialogueRowSideBySide") },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={!layoutConfig || readOnly}
                onClick={() => updateRowGrouping(option.value as LayoutConfig["rowGrouping"])}
                className={`min-h-8 rounded px-2 text-[10px] font-medium transition-colors ${
                  rowGrouping === option.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {option.label}
              </button>
            ))}
          </div>
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
