
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useScriptStats } from '@/hooks/useScriptStats';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Added Button
import { FileText, Settings } from "lucide-react"; // Icon for Report
import { useSettings } from "@/contexts/SettingsContext";

import { parseInline } from '@/lib/parsers/inlineParser';
import { ReportGeneratorDialog } from './ReportGeneratorDialog';
import { StatisticsSettingsDialog } from './StatisticsSettingsDialog';

export function StatisticsPanel({ rawScript, scriptAst, onLocateText, scriptId }) {
  const { markerConfigs, statsConfig, setStatsConfig } = useSettings();
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
      return `${mins} 分 ${secs} 秒`;
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
    return `${mins} 分 ${secs} 秒`;
  }, [counts?.dialogueChars, counts?.actionChars, stats?.customDurationSeconds, statsConfig?.wordCountDivisor, durationMinutes, stats?.estimates?.pure, stats?.estimates?.all]);

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
        <span className="mt-2 text-xs">統計資料計算中...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-1 font-mono">
      {/* Overview Cards - Compact Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Card className="shadow-none border bg-muted/20">
                <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">預估時長</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <div className="text-2xl font-bold font-sans">{formattedDuration}</div>
                </CardContent>
            </Card>
             <Card className="shadow-none border bg-muted/20">
                <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">總字數</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <div className="text-2xl font-bold font-sans">
                        {(counts.dialogueChars + (counts.actionChars || 0)).toLocaleString()}
                    </div>
                </CardContent>
            </Card>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
             <div className="bg-muted/10 rounded-md p-2 text-center border">
                <div className="text-[10px] text-muted-foreground uppercase">台詞行數</div>
                <div className="text-lg font-semibold">{counts.dialogueLines}</div>
             </div>
             <div className="bg-muted/10 rounded-md p-2 text-center border">
                <div className="text-[10px] text-muted-foreground uppercase">指令數</div>
                <div className="text-lg font-semibold">{counts.cues}</div>
             </div>
             {showPauses && (
                <div className="bg-muted/10 rounded-md p-2 text-center border">
                    <div className="text-[10px] text-muted-foreground uppercase">停頓秒數</div>
                    <div className="text-lg font-semibold">{pauseSeconds}s</div>
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
                     內容檢視
                 </button>
                 <button 
                     onClick={() => setViewMode('characters')}
                     className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'characters' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
                 >
                     角色統計
                 </button>
                 <button 
                     onClick={() => setViewMode('cues')}
                     className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'cues' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
                 >
                     指令分析
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
                        <CardDescription>內容淨稿 (移除指令與標記)</CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 flex-1 min-h-0 overflow-hidden relative">
                         <ScrollArea className="h-full w-full rounded-md border p-4">
                            {dialogueLines.length === 0 ? (
                                <div className="text-muted-foreground text-sm text-center py-4">無台詞資料</div>
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
                         <CardDescription>角色台詞分佈</CardDescription>
                     </CardHeader>
                     <CardContent className="px-0 flex-1 min-h-0 overflow-hidden relative">
                         <ScrollArea className="h-full w-full rounded-md border p-0">
                            {characterStats.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">無角色資料</div>
                            ) : (
                                <div className="divide-y">
                                {characterStats.map((char, i) => (
                                    <div key={i} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-sm">{char.name}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {char.speakingScenesCount} 場戲
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-sm font-semibold">{char.lineCount} 行</div>
                                                <div className="text-[10px] text-muted-foreground">{char.wordCount} 字</div>
                                            </div>
                                            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-primary/70" 
                                                    style={{ width: `${Math.min(100, (char.lineCount / counts.dialogueLines) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
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
                        <CardDescription>指令與標記列表</CardDescription>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            onClick={() => setShowReportDialog(true)}
                        >
                            <FileText className="w-3 h-3" />
                            產生報表
                        </Button>
                    </CardHeader>
                    <CardContent className="px-0 flex-1 min-h-0 overflow-hidden relative">
                         <ScrollArea className="h-full w-full rounded-md border p-4">
                             {markerEntries.length === 0 ? (
                                 <div className="text-center text-muted-foreground py-8">
                                     無指令/標記資料
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
                                             <span className="ml-auto text-xs text-muted-foreground">{entry.count} 筆</span>
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
                                                    {item.type === 'block-range' ? '區間' : (item.type === 'block' ? '區塊' : '行內')}
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
            偵測到 {pauseItems.length} 個停頓點，共 {pauseSeconds} 秒
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
