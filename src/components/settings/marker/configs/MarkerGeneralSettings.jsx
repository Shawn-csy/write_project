import React from "react";
import { Input } from "../../../ui/input";

export function MarkerGeneralSettings({ config, idx, updateMarker, setExpandedId }) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-end">
            <div className="col-span-1 space-y-1">
                <label className="text-[10px] uppercase text-muted-foreground font-semibold">標記名稱</label>
                <Input 
                    value={config.label || ''} 
                    onChange={(e) => updateMarker(idx, 'label', e.target.value)}
                    className="h-8 text-xs"
                />
            </div>
            <div className="col-span-1 space-y-1">
                <label className="text-[10px] uppercase text-muted-foreground font-semibold">代碼 (ID)</label>
                <Input 
                    defaultValue={config.id || ''} 
                    onBlur={(e) => {
                         const newId = e.target.value;
                         if (newId && newId !== config.id) {
                            updateMarker(idx, 'id', newId);
                            setExpandedId(newId);
                         }
                    }}
                    className="h-8 text-xs font-mono"
                    placeholder="unique-id"
                />
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
                    <option value="inline">行內 (Inline)</option>
                    <option value="block">區塊 (Block)</option>
                    <option value="dual">雙人對話 (Dual)</option>
                </select>
             </div>
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
        </div>
    );
}
