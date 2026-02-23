
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ArrowRight } from "lucide-react";

import { calculateScriptStats } from '@/lib/statistics';
import { buildAST } from '@/lib/importPipeline/directASTBuilder';
import { useI18n } from "@/contexts/I18nContext";


export function StatisticsSettingsDialog({ open, onOpenChange, config, onSave, scriptAst, rawScript, markerConfigs }) {
    const { t } = useI18n();
    const defaultConfig = {
        wordCountDivisor: 200,
        excludeNestedDuration: false,
        excludePunctuation: false,
        customKeywords: [
            { factor: 1, keywords: "s, sec, 秒" },
            { factor: 60, keywords: "m, min, 分, 分鐘" }
        ]
    };

    const [localConfig, setLocalConfig] = useState(config || defaultConfig);

    useEffect(() => {
        if (open) {
            // Apply defaults if config is missing OR if customKeywords is empty/undefined
            // This ensures users always start with the base rules even if they cleared them before (unless we add valid "empty" state support later)
            // But for now, to solve "reset to zero" issue, we insist on defaults if empty.
            let initialConfig = config || defaultConfig;
            
            if (!initialConfig.customKeywords || initialConfig.customKeywords.length === 0) {
                initialConfig = {
                    ...initialConfig,
                    customKeywords: defaultConfig.customKeywords
                };
            }
            setLocalConfig(initialConfig);
        }
    }, [open, config]);

    // Calculate Preview
    const previewStats = useMemo(() => {
        if (!localConfig) return null;
        try {
            let stats;
            const options = { 
                wordCountMode: "pure", 
                statsConfig: localConfig 
            };

            if (scriptAst) {
                stats = calculateScriptStats(scriptAst, markerConfigs, options);
            } else if (rawScript) {
                const ast = buildAST(rawScript || "", markerConfigs || []);
                stats = calculateScriptStats(ast, markerConfigs || [], options);
            }
            
            if (stats) {
                const dialogueChars = stats.counts?.dialogueChars || 0;
                // Legacy parser or AST might separate action. AST separates, Legacy combines into dialogue (usually).
                const actionChars = stats.counts?.actionChars || 0; 
                const divisor = localConfig.wordCountDivisor || 200;
                
                // Reading Time (minutes) - Combine Dialogue + Action based on user request "exclude marker content, remaining script content"
                const totalChars = dialogueChars + actionChars;
                const readingMin = totalChars / divisor;
                
                // Marker Time (minutes)
                const markerSec = stats.customDurationSeconds || 0;
                const markerMin = markerSec / 60;
                
                const totalMin = readingMin + markerMin;

                const formatTime = (totalMinutes) => {
                    const m = Math.floor(totalMinutes);
                    const s = Math.round((totalMinutes - m) * 60);
                    return t("statisticsSettings.timeMinutesSeconds")
                      .replace("{mins}", String(m))
                      .replace("{secs}", String(s));
                };

                return {
                    reading: formatTime(readingMin),
                    // action: formatTime(actionMin), // Combined into reading
                    marker: formatTime(markerMin),
                    total: formatTime(totalMin)
                };
            }
        } catch (e) {
            console.error("Preview calc error", e);
        }
        return null;
    }, [localConfig, scriptAst, rawScript, markerConfigs, t]);

    // Safety check during render
    if (!localConfig) return null;

    const handleSave = () => {
        onSave(localConfig);
        onOpenChange(false);
    };

    const updateKeyword = (index, field, value) => {
        const newKeywords = [...(localConfig.customKeywords || [])];
        newKeywords[index] = { ...newKeywords[index], [field]: value };
        setLocalConfig({ ...localConfig, customKeywords: newKeywords });
    };

    const addKeyword = () => {
        setLocalConfig({
            ...localConfig,
            customKeywords: [...(localConfig.customKeywords || []), { factor: 1, keywords: "" }]
        });
    };

    const removeKeyword = (index) => {
        const newKeywords = [...(localConfig.customKeywords || [])];
        newKeywords.splice(index, 1);
        setLocalConfig({ ...localConfig, customKeywords: newKeywords });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("statisticsSettings.title")}</DialogTitle>
                    <DialogDescription>{t("statisticsSettings.description")}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* General Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Checkbox 
                                id="nested-exclusion"
                                checked={localConfig.excludeNestedDuration}
                                onCheckedChange={(c) => setLocalConfig({...localConfig, excludeNestedDuration: c})}
                            />
                            <Label htmlFor="nested-exclusion">{t("statisticsSettings.excludeNestedDuration")}</Label>
                        </div>
                        <p className="text-xs text-muted-foreground -mt-3 pl-6">
                            {t("statisticsSettings.excludeNestedDurationTip")}
                        </p>
                        <div className="flex items-center gap-2 pt-2">
                            <Checkbox 
                                id="exclude-punctuation"
                                checked={localConfig.excludePunctuation}
                                onCheckedChange={(c) => setLocalConfig({...localConfig, excludePunctuation: c})}
                            />
                            <Label htmlFor="exclude-punctuation">{t("statisticsSettings.excludePunctuation")}</Label>
                        </div>
                        <p className="text-xs text-muted-foreground -mt-3 pl-6">
                            {t("statisticsSettings.excludePunctuationTip")}
                        </p>
                    </div>

                    <div className="space-y-2">
                         <Label htmlFor="word-divisor">{t("statisticsSettings.wordCountDivisor")}</Label>
                         <div className="flex items-center gap-2">
                            <Input 
                                id="word-divisor"
                                type="number"
                                value={localConfig.wordCountDivisor || ""}
                                onChange={(e) => setLocalConfig({...localConfig, wordCountDivisor: parseInt(e.target.value) || 0})}
                                className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">{t("statisticsSettings.charsPerMinute")}</span>
                         </div>
                         <p className="text-xs text-muted-foreground">
                            {t("statisticsSettings.wordCountDivisorTip")}
                         </p>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-3">{t("statisticsSettings.durationKeywordTitle")}</h4>
                        <div className="text-xs text-muted-foreground mb-4">
                            {t("statisticsSettings.durationKeywordTip")}
                        </div>
                        
                        <div className="border rounded-md divide-y">
                            {/* Header - Hidden on mobile, visible on sm */}
                            <div className="hidden sm:flex bg-muted/50 text-xs font-medium text-muted-foreground p-2">
                                <div className="w-20 px-2">{t("statisticsSettings.factorSeconds")}</div>
                                <div className="flex-1 px-2">{t("statisticsSettings.keywordsCommaSeparated")}</div>
                                <div className="w-10"></div>
                            </div>

                            {(localConfig.customKeywords || []).map((k, i) => (
                                <div key={i} className="p-2 flex flex-col sm:flex-row gap-2 items-start sm:items-center group hover:bg-muted/10">
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <label className="sm:hidden text-xs text-muted-foreground w-12">{t("statisticsSettings.factorLabel")}</label>
                                        <Input 
                                            type="number" 
                                            value={k.factor || ""} 
                                            onChange={(e) => updateKeyword(i, 'factor', parseFloat(e.target.value))}
                                            className="h-8 w-20 flex-shrink-0"
                                            placeholder={t("statisticsSettings.secondsPlaceholder")}
                                        />
                                        {/* Mobile delete button shown here or at bottom? Let's put at right end for desktop, maybe inline for mobile */}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive sm:hidden ml-auto" onClick={() => removeKeyword(i)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    
                                    <div className="flex-1 w-full flex items-center gap-2">
                                        <label className="sm:hidden text-xs text-muted-foreground w-12 shrink-0">{t("statisticsSettings.keywordsLabel")}</label>
                                        <Input 
                                            value={k.keywords || ""} 
                                            onChange={(e) => updateKeyword(i, 'keywords', e.target.value)}
                                            placeholder={t("statisticsSettings.keywordsPlaceholder")}
                                            className="h-8 w-full"
                                        />
                                    </div>

                                    <div className="hidden sm:block w-10 text-center">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-50 group-hover:opacity-100" onClick={() => removeKeyword(i)}>
                                             <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={addKeyword}>
                            <Plus className="w-4 h-4 mr-2" />
                            {t("statisticsSettings.addRule")}
                        </Button>
                    </div>

                    <div className="bg-muted/30 p-4 rounded-lg border space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-dashed">
                            <span className="text-sm font-medium">{t("statisticsSettings.previewEstimatedDuration")}</span>
                            <span className="text-lg font-bold font-mono text-primary">
                                {previewStats?.total || "--"}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                                <span>{t("statisticsSettings.previewReading").replace("{divisor}", String(localConfig.wordCountDivisor || 200))}</span>
                                <span className="font-mono text-foreground">{previewStats?.reading || "--"}</span>
                            </div>
                            <div className="flex justify-between col-span-2 border-t pt-2 mt-1">
                                <span>{t("statisticsSettings.previewMarkerTotal")}</span>
                                <span className="font-mono text-foreground">{previewStats?.marker || "--"}</span>
                            </div>
                        </div>
                    </div>

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", "Cancel")}</Button>
                    <Button onClick={handleSave}>{t("statisticsSettings.saveSettings")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
