import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import { MarkerGeneralSettings } from "./configs/MarkerGeneralSettings";
import { MarkerLogicSettings } from "./configs/MarkerLogicSettings";
import { MarkerStyleSettings } from "./configs/MarkerStyleSettings";
import { MarkerAnalysisSettings } from "./configs/MarkerAnalysisSettings";
import { MarkerPreview } from "./configs/MarkerPreview";
import { AlertCircle } from "lucide-react";

export function MarkerDetailEditor({ config, idx, updateMarker, isAdvancedMode, setIsAdvancedMode }) {
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
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground/80">{config.label || "未命名標記"}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {config.matchMode === 'range' ? '區間' : 
                         config.type === 'block' || config.isBlock ? '整段套用' : '文字內標示'}
                    </span>
                </div>
                
                {/* Mode Toggle */}
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${!isAdvancedMode ? 'text-primary' : 'text-muted-foreground'}`}>簡易</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={isAdvancedMode}
                            onChange={(e) => setIsAdvancedMode(e.target.checked)}
                        />
                        <div className="w-7 h-4 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isAdvancedMode ? 'text-primary' : 'text-muted-foreground'}`}>進階</span>
                </div>
            </div>
            
            {/* 即時預覽 */}
            <div className="p-3 border-b bg-muted/10">
                <MarkerPreview config={config} />
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                {!isAdvancedMode ? (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">基本設定</h3>
                            <MarkerGeneralSettings 
                                config={config} 
                                idx={idx} 
                                updateMarker={updateMarker}
                                isAdvancedMode={false}
                            />
                        </div>
                        <div className="space-y-2 pt-4 border-t border-border/50">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">匹配邏輯</h3>
                            <MarkerLogicSettings 
                                config={config} 
                                idx={idx} 
                                updateMarker={updateMarker} 
                                isAdvancedMode={false}
                            />
                        </div>
                        <div className="space-y-2 pt-4 border-t border-border/50">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">顯示樣式</h3>
                            <MarkerStyleSettings 
                                config={config} 
                                idx={idx} 
                                updateMarker={updateMarker} 
                            />
                        </div>
                    </div>
                ) : (
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 mb-4 gap-1 h-auto sm:h-9">
                            <TabsTrigger value="general">一般</TabsTrigger>
                            <TabsTrigger value="logic">邏輯</TabsTrigger>
                            <TabsTrigger value="style">樣式</TabsTrigger>
                            <TabsTrigger value="analysis">分析</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="general" className="mt-0 space-y-4">
                            <MarkerGeneralSettings 
                                config={config} 
                                idx={idx} 
                                updateMarker={updateMarker}
                                isAdvancedMode={true}
                            />
                        </TabsContent>
                        
                        <TabsContent value="logic" className="mt-0 space-y-4">
                            <MarkerLogicSettings 
                                config={config} 
                                idx={idx} 
                                updateMarker={updateMarker} 
                                isAdvancedMode={true}
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
                )}
            </div>
        </div>
    );
}
