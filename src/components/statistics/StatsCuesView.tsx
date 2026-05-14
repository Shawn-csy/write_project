import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
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
    <Card className="h-full border-0 shadow-none flex flex-col absolute inset-0">
      <CardHeader className="px-0 py-2 shrink-0 flex flex-row items-center justify-between">
        <CardDescription>{t("statisticsPanel.cuesDescription")}</CardDescription>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onGenerateReport}>
          <FileText className="w-3 h-3" />
          {t("statisticsPanel.generateReport")}
        </Button>
      </CardHeader>
      <CardContent className="px-0 flex-1 min-h-0 overflow-hidden relative">
        <ScrollArea className="h-full w-full rounded-md border p-4">
          {markerEntries.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">{t("statisticsPanel.noCueData")}</div>
          ) : (
            <div className="space-y-6">
              {markerEntries.map((entry) => (
                <div key={entry.id}>
                  <button
                    type="button"
                    onClick={() => toggleMarkerSection(entry.id)}
                    className="w-full text-left group"
                    aria-expanded={!collapsedMarkerIds.has(entry.id)}
                  >
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="group-hover:bg-muted">{entry.label}</Badge>
                      <span className="text-[10px] text-muted-foreground font-mono opacity-50">{entry.id}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{t("statisticsPanel.recordsCount").replace("{count}", String(entry.count))}</span>
                    </h3>
                  </button>
                  {!collapsedMarkerIds.has(entry.id) && (
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      {entry.items.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onLocate(item)}
                          className="w-full text-left text-sm border-l-2 border-primary/20 pl-2 whitespace-pre-wrap hover:text-foreground hover:border-primary transition-colors py-1"
                        >
                          <span className="mr-2 text-[10px] text-muted-foreground opacity-50 select-none">
                            {item.type === "block-range" ? t("statisticsPanel.itemTypeRange") : (item.type === "block" ? t("statisticsPanel.itemTypeBlock") : t("statisticsPanel.itemTypeInline"))}
                          </span>
                          {typeof item === "string" ? item : item.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
