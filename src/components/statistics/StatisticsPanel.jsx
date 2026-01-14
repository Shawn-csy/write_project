
import React, { useMemo } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useScriptStats } from '@/hooks/useScriptStats';
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/contexts/SettingsContext";

export function StatisticsPanel({ rawScript, scriptAst, onLocateText }) {
  const { markerConfigs } = useSettings();
  const stats = useScriptStats({ rawScript, scriptAst, markerConfigs, options: { wordCountMode: "pure" } });
  const statsAvailable = Boolean(stats);

  const {
    durationMinutes = 0,
    counts = { dialogueLines: 0, dialogueChars: 0, cues: 0 },
    dialogueLines = [],
    markers = {},
    pauseSeconds = 0,
    pauseItems = [],
  } = stats || {};
  
  // Format Duration
  const formattedDuration = useMemo(() => {
    const mins = Math.floor(durationMinutes);
    const secs = Math.round((durationMinutes - mins) * 60);
    return `${mins} 分 ${secs} 秒`;
  }, [durationMinutes]);

  const markerEntries = useMemo(() => {
    const entries = Object.values(markers || {});
    return entries.sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [markers]);

  const showPauses = pauseSeconds > 0;

  const handleLocate = (payload) => {
    if (!onLocateText || !payload) return;
    if (typeof payload === "string") {
      onLocateText(payload);
      return;
    }
    const text = payload.raw || payload.text || "";
    if (!text) return;
    onLocateText(text, payload.line || null);
  };

  if (!statsAvailable) {
    return (
      <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
        <span className="loading loading-dots loading-lg"></span>
        <span className="mt-2">統計資料計算中...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-1 font-mono">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Card className="shadow-none border-dashed bg-muted/30">
          <CardHeader className="pb-1 p-2">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">預估時長</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-lg font-bold">{formattedDuration}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none border-dashed bg-muted/30">
          <CardHeader className="pb-1 p-2">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">台詞行數</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-lg font-bold">{counts.dialogueLines}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none border-dashed bg-muted/30">
          <CardHeader className="pb-1 p-2">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">台詞字數</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-lg font-bold">{counts.dialogueChars}</div>
          </CardContent>
        </Card>
         <Card className="shadow-none border-dashed bg-muted/30">
          <CardHeader className="pb-1 p-2">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">指令數</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-lg font-bold">{counts.cues}</div>
          </CardContent>
        </Card>
        {showPauses && (
          <Card className="shadow-none border-dashed bg-muted/30">
            <CardHeader className="pb-1 p-2">
              <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">停頓秒數</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="text-lg font-bold">{pauseSeconds}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="dialogue" className="flex-1 flex flex-col min-h-0">
        <TabsList className={`grid w-full ${showPauses ? "grid-cols-3" : "grid-cols-2"}`}>
          <TabsTrigger value="dialogue">台詞</TabsTrigger>
          <TabsTrigger value="cues">指令/標記</TabsTrigger>
          {showPauses && <TabsTrigger value="pauses">停頓</TabsTrigger>}
        </TabsList>
        
        {/* Dialogue Tab */}
        <TabsContent value="dialogue" className="flex-1 min-h-0 mt-2">
           <Card className="h-full border-0 shadow-none flex flex-col">
             <CardHeader className="px-0 py-2 shrink-0">
              <CardDescription>未匹配任何規則的行會被視為台詞</CardDescription>
            </CardHeader>
             <CardContent className="px-0 flex-1 min-h-0 overflow-hidden relative">
              <ScrollArea className="h-full w-full rounded-md border p-4">
                  {dialogueLines.length === 0 ? (
                    <div className="text-muted-foreground text-sm">無台詞資料</div>
                  ) : (
                    <ul className="space-y-2">
                      {dialogueLines.map((line, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => handleLocate(line)}
                            className="w-full text-left text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap hover:text-foreground transition-colors"
                          >
                            {typeof line === "string" ? line : line.text}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
              </ScrollArea>
             </CardContent>
           </Card>
        </TabsContent>

        {/* Cues Tab */}
        <TabsContent value="cues" className="flex-1 min-h-0 mt-2">
             <Card className="h-full border-0 shadow-none flex flex-col">
              <CardHeader className="px-0 py-2 shrink-0">
                 <CardDescription>依主題規則拆出的指令與標記</CardDescription>
              </CardHeader>
              <CardContent className="px-0 flex-1 min-h-0">
                 <ScrollArea className="h-full w-full rounded-md border p-4">
                     {markerEntries.length === 0 ? (
                         <div className="text-center text-muted-foreground py-8">
                             無指令/標記資料
                             <p className="text-xs mt-2">請確認此劇本的主題規則是否包含 /sfx /e /d /p 等指令</p>
                         </div>
                     ) : (
                         <div className="space-y-6">
                             {markerEntries.map((entry) => (
                               <div key={entry.id}>
                                 <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                   <Badge variant="outline">{entry.label}</Badge>
                                   <span className="text-[10px] text-muted-foreground">{entry.id}</span>
                                   <span className="text-xs text-muted-foreground">{entry.count} 筆</span>
                                 </h3>
                                 <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                                   {entry.items.map((item, idx) => (
                                     <button
                                       key={idx}
                                       type="button"
                                       onClick={() => handleLocate(item)}
                                       className="w-full text-left text-sm border-l-2 border-primary/50 pl-2 whitespace-pre-wrap hover:text-foreground transition-colors"
                                     >
                                       {typeof item === "string" ? item : item.text}
                                     </button>
                                   ))}
                                 </div>
                               </div>
                             ))}
                         </div>
                     )}
                 </ScrollArea>
              </CardContent>
             </Card>
        </TabsContent>

        {showPauses && (
          <TabsContent value="pauses" className="flex-1 min-h-0 mt-2">
            <Card className="h-full border-0 shadow-none flex flex-col">
              <CardHeader className="px-0 py-2 shrink-0">
                <CardDescription>停頓指令列表</CardDescription>
              </CardHeader>
              <CardContent className="px-0 flex-1 min-h-0">
                <ScrollArea className="h-full w-full rounded-md border p-4">
                  {pauseItems.length === 0 ? (
                    <div className="text-muted-foreground text-sm">無停頓指令</div>
                  ) : (
                    <div className="space-y-2">
                      {pauseItems.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleLocate(item)}
                          className="w-full flex items-center justify-between text-sm border-b border-border/40 pb-2 last:border-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="text-muted-foreground">{item.raw}</span>
                          <span className="font-semibold">{item.seconds}s</span>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
