import React from "react";
import { ScrollArea } from "../../../ui/scroll-area";
import { Badge } from "../../../ui/badge";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
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
    renderAst,
    metadata = {},
    setMetadata
}) {
    // Helper to update a single rule is not needed if ImportRuleEditor handles it, 
    // but looking at usage below, we are passing inline onChange.
    
    return (
        <div className="grid grid-cols-12 gap-6 h-full min-h-0">
            {/* Left: Settings & Rules */}
            <div className="col-span-4 flex flex-col gap-4 min-h-0">
                <ImportToolbar
                    activeRules={activeRules}
                    cloudConfigs={cloudConfigs}
                    selectedConfigId={selectedConfigId}
                    onConfigChange={onConfigChange}
                    onSaveConfig={onSaveConfig}
                />

                <div className="flex-1 min-h-0 flex flex-col gap-2 relative bg-background border rounded-md">
                    <div className="p-3 border-b bg-muted/10 font-medium text-sm">
                        設定與規則 ({activeRules.length})
                    </div>
                    
                    <ScrollArea className="flex-1 px-4">
                        <div className="py-4 space-y-6">
                                {/* Metadata Section */}
                            <div className="space-y-3 pb-4 border-b">
                                <h3 className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                                    劇本資訊 (Metadata)
                                    {/* TODO: Add 'New Field' button if needed */}
                                </h3>
                                <div className="grid gap-3">
                                    {/* Core fields - always shown */}
                                    {['Title', 'Author', 'Description', 'Tags', 'Rating', 'Duration', 'Source'].map(key => {
                                        const val = metadata[key] || '';
                                        return (
                                            <div key={key} className="grid grid-cols-3 items-center gap-2">
                                                <Label className="text-xs text-right truncate" title={key}>{key}</Label>
                                                <Input
                                                    className="col-span-2 h-7 text-xs"
                                                    value={val}
                                                    onChange={(e) => setMetadata({...metadata, [key]: e.target.value})}
                                                    placeholder={`輸入 ${key}...`}
                                                />
                                            </div>
                                        );
                                    })}
                                    {/* Render other custom extracted keys */}
                                    {Object.entries(metadata)
                                        .filter(([k]) => !['Title', 'Author', 'Description', 'Tags', 'Rating', 'Duration', 'Source'].includes(k))
                                        .map(([key, value]) => (
                                            <div key={key} className="grid grid-cols-3 items-center gap-2">
                                                <Label className="text-xs text-right truncate" title={key}>{key}</Label>
                                                <Input
                                                    className="col-span-2 h-7 text-xs"
                                                    value={value}
                                                    onChange={(e) => setMetadata({...metadata, [key]: e.target.value})}
                                                />
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            {/* Rules Section */}
                            <div className="space-y-2">
                                {activeRules.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8 text-sm">無任何規則</div>
                                ) : (
                                    activeRules.map((rule, idx) => (
                                        <ImportRuleEditor
                                            key={rule.id || idx}
                                            rule={rule}
                                            onChange={(updated) => {
                                                const newRules = [...activeRules];
                                                newRules[idx] = updated;
                                                setActiveRules(newRules);
                                            }}
                                            onDelete={() => {
                                                const newRules = activeRules.filter((_, i) => i !== idx);
                                                setActiveRules(newRules);
                                            }}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </div>
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
    );
}
