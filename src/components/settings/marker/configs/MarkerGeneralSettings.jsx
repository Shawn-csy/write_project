import React from "react";
import { Input } from "../../../ui/input";

export function MarkerGeneralSettings({ config, idx, updateMarker, isAdvancedMode = true }) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 items-end">
            <div className="col-span-1 space-y-1">
                <label className="text-[10px] uppercase text-muted-foreground font-semibold">標記名稱 <span className="text-red-500">*</span></label>
                <Input 
                    value={config.label || ''} 
                    onChange={(e) => updateMarker(idx, 'label', e.target.value)}
                    className={`h-8 text-xs ${!config.label ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {!config.label && (
                    <p className="text-[10px] text-red-500 font-medium">必填</p>
                )}
            </div>
             <div className="col-span-1 space-y-1">
                <label className="text-[10px] uppercase text-muted-foreground font-semibold">類型</label>
                <select 
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    value={config.type || (config.isBlock ? 'block' : 'inline')}
                    onChange={(e) => {
                        const nextType = e.target.value;
                        updateMarker(idx, { 
                            type: nextType, 
                            isBlock: nextType === 'block' || nextType === 'dual' 
                        });
                    }}
                >
                    <option value="inline">文字內標示 (Inline)</option>
                    <option value="block">整段套用 (Block)</option>
                    <option value="dual">雙人對話 (Dual)</option>
                </select>
             </div>
             {isAdvancedMode && (
                 <div className="col-span-1 space-y-1">
                    <label className="text-[10px] uppercase text-muted-foreground font-semibold">優先權</label>
                    <Input 
                        type="number"
                        value={config.priority || 0} 
                        onChange={(e) => updateMarker(idx, 'priority', parseInt(e.target.value) || 0)}
                        className="h-8 text-xs text-center font-mono bg-muted/20"
                        title="數字越大越優先 (由拖動排序自動決定)"
                    />
                 </div>
             )}
        </div>
    );
}
