import React from 'react';
import type { AstNode } from '@/lib/statistics/ScriptAnalyzer';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export function StatisticsPanel({ rawScript, scriptAst, onLocateText, scriptId }: StatisticsPanelProps) {
  const { t } = useI18n();
  const s = useStatisticsPanelState({ rawScript, scriptAst, scriptId, t });

  if (!s.statsAvailable) {
    return (
      <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
        <span className="loading loading-dots loading-lg"></span>
        <span className="mt-2 text-xs">{t("statisticsPanel.calculating")}</span>
      </div>
    );
  }

  const handleLocate = (payload: string | StatsLineItem) => {
    if (!onLocateText || !payload) return;
    if (typeof payload === "string") { onLocateText(payload); return; }
    const text = payload.text || payload.raw || "";
    if (!text) return;
    onLocateText(text, payload.line || null);
  };

  const showPauses = s.pauseSeconds > 0;

  return (
    <div className="flex flex-col h-full gap-4 p-1 font-mono">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="shadow-none border bg-muted/20">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("statisticsPanel.estimatedDuration")}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold font-sans">{s.formattedDuration}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none border bg-muted/20">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("statisticsPanel.totalChars")}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold font-sans">
              {((s.counts.dialogueChars || 0) + (s.counts.actionChars || 0)).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/10 rounded-md p-2 text-center border">
          <div className="text-[10px] text-muted-foreground uppercase">{t("statisticsPanel.dialogueLines")}</div>
          <div className="text-lg font-semibold">{s.counts.dialogueLines}</div>
        </div>
        <div className="bg-muted/10 rounded-md p-2 text-center border">
          <div className="text-[10px] text-muted-foreground uppercase">{t("statisticsPanel.cuesCount")}</div>
          <div className="text-lg font-semibold">{s.counts.cues}</div>
        </div>
        {showPauses && (
          <div className="bg-muted/10 rounded-md p-2 text-center border">
            <div className="text-[10px] text-muted-foreground uppercase">{t("statisticsPanel.pauseSeconds")}</div>
            <div className="text-lg font-semibold">{`${s.pauseSeconds}${t("statisticsPanel.secondsSuffix")}`}</div>
          </div>
        )}
      </div>

      {/* View Mode Selector */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex p-1 bg-muted/20 rounded-lg flex-1">
          {(["dialogue", "characters", "cues"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => s.setViewMode(mode)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${s.viewMode === mode ? "bg-background shadow text-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
            >
              {t(`statisticsPanel.view${mode.charAt(0).toUpperCase()}${mode.slice(1)}`)}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => s.setShowSettingsDialog(true)}>
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 relative">
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

      {showPauses && (
        <div className="mt-2 text-[10px] text-muted-foreground text-center">
          {t("statisticsPanel.pauseSummary")
            .replace("{count}", String(s.pauseItems.length))
            .replace("{seconds}", String(s.pauseSeconds))}
        </div>
      )}

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
