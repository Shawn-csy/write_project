import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { CharacterStatItem, StatsLineItem } from "@/hooks/useStatisticsPanelState";

interface Props {
  characterStats: CharacterStatItem[];
  characterColorByName: Map<string, string>;
  dialogueByCharacterNormalized: Map<string, string[]>;
  expandedCharacters: Set<string>;
  toggleCharacterExpand: (name: string) => void;
  dialogueLinesCount: number;
  onLocate: (payload: string | StatsLineItem) => void;
}

export function StatsCharactersView({
  characterStats, characterColorByName, dialogueByCharacterNormalized,
  expandedCharacters, toggleCharacterExpand, dialogueLinesCount, onLocate,
}: Props): React.JSX.Element {
  const { t } = useI18n();
  const toFinite = (v: unknown, fallback = 0): number => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };

  return (
    <Card className="h-full border-0 shadow-none flex flex-col absolute inset-0">
      <CardHeader className="px-0 py-2 shrink-0">
        <CardDescription>{t("statisticsPanel.characterDistribution")}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 flex-1 min-h-0 overflow-hidden relative">
        <ScrollArea className="h-full w-full rounded-md border p-0">
          {characterStats.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">{t("statisticsPanel.noCharacterData")}</div>
          ) : (
            <div className="divide-y">
              {characterStats.map((char, i) => {
                const lineCount = toFinite(char?.lineCount ?? char?.count, 0);
                const wordCount = toFinite(char?.wordCount, 0);
                const speakingScenesCount = toFinite(char?.speakingScenesCount, 0);
                const charKey = String(char?.name || "").trim().toLowerCase();
                const charColor = characterColorByName.get(charKey);
                const lines = dialogueByCharacterNormalized.get(charKey) || [];
                const isExpanded = expandedCharacters.has(charKey);
                return (
                  <div key={i} className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => toggleCharacterExpand(char.name || "")}
                          className="inline-flex items-center gap-1 text-left"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                          <span className="font-bold text-sm" style={charColor ? { color: charColor } : undefined}>{char.name}</span>
                        </button>
                        <span className="text-[10px] text-muted-foreground">
                          {t("statisticsPanel.scenesCount").replace("{count}", String(speakingScenesCount))}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-semibold">{t("statisticsPanel.linesCount").replace("{count}", String(lineCount))}</div>
                          <div className="text-[10px] text-muted-foreground">{t("statisticsPanel.charsCount").replace("{count}", String(wordCount))}</div>
                        </div>
                        <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/70" style={{ width: `${Math.min(100, dialogueLinesCount > 0 ? (lineCount / dialogueLinesCount) * 100 : 0)}%` }} />
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-2 ml-5 border-l border-border/60 pl-3 space-y-1">
                        {lines.length === 0 ? (
                          <div className="text-xs text-muted-foreground">-</div>
                        ) : (
                          lines.map((line, idx) => (
                            <button
                              key={`${charKey}-${idx}`}
                              type="button"
                              onClick={() => onLocate({ text: line })}
                              className="block w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded px-2 py-1"
                            >
                              {line}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
