
import React from 'react';
import { Label } from "../../../ui/label";
import { Input } from "../../../ui/input";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../ui/tooltip";

export function MarkerAnalysisSettings({ config, idx, updateMarker }) {
    const handleChange = (field, value) => {
        updateMarker(idx, field, value);
    };

    return (
        <div className="space-y-6">
            {/* Fixed Duration */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Label>固定時間 (Fixed Duration)</Label>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-[200px]">當此標記出現時，統計時間將自動加上設定的秒數。</p>
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
                    <span className="text-sm text-muted-foreground">秒 (Seconds)</span>
                </div>
                <p className="text-[10px] text-muted-foreground">適用於「暫停」、「過場」或「特效」等非文字的計時需求。</p>
            </div>

            {/* Word Cost (Placeholder for future) */}
            {/* 
            <div className="space-y-2 opacity-50 pointer-events-none">
                 <Label>字數權重 (Word Cost) [Coming Soon]</Label>
                 <Input disabled placeholder="0" />
            </div> 
            */}
        </div>
    );
}
