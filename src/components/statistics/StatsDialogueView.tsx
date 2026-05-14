import React from "react";
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
  return (
    <Card className="h-full border-0 shadow-none flex flex-col absolute inset-0">
      <CardHeader className="px-0 py-2 shrink-0">
        <CardDescription>{t("statisticsPanel.dialogueDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 flex-1 min-h-0 overflow-hidden relative">
        <ScrollArea className="h-full w-full rounded-md border p-4">
          {dialogueLines.length === 0 ? (
            <div className="text-muted-foreground text-sm text-center py-4">{t("statisticsPanel.noDialogueData")}</div>
          ) : (
            <ul className="space-y-4 font-serif text-base leading-relaxed">
              {dialogueLines.map((line, i) => {
                const rawText = typeof line === "string" ? line : String((line as StatsLineItem).text || "");
                const cleanText = getCleanText(rawText);
                if (!cleanText.trim()) return null;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => onLocate(line)}
                      className="w-full text-left hover:text-primary transition-colors hover:bg-muted/30 rounded px-1 -mx-1"
                    >
                      {cleanText}
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
