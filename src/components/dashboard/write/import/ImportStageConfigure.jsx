import React from "react";
import { ScrollArea } from "../../../ui/scroll-area";
import { Badge } from "../../../ui/badge";
import { ScriptRenderer } from "../../../renderer/ScriptRenderer";
import { ImportToolbar } from "./ImportToolbar";
import { ImportRuleEditor } from "./ImportRuleEditor";

export function ImportStageConfigure({
    activeRules,
    setActiveRules,
    cloudConfigs,
    selectedConfigId,
    onConfigChange,
    onSaveConfig,
    renderAst
}) {
    // Helper to update a single rule
    const handleUpdateRule = (index, field, value) => {
        const newRules = [...activeRules];
        newRules[index] = { ...newRules[index], [field]: value };
        setActiveRules(newRules);
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Toolbar */}
            <ImportToolbar 
                activeRules={activeRules}
                cloudConfigs={cloudConfigs}
                selectedConfigId={selectedConfigId}
                onConfigChange={onConfigChange}
                onSaveConfig={onSaveConfig}
            />

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                {/* Left: Active Rules (Editable) */}
                <div className="col-span-4 flex flex-col min-h-0 border rounded bg-background">
                    <div className="p-3 border-b bg-muted/10 font-medium text-sm">
                        包含規則 (點擊編輯)
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2 grid gap-2">
                            {activeRules.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8 text-sm">無任何規則</div>
                            ) : (
                                activeRules.map((rule, i) => (
                                    <ImportRuleEditor 
                                        key={i}
                                        index={i}
                                        rule={rule}
                                        onUpdate={handleUpdateRule}
                                    />
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Right: Visual Preview */}
                <div className="col-span-8 flex flex-col min-h-0 border rounded bg-background">
                    <div className="p-3 border-b bg-muted/10 font-medium text-sm flex justify-between items-center">
                        <span>即時預覽 (渲染結果)</span>
                        <div className="flex gap-2">
                            <Badge variant="secondary" className="text-[10px]">Visual</Badge>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative bg-white dark:bg-zinc-950">
                        <ScrollArea className="h-full">
                            <div className="p-8 min-h-full">
                                    {renderAst ? (
                                    <ScriptRenderer 
                                        ast={renderAst} 
                                        markerConfigs={activeRules}
                                        fontSize={14}
                                    />
                                    ) : (
                                    <div className="text-center text-muted-foreground mt-20">無法預覽</div>
                                    )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </div>
        </div>
    );
}
