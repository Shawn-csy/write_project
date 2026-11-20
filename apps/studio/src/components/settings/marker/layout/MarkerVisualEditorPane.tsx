import React from "react";
import { ArrowLeft, Plus, Search, Trash2, Undo2 } from "lucide-react";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { MarkerList } from "../MarkerList";
import { MarkerDetailEditor } from "../MarkerDetailEditor";
import { MarkerWordSettings } from "../MarkerWordSettings";
import { MarkerTestPanel } from "../MarkerTestPanel";
import "./markerRulePanes.css";
import { useI18n } from "../../../../contexts/I18nContext";
import { cn } from "../../../../lib/utils";
import { loadProductionMarkerMapping } from "../../../../lib/productionScriptExport";
import type { MarkerConfig } from "../../../../types/script";
import type { LayoutConfig, TrackConfig } from "../../../../lib/v2";
import type { EditableMarkerConfig, UpdateMarkerFn } from "../types";

interface MarkerVisualEditorPaneProps {
  localConfigs: MarkerConfig[];
  setLocalConfigs: React.Dispatch<React.SetStateAction<MarkerConfig[]>>;
  updateMarker: UpdateMarkerFn;
  removeMarker: (idx: number) => void;
  setExpandedId: (id: string | null) => void;
  selectedConfig: EditableMarkerConfig | null;
  selectedIndex: number;
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
  const searchRef = React.useRef<HTMLInputElement>(null);
  const backRef = React.useRef<HTMLButtonElement>(null);
  const previousRule = React.useRef<string | null>(null);
  const focusAfterNavigation = React.useRef(false);
  const mapping = React.useMemo(() => loadProductionMarkerMapping(localConfigs), [localConfigs]);

  React.useEffect(() => {
    if (!focusAfterNavigation.current) return;
    focusAfterNavigation.current = false;
    if (selectedConfig) {
      backRef.current?.focus();
    } else {
      const previous = previousRule.current ? document.getElementById(`marker-rule-${previousRule.current}`) : null;
      (previous ?? searchRef.current)?.focus();
    }
  }, [selectedConfig]);

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

  const selectRule = (id: string) => {
    previousRule.current = id;
    focusAfterNavigation.current = true;
    setExpandedId(id);
  };

  const backToRules = () => {
    focusAfterNavigation.current = true;
    setExpandedId(null);
  };

  const [removed, setRemoved] = React.useState<Array<{ config: MarkerConfig; index: number }>>([]);
  const lastRemoved = removed[removed.length - 1];
  const deleteRule = (index: number) => {
    const config = localConfigs[index];
    if (readOnly || !config) return;
    setRemoved(history => [...history, { config, index }]);
    focusAfterNavigation.current = Boolean(selectedConfig);
    removeMarker(index);
  };

  const undoDelete = () => {
    if (!lastRemoved || readOnly) return;
    const { config, index } = lastRemoved;
    setLocalConfigs(current => {
      if (current.some(item => item.id === config.id)) return current;
      return [...current.slice(0, index), config, ...current.slice(index)];
    });
    setRemoved(history => history.slice(0, -1));
  };

  const body = !selectedConfig ? (
    <section aria-label={t("markerStudio.rules")} className="flex h-full min-h-0 flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex min-w-48 flex-1 gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("markerVisualEditor.searchPlaceholder")}
                aria-label={t("markerVisualEditor.searchPlaceholder")}
                type="search"
                className="h-10 pl-8 text-sm sm:h-9"
              />
            </div>
            <Button onClick={() => {
              focusAfterNavigation.current = true;
              onAddMarker();
            }} disabled={readOnly} className="h-10 shrink-0 px-3 sm:h-9" aria-label={t("markerVisualEditor.addMarker")}>
              <Plus className="h-4 w-4" />
              <span>{t("markerStudio.add", "新增")}</span>
            </Button>
          </div>
          <div role="group" aria-label={t("markerStudio.filterByType", "依類型篩選")} className="flex gap-0.5 rounded-lg bg-muted p-[3px]">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                aria-pressed={typeFilter === filter}
                onClick={() => setTypeFilter(filter)}
                className={cn(
                  "h-9 rounded-md px-2 text-xs transition-colors sm:h-7",
                  typeFilter === filter ? "bg-background font-semibold text-foreground shadow-[0_0_0_1px_hsl(var(--border))]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {filterLabel[filter]}
              </button>
            ))}
          </div>
        </div>
        {lastRemoved && !readOnly && <div className="flex shrink-0 items-center justify-between rounded-md bg-muted px-3 py-1 text-sm">
          <span role="status">{t("markerStudio.removedRule").replace("{name}", lastRemoved.config.label || lastRemoved.config.id)}</span>
          <Button type="button" variant="ghost" size="sm" onClick={undoDelete}><Undo2 className="h-4 w-4" />{t("markerStudio.undoDelete")}</Button>
        </div>}
        {visibleEntries.length > 0 ? (
          <MarkerList layoutConfig={layoutConfig} usePresentationRenderer={usePresentationRenderer} localConfigs={localConfigs} visibleEntries={visibleEntries} setLocalConfigs={setLocalConfigs}
            updateMarker={updateMarker} mapping={mapping} onSelect={selectRule} onRemove={deleteRule} readOnly={readOnly} />
        ) : (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t("markerVisualEditor.noResults")}
          </p>
        )}
    </section>
  ) : (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-1.5 sm:px-5">
        <Button ref={backRef} type="button" variant="ghost" size="sm" onClick={backToRules}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("markerStudio.backToRules")}
        </Button>
        <Input aria-label={t("markerGeneral.name")} readOnly={readOnly} value={selectedConfig.label || ""}
          onChange={e => updateMarker(selectedIndex, "label", e.target.value)}
          placeholder={t("markerDetailEditor.unnamedMarker")} className="h-8 min-w-20 max-w-64 flex-1 font-semibold" />
        {!readOnly && <Button type="button" size="sm" variant="ghost" className="ms-auto text-destructive" onClick={() => deleteRule(selectedIndex)}>
          <Trash2 className="h-4 w-4" />{t("markerStudio.deleteRule")}
        </Button>}
      </header>
      <MarkerTestPanel key={selectedConfig.id} mapping={mapping} markerConfigs={localConfigs} selectedConfig={selectedConfig}
        usePresentationRenderer={usePresentationRenderer} layoutConfig={layoutConfig}>
        <fieldset disabled={readOnly} className="marker-rule-detail min-w-0">
          <MarkerDetailEditor config={selectedConfig} idx={selectedIndex} updateMarker={updateMarker}
            tracks={tracks} layoutConfig={layoutConfig}
            onLayoutChange={onLayoutChange} onOpenFullLayoutEditor={onOpenFullLayoutEditor} />
          {selectedConfig.matchMode !== "virtual" && Boolean(selectedConfig.start || selectedConfig.regex) && (
            <section className="mt-3 space-y-2 border-t border-border pt-3">
              <h3 className="text-sm font-semibold">{t("markerStudio.wordOutput")}</h3>
              <MarkerWordSettings config={selectedConfig} idx={selectedIndex} updateMarker={updateMarker} target={mapping[selectedConfig.id]} />
            </section>
          )}
        </fieldset>
      </MarkerTestPanel>
    </div>
  );
  return body;
}
