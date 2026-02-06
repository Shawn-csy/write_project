import React from "react";
import { Settings } from "lucide-react";
import { Input } from "../../../ui/input";
import { ModeSelector } from "./ModeSelector";

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
                <span className="text-[11px] font-bold text-muted-foreground">匹配規則</span>
             </div>

             {/* 模式選擇器 - 視覺化卡片 */}
             <div className="mb-4">
                <ModeSelector 
                    value={config.matchMode || 'enclosure'} 
                    onChange={(mode) => updateMarker(idx, 'matchMode', mode)}
                />
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Range 模式專用設定 - 成對設定開始/結束 */}
                {config.matchMode === 'range' && (
                    <>
                        <div className="sm:col-span-2 bg-primary/5 rounded-md p-3 border border-primary/20 space-y-3">
                            <p className="text-[10px] text-muted-foreground">
                                區間模式會自動追蹤開始到結束之間的所有內容
                            </p>
                            
                            {/* 開始/結束符號 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground block">開始符號 <span className="text-red-500">*</span></label>
                                    <Input 
                                        value={config.start || ''} 
                                        onChange={(e) => updateMarker(idx, 'start', e.target.value)}
                                        className={`h-8 font-mono text-xs text-center ${!config.start ? 'border-red-500' : ''}`}
                                        placeholder="<cs>"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground block">結束符號 <span className="text-red-500">*</span></label>
                                    <Input 
                                        value={config.end || ''} 
                                        onChange={(e) => updateMarker(idx, 'end', e.target.value)}
                                        className={`h-8 font-mono text-xs text-center ${!config.end ? 'border-red-500' : ''}`}
                                        placeholder="</cs>"
                                    />
                                </div>
                            </div>
                            
                            {/* 暫停/切換符號 & 顯示文字 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground block">
                                        暫停/切換符號 (Pause Symbol) <span className="text-[9px] text-muted-foreground/50 font-normal">(選填)</span>
                                    </label>
                                    <Input 
                                        value={config.pause || ''} 
                                        onChange={(e) => updateMarker(idx, 'pause', e.target.value)}
                                        className="h-8 font-mono text-xs text-center border-dashed"
                                        placeholder="><SE"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground block">
                                        暫停顯示文字 (Pause Label)
                                    </label>
                                    <Input 
                                        value={config.pauseLabel !== undefined ? config.pauseLabel : '暫停'}
                                        onChange={(e) => updateMarker(idx, 'pauseLabel', e.target.value)}
                                        className="h-8 text-xs text-center"
                                        placeholder="默認: 暫停"
                                    />
                                </div>
                            </div>
                            
                            {/* 區間樣式選擇器 */}
                            <div className="space-y-2">
                                <label className="text-[10px] text-muted-foreground block">區間樣式</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => updateMarker(idx, 'style', { 
                                            ...config.style, 
                                            borderLeft: '2px solid currentColor',
                                            paddingLeft: '8px',
                                            backgroundColor: undefined
                                        })}
                                        className={`p-2 rounded border text-[10px] flex items-center gap-1 ${
                                            config.style?.borderLeft ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-border'
                                        }`}
                                    >
                                        <span className="w-[2px] h-4 bg-current rounded"></span>
                                        連接線
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateMarker(idx, 'style', { 
                                            ...config.style, 
                                            backgroundColor: 'rgba(100, 100, 100, 0.08)',
                                            borderLeft: undefined,
                                            paddingLeft: undefined
                                        })}
                                        className={`p-2 rounded border text-[10px] flex items-center gap-1 ${
                                            config.style?.backgroundColor && !config.style?.borderLeft ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-border'
                                        }`}
                                    >
                                        <span className="w-4 h-4 bg-muted rounded"></span>
                                        背景色
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateMarker(idx, 'style', {})}
                                        className={`p-2 rounded border text-[10px] ${
                                            !config.style?.borderLeft && !config.style?.backgroundColor ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-border'
                                        }`}
                                    >
                                        無樣式
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
                
                {config.matchMode === 'regex' ? (
                    <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] text-muted-foreground block mb-1">Regex Pattern <span className="text-red-500">*</span></label>
                        <Input 
                            value={config.regex || ''}
                            onChange={(e) => updateMarker(idx, 'regex', e.target.value)}
                            className={`h-8 font-mono text-xs ${!config.regex ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            placeholder="Example: ^\\[sfx:(.*?)\\]"
                        />
                        {!config.regex && (
                             <p className="text-[10px] text-red-500 font-medium">請輸入正規表達式</p>
                        )}
                    </div>
                ) : config.matchMode !== 'range' && (
                    <>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] text-muted-foreground block mb-1">開始符號 (Start) <span className="text-red-500">*</span></label>
                                <Input 
                                    value={config.start || ''} 
                                    onChange={(e) => updateMarker(idx, 'start', e.target.value)}
                                    className={`h-8 font-mono text-xs text-center ${!config.start ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                />
                                {!config.start && (
                                    <p className="text-[10px] text-red-500 font-medium">必填欄位</p>
                                )}
                            </div>
                            {(isBlock || config.matchMode !== 'prefix') && (
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] text-muted-foreground block mb-1">結束符號 (End) <span className="text-red-500">*</span></label>
                                    <Input 
                                        value={config.end || ''} 
                                        onChange={(e) => updateMarker(idx, 'end', e.target.value)}
                                        className={`h-8 font-mono text-xs text-center ${!config.end ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    />
                                    {!config.end && (
                                        <p className="text-[10px] text-red-500 font-medium">必填欄位</p>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {isBlock && (
                             <div className="col-span-1 sm:col-span-2 mt-2 pt-2 border-t border-dashed border-border/30">
                                <label className="flex items-center gap-2 cursor-pointer select-none" title="在區塊底部顯示結束標記內容">
                                    <input 
                                        type="checkbox" 
                                        checked={config.showEndLabel !== false}
                                        onChange={(e) => updateMarker(idx, 'showEndLabel', e.target.checked)}
                                        className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                    />
                                    <span className="text-xs text-foreground">顯示結尾標記</span>
                                </label>
                             </div>
                        )}

                        
                        {isBlock && config.matchMode === 'enclosure' && (
                             <div className="col-span-1 sm:col-span-2 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none" title="開始與結束符號相同時，視為區塊切換開關">
                                    <input 
                                        type="checkbox" 
                                        checked={!!config.smartToggle} 
                                        onChange={(e) => updateMarker(idx, 'smartToggle', e.target.checked)}
                                        className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                    />
                                    <span className="text-xs text-foreground">Smart Toggle</span>
                                </label>
                             </div>
                        )}
                    </>
                )}
             </div>

            <div className="space-y-2 pt-2 border-t border-dashed border-border/30">
                <label className="text-[10px] text-muted-foreground block">顯示樣板</label>
                <Input 
                        value={config.renderer?.template || ''}
                        onChange={(e) => {
                            const renderer = config.renderer || {};
                            updateMarker(idx, 'renderer', { ...renderer, template: e.target.value });
                        }}
                        className="h-8 text-xs font-mono"
                        placeholder="[SFX: {{content}}] ← 使用 {{content}} 代表內容"
                />
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
