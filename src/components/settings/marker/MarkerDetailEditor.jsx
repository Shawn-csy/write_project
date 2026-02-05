import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import { MarkerGeneralSettings } from "./configs/MarkerGeneralSettings";
import { MarkerLogicSettings } from "./configs/MarkerLogicSettings";
import { MarkerStyleSettings } from "./configs/MarkerStyleSettings";
import { MarkerAnalysisSettings } from "./configs/MarkerAnalysisSettings";
import { MarkerPreview } from "./configs/MarkerPreview";
import { AlertCircle } from "lucide-react";

export function MarkerDetailEditor({ config, idx, updateMarker }) {
    if (!config) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border/50 p-8">
                <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">請從左側列表選擇一個標記規則以進行編輯</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b flex items-center justify-between bg-muted/20">
                <span className="text-xs font-mono text-muted-foreground">{config.id}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {config.matchMode === 'range' ? 'Range (區間)' : 
                     config.type === 'block' || config.isBlock ? 'Block (段落)' : 'Inline (行內)'}
                </span>
            </div>
            
            {/* 即時預覽 */}
            <div className="p-3 border-b bg-muted/10">
                <MarkerPreview config={config} />
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="w-full grid grid-cols-3 mb-4">
                        <TabsTrigger value="general">一般 (General)</TabsTrigger>
                        <TabsTrigger value="logic">邏輯 (Logic)</TabsTrigger>
                        <TabsTrigger value="style">樣式 (Style)</TabsTrigger>
                        <TabsTrigger value="analysis">分析 (Stats)</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="general" className="mt-0 space-y-4">
                        <MarkerGeneralSettings 
                            config={config} 
                            idx={idx} 
                            updateMarker={updateMarker} 
                            setExpandedId={() => {}} // No-op since we don't need to collapse
                        />
                    </TabsContent>
                    
                    <TabsContent value="logic" className="mt-0 space-y-4">
                        <MarkerLogicSettings 
                            config={config} 
                            idx={idx} 
                            updateMarker={updateMarker} 
                        />
                    </TabsContent>
                    
                    <TabsContent value="style" className="mt-0 space-y-4">
                         <MarkerStyleSettings 
                             config={config} 
                             idx={idx} 
                             updateMarker={updateMarker} 
                        />
                    </TabsContent>

                    <TabsContent value="analysis" className="mt-0 space-y-4">
                         <MarkerAnalysisSettings 
                             config={config} 
                             idx={idx} 
                             updateMarker={updateMarker} 
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
