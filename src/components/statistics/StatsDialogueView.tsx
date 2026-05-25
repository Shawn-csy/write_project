import React, { useMemo } from "react";
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
    <div className="flex flex-col h-full absolute inset-0">
      {/* micro-stats bar */}
      {effectiveLines > 0 && (
        <div className="sp-micro-bar shrink-0">
          <div className="sp-micro-stat">
            <div className="sp-micro-label">{t("statisticsPanel.dialogueLines")}</div>
            <div className="sp-micro-value">{effectiveLines}</div>
          </div>
          <div className="sp-micro-stat">
            <div className="sp-micro-label">{t("statisticsPanel.totalChars")}</div>
            <div className="sp-micro-value">{totalChars.toLocaleString()}</div>
          </div>
          <div className="sp-micro-stat">
            <div className="sp-micro-label">{t("statisticsPanel.dialogueAvgCharsPerLine").replace("{count}", "").trim() || "Avg/line"}</div>
            <div className="sp-micro-value">{avgChars}</div>
          </div>
        </div>
      )}

      {/* script lines */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 scrollbar-thin">
        {cleanLines.length === 0 ? (
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50 text-center py-8">
            {t("statisticsPanel.noDialogueData")}
          </div>
        ) : (
          <ul>
            {cleanLines.map(({ original, clean }, i) => {
              if (!clean) return null;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onLocate(original)}
                    className="sp-script-line"
                  >
                    {clean}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
