import React from 'react';
import { cn } from '../../../../lib/utils';
import { Input } from '../../../ui/input';
import { AlertCircle, Info } from 'lucide-react';

/**
 * Step 2: 符號設定
 * 根據選擇的類型顯示對應的符號輸入欄位
 */
export function StepSymbolConfig({ markerType, config, onChange }) {
    const updateField = (field, value) => {
        onChange({ ...config, [field]: value });
    };

    const isRange = markerType === 'range';
    const isInline = markerType === 'inline';
    const isSingle = markerType === 'single';

    // 驗證必填欄位
    const hasStartSymbol = config.start && config.start.trim() !== '';
    const hasEndSymbol = config.end && config.end.trim() !== '';
    const hasLabel = config.label && config.label.trim() !== '';

    return (
        <div className="space-y-6">
            {/* 視覺化預覽 */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-2">預覽效果</p>
                <div className="font-mono text-sm bg-background/50 p-3 rounded border border-border/30">
                    {isRange ? (
                        <div className="space-y-1">
                            <div className="text-primary">{config.start || '>>SE'} {config.label || '區間開始'}</div>
                            <div className="pl-4 border-l-2 border-primary/50 text-muted-foreground">內容在這裡...</div>
                            {config.pause && (
                                <>
                                    <div className="text-orange-500">{config.pause} {config.pauseLabel || '暫停'}</div>
                                    <div className="text-muted-foreground">（中斷的內容）</div>
                                    <div className="text-orange-500">{config.pause} 繼續</div>
                                    <div className="pl-4 border-l-2 border-primary/50 text-muted-foreground">更多內容...</div>
                                </>
                            )}
                            <div className="text-primary">{config.end || '<<SE'} 區間結束</div>
                        </div>
                    ) : isInline ? (
                        <div>
                            <span className="text-muted-foreground">角色名 </span>
                            <span className="text-primary">
                                {config.start || '('}{config.label || 'V.O.'}{config.end || ')'}
                            </span>
                        </div>
                    ) : (
                        <div className="text-primary">
                            {config.start || '#SE'} {config.label || '音效說明'}
                            {config.end && <span> {config.end}</span>}
                        </div>
                    )}
                </div>
            </div>

            {/* 基本資訊 */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                    基本資訊
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                        <label className="text-xs text-muted-foreground">
                            標記名稱 <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={config.label || ''}
                            onChange={(e) => updateField('label', e.target.value)}
                            placeholder="例如：音效、持續音效"
                            className={cn(
                                "h-9",
                                !hasLabel && "border-red-500/50 focus-visible:ring-red-500"
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* 符號設定 */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                    符號設定
                    <span className="text-[10px] text-muted-foreground font-normal">
                        (支援全形字元)
                    </span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                    {/* 開始符號 */}
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                            {isRange ? '開始符號' : isInline ? '左括號' : '前綴符號'} 
                            <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={config.start || ''}
                            onChange={(e) => updateField('start', e.target.value)}
                            placeholder={isRange ? '>>SE' : isInline ? '(' : '#SE'}
                            className={cn(
                                "h-9 font-mono text-center",
                                !hasStartSymbol && "border-red-500/50 focus-visible:ring-red-500"
                            )}
                        />
                    </div>

                    {/* 結束符號 */}
                    {(isRange || isInline || (isSingle && config.matchMode === 'enclosure')) && (
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                                {isRange ? '結束符號' : '右括號'} 
                                <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={config.end || ''}
                                onChange={(e) => updateField('end', e.target.value)}
                                placeholder={isRange ? '<<SE' : ')'}
                                className={cn(
                                    "h-9 font-mono text-center",
                                    !hasEndSymbol && "border-red-500/50 focus-visible:ring-red-500"
                                )}
                            />
                        </div>
                    )}

                    {/* 單行標記 - 結束符號可選 */}
                    {isSingle && config.matchMode !== 'enclosure' && (
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                                結束符號 <span className="text-muted-foreground/50">(可選)</span>
                            </label>
                            <Input
                                value={config.end || ''}
                                onChange={(e) => {
                                    updateField('end', e.target.value);
                                    // 若有結束符號，切換為 enclosure 模式
                                    if (e.target.value) {
                                        updateField('matchMode', 'enclosure');
                                    } else {
                                        updateField('matchMode', 'prefix');
                                    }
                                }}
                                placeholder="留空為純前綴"
                                className="h-9 font-mono text-center border-dashed"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 區間模式 - 暫停設定 */}
            {isRange && (
                <div className="space-y-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <h4 className="text-sm font-medium flex items-center gap-2 text-orange-600">
                        <Info className="w-3.5 h-3.5" />
                        暫停功能 (進階)
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                        設定暫停符號可讓區間在中途中斷並繼續
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">暫停符號</label>
                            <Input
                                value={config.pause || ''}
                                onChange={(e) => updateField('pause', e.target.value)}
                                placeholder="><SE"
                                className="h-9 font-mono text-center border-dashed"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">顯示文字</label>
                            <Input
                                value={config.pauseLabel !== undefined ? config.pauseLabel : ''}
                                onChange={(e) => updateField('pauseLabel', e.target.value)}
                                placeholder="留空則隱藏"
                                className="h-9 text-center border-dashed"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 行內模式 - 關鍵字設定 */}
            {isInline && (
                <div className="space-y-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                    <h4 className="text-sm font-medium flex items-center gap-2 text-purple-600">
                        <Info className="w-3.5 h-3.5" />
                        關鍵字過濾 (進階)
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                        設定關鍵字可讓只有特定內容才套用樣式
                    </p>
                    <div className="space-y-2">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">關鍵字列表 (逗號分隔)</label>
                            <Input
                                value={config.keywords?.join(', ') || ''}
                                onChange={(e) => {
                                    const keywords = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                    updateField('keywords', keywords);
                                }}
                                placeholder="V.O., O.S., 畫外音"
                                className="h-9 text-xs"
                            />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={!!config.dimIfNotKeyword}
                                onChange={(e) => updateField('dimIfNotKeyword', e.target.checked)}
                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                            />
                            <span className="text-xs text-muted-foreground">非關鍵字時淡化顯示</span>
                        </label>
                    </div>
                </div>
            )}

            {/* 驗證提示 */}
            {(!hasLabel || !hasStartSymbol || (isRange && !hasEndSymbol)) && (
                <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>請填寫所有必填欄位後繼續</span>
                </div>
            )}
        </div>
    );
}
