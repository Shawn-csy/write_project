import React from "react";
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

  if (characterStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full absolute inset-0">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
          {t("statisticsPanel.noCharacterData")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full absolute inset-0 overflow-y-auto scrollbar-thin divide-y divide-border/60">
      {characterStats.map((char, i) => {
        const lineCount = toFinite(char?.lineCount ?? char?.count, 0);
        const wordCount = toFinite(char?.wordCount, 0);
        const speakingScenesCount = toFinite(char?.speakingScenesCount, 0);
        const charKey = String(char?.name || "").trim().toLowerCase();
        const charColor = characterColorByName.get(charKey);
        const lines = dialogueByCharacterNormalized.get(charKey) || [];
        const isExpanded = expandedCharacters.has(charKey);
        const pct = Math.min(100, dialogueLinesCount > 0 ? (lineCount / dialogueLinesCount) * 100 : 0);

        return (
          <div key={i}>
            {/* header row */}
            <button
              type="button"
              onClick={() => toggleCharacterExpand(char.name || "")}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-muted/30 transition-colors text-left"
              aria-expanded={isExpanded}
            >
              {/* expand chevron */}
              <span className="font-mono text-[9px] text-muted-foreground/50 w-2.5 shrink-0 transition-transform duration-150"
                style={{ display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "none" }}>
                ▶
              </span>

              {/* name + scenes */}
              <div className="flex-1 min-w-0">
                <span
                  className="text-xs font-semibold tracking-wide truncate block"
                  style={charColor ? { color: charColor } : undefined}
                >
                  {char.name}
                </span>
                <span className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wide">
                  {t("statisticsPanel.scenesCount").replace("{count}", String(speakingScenesCount))}
                </span>
              </div>

              {/* counts + bar */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="text-right">
                  <div className="font-mono text-xs font-medium text-foreground">{lineCount}</div>
                  <div className="font-mono text-[9px] text-muted-foreground/60">{wordCount.toLocaleString()}</div>
                </div>
                <div className="sp-char-bar-track">
                  <div className="sp-char-bar-fill" style={{ width: `${pct}%`, background: charColor || "hsl(var(--primary))" }} />
                </div>
              </div>
            </button>

            {/* expanded lines */}
            {isExpanded && (
              <div className="px-3.5 pb-2 pt-1 bg-muted/20 border-t border-border/40">
                {lines.length === 0 ? (
                  <span className="font-mono text-[9px] text-muted-foreground/40">—</span>
                ) : (
                  lines.map((line, idx) => (
                    <button
                      key={`${charKey}-${idx}`}
                      type="button"
                      onClick={() => onLocate({ text: line })}
                      className="sp-script-line text-[11px]"
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
  );
}
