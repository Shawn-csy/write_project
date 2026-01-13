import React from "react";
import { Settings } from "lucide-react";
import { Input } from "../../../ui/input";

export function MarkerLogicSettings({ config, idx, updateMarker }) {
    const isBlock = config.type === 'block' || config.isBlock; 
    const isInline = !isBlock;

    const updateArrayField = (field, valueStr) => {
        const arr = valueStr.split(',').map(s => s.trim()).filter(Boolean);
        updateMarker(idx, field, arr);
    };

    return (
        <div className="p-3 rounded-md bg-muted/20 space-y-3">
             <div className="flex items-center gap-2 mb-2">
                <Settings className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] font-bold text-muted-foreground">匹配規則 (Matching Logic)</span>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">模式</label>
                    <select 
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                        value={config.matchMode || 'enclosure'}
                        onChange={(e) => updateMarker(idx, 'matchMode', e.target.value)}
                        disabled={isBlock}
                    >
                        <option value="enclosure">包圍 (Start...End)</option>
                        <option value="prefix">前綴 (Prefix)</option>
                        <option value="regex">正規式 (Regex)</option>
                    </select>
                </div>
                {config.matchMode === 'regex' ? (
                    <div className="sm:col-span-2">
                        <label className="text-[10px] text-muted-foreground block mb-1">Regex Pattern</label>
                        <Input 
                            value={config.regex || ''}
                            onChange={(e) => updateMarker(idx, 'regex', e.target.value)}
                            className="h-8 font-mono text-xs"
                            placeholder="Example: ^\\[sfx:(.*?)\\]"
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] text-muted-foreground block mb-1">開始符號 (Start)</label>
                                <Input 
                                    value={config.start || ''} 
                                    onChange={(e) => updateMarker(idx, 'start', e.target.value)}
                                    className="h-8 font-mono text-xs text-center"
                                />
                            </div>
                            {(isBlock || config.matchMode !== 'prefix') && (
                                <div className="flex-1">
                                    <label className="text-[10px] text-muted-foreground block mb-1">結束符號 (End)</label>
                                    <Input 
                                        value={config.end || ''} 
                                        onChange={(e) => updateMarker(idx, 'end', e.target.value)}
                                        className="h-8 font-mono text-xs text-center"
                                    />
                                </div>
                            )}
                        </div>
                        
                        {isBlock && (
                             <div className="col-span-1 sm:col-span-2 mt-2 pt-2 border-t border-dashed border-border/30">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={config.showEndLabel !== false} // Default true
                                        onChange={(e) => updateMarker(idx, 'showEndLabel', e.target.checked)}
                                        className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                    />
                                    <div>
                                        <span className="text-xs font-semibold text-foreground">顯示結尾內容 (Show End Label)</span>
                                        <p className="text-[9px] text-muted-foreground">在區塊底部顯示結束標記的內容 (如 <code>End</code>)。若關閉則只顯示邊框。</p>
                                    </div>
                                </label>
                             </div>
                        )}

                        
                        {isBlock && config.matchMode === 'enclosure' && (
                             <div className="col-span-1 sm:col-span-2 mt-2 pt-2 border-t border-dashed border-border/30">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={!!config.smartToggle} 
                                        onChange={(e) => updateMarker(idx, 'smartToggle', e.target.checked)}
                                        className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                    />
                                    <div>
                                        <span className="text-xs font-semibold text-foreground">允許作為區塊開關 (Smart Toggle)</span>
                                        <p className="text-[9px] text-muted-foreground">當內容同時符合開始與結束規則時 (如 <code>{`{{...}}`}</code>)，將其視為切換開關而非單行內容。</p>
                                    </div>
                                </label>
                             </div>
                        )}
                    </>
                )}
             </div>

            <div className="space-y-2 pt-2 border-t border-dashed border-border/30">
                <label className="text-[10px] text-muted-foreground block">顯示樣板 (Display Template, 選填)</label>
                <Input 
                        value={config.renderer?.template || ''}
                        onChange={(e) => {
                            const renderer = config.renderer || {};
                            updateMarker(idx, 'renderer', { ...renderer, template: e.target.value });
                        }}
                        className="h-8 text-xs font-mono"
                        placeholder="例如: [SFX: {{content}}]"
                />
                <p className="text-[9px] text-muted-foreground">
                    使用 <code className="bg-muted px-1 rounded">{'{{content}}'}</code> 代表被標記的文字內容 (或是區塊的標籤)。
                </p>
            </div>

             {isInline && config.matchMode !== 'regex' && (
                <div className="space-y-2 pt-2 border-t border-dashed border-border/30">
                    <label className="text-[10px] text-muted-foreground block">特定關鍵字 (Keywords, 選填)</label>
                    <Input 
                         value={config.keywords ? config.keywords.join(', ') : ''}
                         onChange={(e) => updateArrayField('keywords', e.target.value)}
                         className="h-8 text-xs font-mono"
                         placeholder="例如: V.O., O.S. (用逗號分隔)"
                    />
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={!!config.dimIfNotKeyword} 
                            onChange={(e) => updateMarker(idx, 'dimIfNotKeyword', e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                        />
                        <span className="text-xs text-muted-foreground">非關鍵字時淡化顯示</span>
                    </label>
                </div>
             )}
             
             {/* Options moved from outer scope if match mode not regex */}
             {config.matchMode !== 'regex' && (
                 <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={!!config.showDelimiters} 
                            onChange={(e) => updateMarker(idx, 'showDelimiters', e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="text-xs text-muted-foreground">顯示括號符號 (Show Delimiters)</span>
                    </label>
                 </div>
             )}
        </div>
    );
}
