
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useScriptStats } from '@/hooks/useScriptStats';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Added Button
import { FileText, Settings, ChevronRight, ChevronDown } from "lucide-react"; // Icon for Report
import { useSettings } from "@/contexts/SettingsContext";

import { parseInline } from '@/lib/parsers/inlineParser';
import { ReportGeneratorDialog } from './ReportGeneratorDialog';
import { StatisticsSettingsDialog } from './StatisticsSettingsDialog';
import { useI18n } from "@/contexts/I18nContext";

const CHARACTER_COLOR_SEQUENCE = [
  'var(--marker-color-russet)',
  'var(--marker-color-slate-blue)',
  'var(--marker-color-pastel-rose)',
  'var(--marker-color-steel)',
  'var(--marker-color-sage)',
  'var(--marker-color-olive)',
  'var(--marker-color-verdigris)',
  'var(--marker-color-cadet)',
  'var(--marker-color-periwinkle)',
  'var(--marker-color-orchid)',
  'var(--marker-color-warm-gray)',
  'var(--marker-color-charcoal)',
];

export function StatisticsPanel({ rawScript, scriptAst, onLocateText, scriptId }) {
  const { markerConfigs, statsConfig, setStatsConfig } = useSettings();
  const { t } = useI18n();
  const stats = useScriptStats({ 
      scriptId, 
      rawScript, 
      scriptAst, 
      markerConfigs, 
      options: { 
          wordCountMode: "pure",
          statsConfig // Pass config to hook
      } 
  });
  const statsAvailable = Boolean(stats);
  const [collapsedMarkerIds, setCollapsedMarkerIds] = useState(new Set());
  const [viewMode, setViewMode] = useState("dialogue"); // 'dialogue' | 'characters' | 'cues'
  const [expandedCharacters, setExpandedCharacters] = useState(new Set());
  const [showReportDialog, setShowReportDialog] = useState(false); // Dialog State
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Extract and map stats to component structure
  const {
    durationMinutes = 0,
    counts = { dialogueLines: 0, dialogueChars: 0, cues: 0 },
    sentences = {}, // Used for dialogueLines
    customLayers = {}, // Used for markers
    rangeStats = {}, // Merge with markers or treat separately?
    pauseSeconds = 0,
    pauseItems = [],
    characterStats = [], 
    dialogueRatio = 0,
    actionRatio = 0
  } = stats || {};
  const dialogueByCharacter = (sentences && typeof sentences.dialogue === "object" && !Array.isArray(sentences.dialogue))
      ? sentences.dialogue
      : {};
  
  // Backward compatibility mappings
  const rawDialogue = sentences.dialogue || [];
  const rawAction = sentences.action || [];
  
  // If no dialogue detected (pure marker mode), use action lines as the 'Content' list
  const dialogueLines = (Array.isArray(rawDialogue) && rawDialogue.length > 0) 
      ? rawDialogue 
      : (Array.isArray(rawAction) ? rawAction : []);
  
  // Merge customLayers and rangeStats into markers list for display?
  // Current UI uses 'markers' which was { [id]: { id, count, items } }
  // customLayers is { [id]: { id, count, items, label } }
  const markers = customLayers;

  // Format Duration
  const formattedDuration = useMemo(() => {
    const dialogueChars = Number(counts?.dialogueChars || 0);
    const actionChars = Number(counts?.actionChars || 0);
    const customSeconds = Number(stats?.customDurationSeconds || 0);
    const divisor = Number(statsConfig?.wordCountDivisor || 200);

    // Prefer deterministic local calculation when we have counts.
    if (dialogueChars > 0 || actionChars > 0 || customSeconds > 0) {
      const readingMinutes = (dialogueChars + actionChars) / (Number.isFinite(divisor) && divisor > 0 ? divisor : 200);
      const totalMinutes = readingMinutes + (customSeconds / 60);
      const mins = Math.floor(totalMinutes);
      const secs = Math.round((totalMinutes - mins) * 60);
      return t("statisticsPanel.timeMinutesSeconds")
        .replace("{mins}", String(mins))
        .replace("{secs}", String(secs));
    }

    let safeMinutes = Number(durationMinutes);
    if (!Number.isFinite(safeMinutes) || safeMinutes === 0) {
      const preferAll = actionChars > 0 ? Number(stats?.estimates?.all) : Number(stats?.estimates?.pure);
      if (Number.isFinite(preferAll)) {
        safeMinutes = preferAll;
      } else {
        const fallback = Number(stats?.estimates?.pure);
        safeMinutes = Number.isFinite(fallback) ? fallback : 0;
      }
    }
    if (!Number.isFinite(safeMinutes)) return "--";
    const mins = Math.floor(safeMinutes);
    const secs = Math.round((safeMinutes - mins) * 60);
    return t("statisticsPanel.timeMinutesSeconds")
      .replace("{mins}", String(mins))
      .replace("{secs}", String(secs));
  }, [counts?.dialogueChars, counts?.actionChars, stats?.customDurationSeconds, statsConfig?.wordCountDivisor, durationMinutes, stats?.estimates?.pure, stats?.estimates?.all, t]);

  const markerEntries = useMemo(() => {
    // Transform customLayers (Object: { ID: [items...] }) to Array of structs
    // needed for UI: { id, label, count, items }
    const rawEntries = Object.entries(customLayers || {});
    const formatedEntries = rawEntries.map(([layerId, items]) => {
         // Lookup label from configs
         const config = markerConfigs.find(c => c.id === layerId);
         const label = config ? (config.label || config.name || layerId) : layerId;

         return {
             id: layerId,
             label: label, 
             count: Array.isArray(items) ? items.length : 0,
             items: Array.isArray(items) ? items : []
         };
    });
    
    return formatedEntries.sort((a, b) => b.count - a.count);
  }, [customLayers]);

  const characterColorByName = useMemo(() => {
    const map = new Map();
    (characterStats || []).forEach((char) => {
      const key = String(char?.name || "").trim().toLowerCase();
      if (!key || map.has(key)) return;
      map.set(key, CHARACTER_COLOR_SEQUENCE[map.size % CHARACTER_COLOR_SEQUENCE.length]);
    });
    return map;
  }, [characterStats]);
  const dialogueByCharacterNormalized = useMemo(() => {
    const map = new Map();
    Object.entries(dialogueByCharacter || {}).forEach(([name, lines]) => {
      const key = String(name || "").trim().toLowerCase();
      if (!key) return;
      map.set(key, Array.isArray(lines) ? lines : []);
    });
    return map;
  }, [dialogueByCharacter]);

  useEffect(() => {
    setCollapsedMarkerIds(new Set(markerEntries.map((entry) => entry.id)));
  }, [markerEntries]);

  const showPauses = pauseSeconds > 0;

  const handleLocate = (payload) => {
    if (!onLocateText || !payload) return;
    if (typeof payload === "string") {
      onLocateText(payload);
      return;
    }
    const text = payload.text || payload.raw || "";
    if (!text) return;
    onLocateText(text, payload.line || null);
  };

  const toggleMarkerSection = (id) => {
    setCollapsedMarkerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const toggleCharacterExpand = (name) => {
    const key = String(name || "").trim().toLowerCase();
    if (!key) return;
    setExpandedCharacters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getCleanText = (text) => {
      if (!text) return "";
      if (typeof text !== 'string') return text; // Should assume string, but safety first
      
      // Use parseInline to tokenize, then join only 'text' type nodes
      try {
          // Pass markerConfigs to ensure we identify custom markers
          const nodes = parseInline(text, markerConfigs);
          return nodes
            .filter(n => n.type === 'text')
            .map(n => n.content)
            .join("");
      } catch (e) {
          return text;
      }
  };

  if (!statsAvailable) {
    return (
      <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
        <span className="loading loading-dots loading-lg"></span>
        <span className="mt-2 text-xs">{t("statisticsPanel.calculating")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-1 font-mono">
      {/* Overview Cards - Compact Grid */}
        <div className="grid grid-cols-2 gap-2">
            <Card className="shadow-none border bg-muted/20">
                <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("statisticsPanel.estimatedDuration")}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <div className="text-2xl font-bold font-sans">{formattedDuration}</div>
                </CardContent>
            </Card>
             <Card className="shadow-none border bg-muted/20">
                <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("statisticsPanel.totalChars")}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <div className="text-2xl font-bold font-sans">
                        {(counts.dialogueChars + (counts.actionChars || 0)).toLocaleString()}
                    </div>
                </CardContent>
            </Card>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
             <div className="bg-muted/10 rounded-md p-2 text-center border">
                <div className="text-[10px] text-muted-foreground uppercase">{t("statisticsPanel.dialogueLines")}</div>
                <div className="text-lg font-semibold">{counts.dialogueLines}</div>
             </div>
             <div className="bg-muted/10 rounded-md p-2 text-center border">
                <div className="text-[10px] text-muted-foreground uppercase">{t("statisticsPanel.cuesCount")}</div>
                <div className="text-lg font-semibold">{counts.cues}</div>
             </div>
             {showPauses && (
                <div className="bg-muted/10 rounded-md p-2 text-center border">
                    <div className="text-[10px] text-muted-foreground uppercase">{t("statisticsPanel.pauseSeconds")}</div>
                    <div className="text-lg font-semibold">{`${pauseSeconds}${t("statisticsPanel.secondsSuffix")}`}</div>
                </div>
             )}
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-2 mb-2">
            <div className="flex p-1 bg-muted/20 rounded-lg flex-1">
                 <button 
                     onClick={() => setViewMode('dialogue')}
                     className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'dialogue' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
                 >
                     {t("statisticsPanel.viewDialogue")}
                 </button>
                 <button 
                     onClick={() => setViewMode('characters')}
                     className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'characters' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
                 >
                     {t("statisticsPanel.viewCharacters")}
                 </button>
                 <button 
                     onClick={() => setViewMode('cues')}
                     className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'cues' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
                 >
                     {t("statisticsPanel.viewCues")}
                 </button>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => setShowSettingsDialog(true)}>
                <Settings className="w-4 h-4" />
            </Button>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 min-h-0 relative">
             {/* Dialogue Mode */}
             {viewMode === 'dialogue' && (
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
                                    const rawText = typeof line === "string" ? line : line.text;
                                    const cleanText = getCleanText(rawText);
                                    if (!cleanText.trim()) return null; // Skip empty lines after cleaning

                                    return (
                                        <li key={i}>
                                            <button
                                                type="button"
                                                onClick={() => handleLocate(line)}
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
             )}

             {/* Character Mode */}
             {viewMode === 'characters' && (
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
                                {characterStats.map((char, i) => (
                                    <div key={i} className="p-3 hover:bg-muted/30 transition-colors">
                                        {(() => {
                                            const toFinite = (v, fallback = 0) => {
                                                const n = Number(v);
                                                return Number.isFinite(n) ? n : fallback;
                                            };
                                            const lineCount = toFinite(char?.lineCount ?? char?.count, 0);
                                            const wordCount = toFinite(char?.wordCount, 0);
                                            const speakingScenesCount = toFinite(char?.speakingScenesCount, 0);
                                            const charKey = String(char?.name || "").trim().toLowerCase();
                                            const charColor = characterColorByName.get(charKey);
                                            const lines = dialogueByCharacterNormalized.get(charKey) || [];
                                            const isExpanded = expandedCharacters.has(charKey);
                                            return (
                                              <>
                                        <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleCharacterExpand(char.name)}
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
                                                <div 
                                                    className="h-full bg-primary/70" 
                                                    style={{ width: `${Math.min(100, counts.dialogueLines > 0 ? (lineCount / counts.dialogueLines) * 100 : 0)}%` }}
                                                />
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
                                                  onClick={() => handleLocate({ text: line })}
                                                  className="block w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded px-2 py-1"
                                                >
                                                  {line}
                                                </button>
                                              ))
                                            )}
                                          </div>
                                        )}
                                              </>
                                            );
                                        })()}
                                    </div>
                                ))}
                                </div>
                            )}
                         </ScrollArea>
                     </CardContent>
                 </Card>
             )}

             {/* Cues Mode */}
             {viewMode === 'cues' && (
                 <Card className="h-full border-0 shadow-none flex flex-col absolute inset-0">
                    <CardHeader className="px-0 py-2 shrink-0 flex flex-row items-center justify-between">
                        <CardDescription>{t("statisticsPanel.cuesDescription")}</CardDescription>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            onClick={() => setShowReportDialog(true)}
                        >
                            <FileText className="w-3 h-3" />
                            {t("statisticsPanel.generateReport")}
                        </Button>
                    </CardHeader>
                    <CardContent className="px-0 flex-1 min-h-0 overflow-hidden relative">
                         <ScrollArea className="h-full w-full rounded-md border p-4">
                             {markerEntries.length === 0 ? (
                                 <div className="text-center text-muted-foreground py-8">
                                     {t("statisticsPanel.noCueData")}
                                 </div>
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
                                                 onClick={() => handleLocate(item)}
                                                 className="w-full text-left text-sm border-l-2 border-primary/20 pl-2 whitespace-pre-wrap hover:text-foreground hover:border-primary transition-colors py-1"
                                               >
                                                 <span className="mr-2 text-[10px] text-muted-foreground opacity-50 select-none">
                                                    {item.type === 'block-range' ? t("statisticsPanel.itemTypeRange") : (item.type === 'block' ? t("statisticsPanel.itemTypeBlock") : t("statisticsPanel.itemTypeInline"))}
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
             )}
        </div>
      
      {showPauses && (
        <div className="mt-2 text-[10px] text-muted-foreground text-center">
            {t("statisticsPanel.pauseSummary")
              .replace("{count}", String(pauseItems.length))
              .replace("{seconds}", String(pauseSeconds))}
        </div>
      )}
      
      <ReportGeneratorDialog 
        open={showReportDialog} 
        onOpenChange={setShowReportDialog}
        markerEntries={markerEntries}
      />

      <StatisticsSettingsDialog 
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        config={statsConfig}
        onSave={setStatsConfig}
        scriptAst={scriptAst}
        rawScript={rawScript}
        markerConfigs={markerConfigs}
      />
    </div>
  );
}
