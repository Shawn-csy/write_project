
import React from 'react';
import { Label } from "../../../ui/label";
import { Input } from "../../../ui/input";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../ui/tooltip";
import { useI18n } from "../../../../contexts/I18nContext";

export function MarkerAnalysisSettings({ config, idx, updateMarker }) {
    const { t } = useI18n();
    const handleChange = (field, value) => {
        updateMarker(idx, field, value);
    };

    return (
        <div className="space-y-6">
            {/* Fixed Duration */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Label>{t("markerAnalysis.fixedDuration")}</Label>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-[200px]">{t("markerAnalysis.fixedDurationTip")}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                    <Input 
                        type="number" 
                        value={config.fixedDuration || ""} 
                        onChange={(e) => handleChange("fixedDuration", e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="0"
                        className="w-24 font-mono"
                    />
                    <span className="text-sm text-muted-foreground">{t("markerAnalysis.seconds")}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("markerAnalysis.fixedDurationHelp")}</p>
            </div>

            {/* Word Cost (Placeholder for future) */}
            {/* 
            <div className="space-y-2 opacity-50 pointer-events-none">
                 <Label>字數權重（即將推出）</Label>
                 <Input disabled placeholder="0" />
            </div> 
            */}
        </div>
    );
}
