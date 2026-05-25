import React, { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { useI18n } from "@/contexts/I18nContext";
import type { StatsLineItem } from "@/hooks/useStatisticsPanelState";

interface Props {
  dialogueLines: Array<string | StatsLineItem>;
  getCleanText: (text: string) => string;
  onLocate: (payload: string | StatsLineItem) => void;
}

export function StatsDialogueView({ dialogueLines, getCleanText, onLocate }: Props): React.JSX.Element {
  const { t } = useI18n();

  // Compute clean text once; reuse for both summary stats and list render.
  const cleanLines = useMemo(() =>
    dialogueLines.map((line) => {
      const raw = typeof line === "string" ? line : String(line.text || "");
      return { original: line, clean: getCleanText(raw).trim() };
    }),
    [dialogueLines, getCleanText]
  );

  const effectiveLines = cleanLines.filter((l) => l.clean).length;
  const totalChars = cleanLines.reduce((acc, l) => acc + l.clean.length, 0);
  const avgChars = effectiveLines > 0 ? Math.round(totalChars / effectiveLines) : 0;

  return (
    <Card className="h-full border-0 shadow-none flex flex-col absolute inset-0">
      <CardHeader className="px-0 py-2 shrink-0">
        <CardDescription>{t("statisticsPanel.dialogueDescription")}</CardDescription>
        {effectiveLines > 0 && (
          <div className="flex gap-3 mt-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {t("statisticsPanel.dialogueEffectiveLines").replace("{count}", String(effectiveLines))}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {t("statisticsPanel.dialogueTotalChars").replace("{count}", String(totalChars))}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {t("statisticsPanel.dialogueAvgCharsPerLine").replace("{count}", String(avgChars))}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-0 flex-1 min-h-0 overflow-hidden relative">
        <ScrollArea className="h-full w-full rounded-md border p-4">
          {cleanLines.length === 0 ? (
            <div className="text-muted-foreground text-sm text-center py-4">{t("statisticsPanel.noDialogueData")}</div>
          ) : (
            <ul className="space-y-4 font-serif text-base leading-relaxed">
              {cleanLines.map(({ original, clean }, i) => {
                if (!clean) return null;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => onLocate(original)}
                      className="w-full text-left hover:text-primary transition-colors hover:bg-muted/30 rounded px-1 -mx-1"
                    >
                      {clean}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
