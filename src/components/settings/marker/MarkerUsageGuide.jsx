import React, { useState } from "react";
import { Copy, Hash, Grid, List } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";
import { MarkerGuideCard } from "./MarkerGuideCard";
import { PublicMarkerLegend } from "../../reader/PublicMarkerLegend";

export function MarkerUsageGuide({ markerConfigs }) {
  const [view, setView] = useState("visual"); // visual | list

  if (!markerConfigs || markerConfigs.length === 0) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("已複製: " + text);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-4 shrink-0 pb-3 border-b border-border/40">
         <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Hash className="w-4 h-4" />
            </div>
            <div>
                 <h3 className="text-sm font-semibold text-foreground">使用指南</h3>
                 <p className="text-[10px] text-muted-foreground">自動生成的標記說明</p>
            </div>
         </div>

         <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/40">
             <button
                onClick={() => setView("visual")}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    view === "visual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
             >
                 <Grid className="w-3.5 h-3.5" />
                 卡片
             </button>
             <button
                onClick={() => setView("list")}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
             >
                 <List className="w-3.5 h-3.5" />
                 列表
             </button>
         </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
          {view === "visual" ? (
              <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {markerConfigs.map((config) => (
                       <MarkerGuideCard 
                          key={config.id} 
                          config={config} 
                          onCopy={copyToClipboard} 
                       />
                    ))}
                  </div>
              </div>
          ) : (
              <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-2">
                  <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
                    <p className="text-xs text-muted-foreground mb-4">
                        此樣式將顯示於公開閱讀頁面，作為讀者的標記對照表。
                    </p>
                    <PublicMarkerLegend markerConfigs={markerConfigs} />
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}
