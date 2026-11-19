import React from "react";
import { ArrowLeft, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { MarkerList } from "../MarkerList";
import { MarkerDetailEditor } from "../MarkerDetailEditor";
import { MarkerTestPanel } from "../MarkerTestPanel";
import { useI18n } from "../../../../contexts/I18nContext";
import { cn } from "../../../../lib/utils";
import type { MarkerConfig } from "../../../../types/script";
import type { LayoutConfig, TrackConfig } from "../../../../lib/v2";
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
  readOnly?: boolean;
  tracks?: TrackConfig[];
  layoutConfig?: LayoutConfig;
  onLayoutChange?: (config: LayoutConfig) => void;
  onOpenFullLayoutEditor?: () => void;
  usePresentationRenderer?: boolean;
}

const FILTERS = ["all", "block", "inline", "range"] as const;

export function MarkerVisualEditorPane({
  localConfigs,
  setLocalConfigs,
  updateMarker,
  removeMarker,
  expandedId,
  setExpandedId,
  selectedConfig,
  selectedIndex,
  onAddMarker,
  readOnly = false,
  tracks = [],
  layoutConfig,
  onLayoutChange,
  onOpenFullLayoutEditor,
  usePresentationRenderer = false,
}: MarkerVisualEditorPaneProps): React.JSX.Element {
  const { t } = useI18n();
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<typeof FILTERS[number]>("all");
  // Narrow screens show the list and the editor as two steps instead of stacking them.
  const [mobileView, setMobileView] = React.useState<"list" | "editor">("list");

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

  const filterLabel: Record<typeof FILTERS[number], string> = {
    all: t("markerVisualEditor.filterAll"),
    block: t("markerVisualEditor.filterBlock"),
    inline: t("markerVisualEditor.filterInline"),
    range: t("markerVisualEditor.filterRange"),
  };

  const selectRule = (id: string | number) => {
    setExpandedId(id);
    setMobileView("editor");
  };

  const addRule = () => {
    onAddMarker();
    setMobileView("editor");
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_23rem]">
      <section
        aria-label={t("markerStudio.rules", "標記規則")}
        className={cn("min-h-0 flex-col border-border lg:flex lg:border-r", mobileView === "list" ? "flex" : "hidden")}
      >
        <div className="shrink-0 space-y-2 p-3">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("markerVisualEditor.searchPlaceholder")}
                aria-label={t("markerVisualEditor.searchPlaceholder")}
                type="search"
                className="h-10 pl-8 text-sm sm:h-9"
              />
            </div>
            <Button onClick={addRule} disabled={readOnly} className="h-10 shrink-0 px-3 sm:h-9" aria-label={t("markerVisualEditor.addMarker")}>
              <Plus className="h-4 w-4" />
              <span>{t("markerStudio.add", "新增")}</span>
            </Button>
          </div>
          <div role="tablist" aria-label={t("markerStudio.filterByType", "依類型篩選")} className="grid grid-cols-4 gap-0.5 rounded-lg bg-muted p-[3px]">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={typeFilter === filter}
                onClick={() => setTypeFilter(filter)}
                className={cn(
                  "h-9 rounded-md text-xs transition-colors sm:h-7",
                  typeFilter === filter ? "bg-background font-semibold text-foreground shadow-[0_0_0_1px_hsl(var(--border))]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {filterLabel[filter]}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {visibleEntries.length > 0 ? (
            <MarkerList
              localConfigs={localConfigs}
              visibleEntries={visibleEntries}
              setLocalConfigs={setLocalConfigs}
              updateMarker={updateMarker}
              removeMarker={removeMarker}
              selectedId={expandedId}
              onSelect={selectRule}
              readOnly={readOnly}
            />
          ) : (
            <div className="mx-1 rounded-[10px] border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
              {t("markerVisualEditor.noResults")}
            </div>
          )}
        </div>
        <p className="shrink-0 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          {t("markerStudio.orderHint", "拖曳排序，上方的規則優先比對。")}
        </p>
      </section>

      <section
        aria-label={t("markerStudio.ruleSettings", "規則設定")}
        className={cn("min-h-0 overflow-y-auto lg:block", mobileView === "editor" ? "block" : "hidden")}
      >
        <div className="sticky top-0 z-10 border-b border-border bg-background px-2 py-1 lg:hidden">
          <Button type="button" variant="ghost" className="h-11" onClick={() => setMobileView("list")}>
            <ArrowLeft className="h-4 w-4" />
            {t("markerStudio.backToRules", "所有規則")}
          </Button>
        </div>
        {selectedConfig ? (
          <MarkerDetailEditor
            config={selectedConfig}
            idx={selectedIndex}
            updateMarker={updateMarker}
            readOnly={readOnly}
            tracks={tracks}
            layoutConfig={layoutConfig}
            onLayoutChange={onLayoutChange}
            onOpenFullLayoutEditor={onOpenFullLayoutEditor}
            onDelete={selectedIndex >= 0 ? () => { removeMarker(selectedIndex); setMobileView("list"); } : undefined}
          />
        ) : (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground">
            <Sparkles className="h-10 w-10 stroke-1" />
            <p className="text-sm">{t("markerVisualEditor.emptyHint")}</p>
          </div>
        )}
        <MarkerTestPanel
          className="border-t border-border xl:hidden"
          markerConfigs={localConfigs}
          selectedConfig={selectedConfig}
          usePresentationRenderer={usePresentationRenderer}
          layoutConfig={layoutConfig}
        />
      </section>

      <MarkerTestPanel
        className="hidden border-l border-border xl:flex"
        markerConfigs={localConfigs}
        selectedConfig={selectedConfig}
        usePresentationRenderer={usePresentationRenderer}
        layoutConfig={layoutConfig}
      />
    </div>
  );
}
