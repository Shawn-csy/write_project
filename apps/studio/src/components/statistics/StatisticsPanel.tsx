import React from 'react';
import type { AstNode } from '@/lib/statistics/ScriptAnalyzer';
import { Settings } from "lucide-react";
import { useStatisticsPanelState } from '@/hooks/useStatisticsPanelState';
import { ReportGeneratorDialog } from './ReportGeneratorDialog';
import { StatisticsSettingsDialog } from './StatisticsSettingsDialog';
import { StatsDialogueView } from './StatsDialogueView';
import { StatsCharactersView } from './StatsCharactersView';
import { StatsCuesView } from './StatsCuesView';
import { useI18n } from "@/contexts/I18nContext";
import type { StatsLineItem } from '@/hooks/useStatisticsPanelState';

interface StatisticsPanelProps {
  rawScript?: string | null;
  scriptAst?: AstNode | null;
  onLocateText?: (text: string, line?: number | null) => void;
  scriptId?: string;
}

const VIEW_MODES = ["dialogue", "characters", "cues"] as const;

export function StatisticsPanel({ rawScript, scriptAst, onLocateText, scriptId }: StatisticsPanelProps) {
  const { t } = useI18n();
  const s = useStatisticsPanelState({ rawScript, scriptAst, scriptId, t });

  if (!s.statsAvailable) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <span className="loading loading-dots loading-lg" />
        <span className="text-[10px] font-mono uppercase tracking-widest opacity-60">{t("statisticsPanel.calculating")}</span>
      </div>
    );
  }

  const handleLocate = (payload: string | StatsLineItem) => {
    if (!onLocateText || !payload) return;
    if (typeof payload === "string") { onLocateText(payload); return; }
    const text = payload.text || payload.raw || "";
    if (!text) return;
    onLocateText(text, payload.line ?? null);
  };

  const totalChars = ((s.counts.dialogueChars || 0) + (s.counts.actionChars || 0)).toLocaleString();

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── KPI GRID ── */}
      <div className="sp-kpi-grid shrink-0">
        <div className="sp-kpi">
          <div className="sp-kpi-title">{t("statisticsPanel.estimatedDuration")}</div>
          <div className="sp-kpi-value sp-kpi-primary">{s.formattedDuration}</div>
        </div>
        <div className="sp-kpi">
          <div className="sp-kpi-title">{t("statisticsPanel.totalChars")}</div>
          <div className="sp-kpi-value">{totalChars}</div>
        </div>
      </div>

      {/* ── SECONDARY TILES ── */}
      <div className="sp-tiles shrink-0">
        <div className="sp-tile">
          <div className="sp-tile-label">{t("statisticsPanel.dialogueLines")}</div>
          <div className="sp-tile-value">{s.counts.dialogueLines ?? 0}</div>
        </div>
        <div className="sp-tile">
          <div className="sp-tile-label">{t("statisticsPanel.cuesCount")}</div>
          <div className="sp-tile-value">{s.counts.cues ?? 0}</div>
        </div>
        <div className="sp-tile">
          <div className="sp-tile-label">{t("statisticsPanel.pauseSeconds")}</div>
          <div className="sp-tile-value">
            {s.pauseSeconds > 0 ? `${s.pauseSeconds}${t("statisticsPanel.secondsSuffix")}` : "—"}
          </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-border bg-muted/30 shrink-0">
        <div className="flex flex-1 bg-background border border-border rounded-sm p-0.5 gap-0.5">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => s.setViewMode(mode)}
              className={[
                "flex-1 py-1 text-[10px] font-semibold tracking-wide uppercase rounded-[2px] transition-all",
                s.viewMode === mode
                  ? "bg-muted text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-muted/50",
              ].join(" ")}
            >
              {t(`statisticsPanel.view${mode.charAt(0).toUpperCase()}${mode.slice(1)}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => s.setShowSettingsDialog(true)}
          className="w-7 h-7 flex items-center justify-center border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          title={t("statisticsPanel.calculating")}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {s.viewMode === "dialogue" && (
          <StatsDialogueView
            dialogueLines={s.dialogueLines}
            getCleanText={s.getCleanText}
            onLocate={handleLocate}
          />
        )}
        {s.viewMode === "characters" && (
          <StatsCharactersView
            characterStats={s.characterStats}
            characterColorByName={s.characterColorByName}
            dialogueByCharacterNormalized={s.dialogueByCharacterNormalized}
            expandedCharacters={s.expandedCharacters}
            toggleCharacterExpand={s.toggleCharacterExpand}
            dialogueLinesCount={s.counts.dialogueLines || 0}
            onLocate={handleLocate}
          />
        )}
        {s.viewMode === "cues" && (
          <StatsCuesView
            markerEntries={s.markerEntries}
            collapsedMarkerIds={s.collapsedMarkerIds}
            toggleMarkerSection={s.toggleMarkerSection}
            onLocate={handleLocate}
            onGenerateReport={() => s.setShowReportDialog(true)}
          />
        )}
      </div>

      {/* ── STATUS LINE ── */}
      <div className="flex items-center gap-2 px-3.5 border-t border-border/60 h-5 shrink-0 bg-muted/20">
        <span className="sp-status-dot" />
        <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground/50">
          {t("statisticsPanel.calculating").replace("...", "")} — live
        </span>
      </div>

      <ReportGeneratorDialog
        open={s.showReportDialog}
        onOpenChange={s.setShowReportDialog}
        markerEntries={s.markerEntries}
      />
      <StatisticsSettingsDialog
        open={s.showSettingsDialog}
        onOpenChange={s.setShowSettingsDialog}
        config={s.statsConfig}
        onSave={s.setStatsConfig}
        scriptAst={scriptAst}
        rawScript={rawScript ?? undefined}
        markerConfigs={s.markerConfigs}
      />
    </div>
  );
}
