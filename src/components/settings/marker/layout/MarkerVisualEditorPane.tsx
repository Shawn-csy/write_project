import React from "react";
import { PlusCircle, Search, Sparkles } from "lucide-react";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { MarkerList } from "../MarkerList";
import { MarkerDetailEditor } from "../MarkerDetailEditor";
import { MarkerLayoutContextPanel } from "../MarkerLayoutContextPanel";
import { useI18n } from "../../../../contexts/I18nContext";
import type { MarkerConfig } from "../../../../types/script";
import type { TrackConfig } from "../../../../lib/v2";
import type { EditableMarkerConfig, UpdateMarkerFn } from "../types";

interface MarkerVisualEditorPaneProps {
  localConfigs: MarkerConfig[];
  setLocalConfigs: React.Dispatch<React.SetStateAction<MarkerConfig[]>>;
  updateMarker: UpdateMarkerFn;
  removeMarker: (idx: number) => void;
  expandedId: string | number | null;
  setExpandedId: (id: string | number) => void;
  selectedConfig: EditableMarkerConfig | null;
  selectedIndex: number;
  existingIds: string[];
  onAddMarker: () => void;
  isAdvancedMode: boolean;
  setIsAdvancedMode: (value: boolean) => void;
  readOnly?: boolean;
  tracks?: TrackConfig[];
  showLayoutContext?: boolean;
  onOpenFullLayoutEditor?: () => void;
}

export function MarkerVisualEditorPane({
  localConfigs,
  setLocalConfigs,
  updateMarker,
  removeMarker,
  expandedId,
  setExpandedId,
  selectedConfig,
  selectedIndex,
  existingIds,
  onAddMarker,
  isAdvancedMode,
  setIsAdvancedMode,
  readOnly = false,
  tracks = [],
  showLayoutContext = false,
  onOpenFullLayoutEditor,
}: MarkerVisualEditorPaneProps): React.JSX.Element {
  const { t } = useI18n();
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | "block" | "inline" | "range">("all");

  const visibleEntries = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return localConfigs
      .map((config, idx) => ({ config, idx }))
      .filter(({ config }) => {
        const isBlock = config.type === "block" || config.isBlock;
        const markerType = config.matchMode === "range" ? "range" : isBlock ? "block" : "inline";
        if (typeFilter !== "all" && markerType !== typeFilter) return false;
        if (!normalizedQuery) return true;
        const searchable = [
          config.label,
          config.id,
          config.start,
          config.end,
          config.regex,
          config.v2TrackId,
        ].filter(Boolean).join(" ").toLowerCase();
        return searchable.includes(normalizedQuery);
      });
  }, [localConfigs, query, typeFilter]);

  return (
    <div className={`grid h-full grid-cols-1 divide-x divide-border/40 ${showLayoutContext ? "lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_minmax(0,1fr)_280px]" : "lg:grid-cols-[300px_1fr]"}`}>
      <div className="h-full min-h-0 flex flex-col bg-muted/10">
        <div className="space-y-2 p-3 border-b bg-background/30 shrink-0">
          <Button onClick={onAddMarker} className="w-full gap-1.5 h-8 text-xs font-medium shadow-sm" disabled={readOnly}>
            <PlusCircle className="w-3.5 h-3.5" />
            {t("markerVisualEditor.addMarker")}
          </Button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("markerVisualEditor.searchPlaceholder")}
              className="h-8 pl-7 text-xs bg-background/70"
            />
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-md border border-border/50 bg-muted/30 p-1">
            {[
              { id: "all", label: t("markerVisualEditor.filterAll") },
              { id: "block", label: t("markerVisualEditor.filterBlock") },
              { id: "inline", label: t("markerVisualEditor.filterInline") },
              { id: "range", label: t("markerVisualEditor.filterRange") },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setTypeFilter(filter.id as typeof typeFilter)}
                className={`h-6 rounded px-1 text-[10px] font-medium transition-colors ${
                  typeFilter === filter.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {visibleEntries.length > 0 ? (
            <MarkerList
              localConfigs={localConfigs}
              visibleEntries={visibleEntries}
              setLocalConfigs={setLocalConfigs}
              updateMarker={updateMarker}
              removeMarker={removeMarker}
              selectedId={expandedId}
              onSelect={setExpandedId}
              readOnly={readOnly}
            />
          ) : (
            <div className="rounded-md border border-dashed border-border/60 px-3 py-8 text-center text-xs text-muted-foreground">
              {t("markerVisualEditor.noResults")}
            </div>
          )}
        </div>
      </div>

      <div className="h-full min-h-0 bg-background/20 relative">
        {selectedConfig ? (
          <MarkerDetailEditor
            config={selectedConfig}
            idx={selectedIndex}
            updateMarker={updateMarker}
            isAdvancedMode={isAdvancedMode}
            setIsAdvancedMode={setIsAdvancedMode}
            readOnly={readOnly}
            tracks={tracks}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60 space-y-3">
            <Sparkles className="w-12 h-12 stroke-1" />
            <p className="text-sm">{t("markerVisualEditor.emptyHint")}</p>
          </div>
        )}
      </div>

      {showLayoutContext && onOpenFullLayoutEditor ? (
        <MarkerLayoutContextPanel
          selectedConfig={selectedConfig}
          selectedIndex={selectedIndex}
          tracks={tracks}
          updateMarker={updateMarker}
          onOpenFullLayoutEditor={onOpenFullLayoutEditor}
          readOnly={readOnly}
        />
      ) : null}
    </div>
  );
}
