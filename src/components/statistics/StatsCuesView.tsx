import React from "react";
import { useI18n } from "@/contexts/I18nContext";
import type { MarkerEntry, StatsLineItem } from "@/hooks/useStatisticsPanelState";

interface Props {
  markerEntries: MarkerEntry[];
  collapsedMarkerIds: Set<string>;
  toggleMarkerSection: (id: string) => void;
  onLocate: (payload: string | StatsLineItem) => void;
  onGenerateReport: () => void;
}

export function StatsCuesView({ markerEntries, collapsedMarkerIds, toggleMarkerSection, onLocate, onGenerateReport }: Props): React.JSX.Element {
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-full absolute inset-0">
      {/* scrollable cue list */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin divide-y divide-border/60">
        {markerEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
              {t("statisticsPanel.noCueData")}
            </span>
          </div>
        ) : (
          markerEntries.map((entry) => {
            const isOpen = !collapsedMarkerIds.has(entry.id);
            return (
              <div key={entry.id}>
                {/* section header */}
                <button
                  type="button"
                  onClick={() => toggleMarkerSection(entry.id)}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-muted/30 transition-colors text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-mono text-[9px] text-muted-foreground/50 w-2.5 shrink-0 transition-transform duration-150"
                    style={{ display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none" }}>
                    ▶
                  </span>
                  <span className="flex-1 text-xs font-medium text-foreground tracking-wide truncate">{entry.label}</span>
                  <span className="sp-cue-badge">{entry.count}</span>
                </button>

                {/* items */}
                {isOpen && entry.items.length > 0 && (
                  <div className="pb-2 pt-0.5 bg-muted/15 border-t border-border/40">
                    {entry.items.map((item, idx) => {
                      const typeLabel = item.type === "block-range"
                        ? t("statisticsPanel.itemTypeRange")
                        : item.type === "block"
                          ? t("statisticsPanel.itemTypeBlock")
                          : t("statisticsPanel.itemTypeInline");
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onLocate(item)}
                          className="sp-script-line text-[11px] flex items-baseline gap-2 pl-7"
                        >
                          <span className="font-mono text-[8px] text-muted-foreground/40 uppercase tracking-wider shrink-0">{typeLabel}</span>
                          <span className="truncate">{typeof item === "string" ? item : item.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* generate report footer */}
      <div className="shrink-0 border-t border-border px-3.5 py-2.5 bg-muted/20">
        <button
          type="button"
          onClick={onGenerateReport}
          className="w-full font-mono text-[10px] font-semibold uppercase tracking-widest text-primary border border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors py-2"
        >
          {t("statisticsPanel.generateReport")}
        </button>
      </div>
    </div>
  );
}
