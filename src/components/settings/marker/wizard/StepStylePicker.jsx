import React, { useState } from 'react';
import { cn } from '../../../../lib/utils';
import { STYLE_PRESETS } from '../presets/markerPresets';
import { 
    ChevronDown, ChevronUp, Palette, X, 
    AlignLeft, Square, CircleOff 
} from 'lucide-react';

const IconMap = {
    AlignLeft, Square, CircleOff,
    // Add fallback for others if needed
};

/**
 * Step 3: 樣式選擇器
 * 提供預設樣式和自訂選項
 */
export function StepStylePicker({ config, onChange }) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState('solid-line');

    const updateStyle = (styleUpdates) => {
        onChange({ 
            ...config, 
            style: { ...config.style, ...styleUpdates } 
        });
    };

    const applyPreset = (preset) => {
        setSelectedPreset(preset.id);
        if (preset.id === 'none') {
             onChange({ 
                ...config, 
                style: {} 
            });
        } else {
            onChange({ 
                ...config, 
                style: { ...config.style, ...preset.style } 
            });
        }
    };

    const renderIcon = (iconName) => {
        const Icon = IconMap[iconName] || CircleOff;
        return <Icon className="w-5 h-5" />;
    };

    // 顏色選項
    const colorOptions = [
        { id: 'yellow', color: '#eab308', name: '黃色' },
        { id: 'blue', color: '#1565C0', name: '藍色' },
        { id: 'orange', color: '#f97316', name: '橘色' },
        { id: 'purple', color: '#8b5cf6', name: '紫色' },
        { id: 'green', color: '#22c55e', name: '綠色' },
        { id: 'red', color: '#ef4444', name: '紅色' },
        { id: 'gray', color: '#6b7280', name: '灰色' },
    ];

    return (
        <div className="space-y-6">
            {/* 即時預覽 */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-2">樣式預覽</p>
                <div 
                    className="p-3 rounded border border-border/30 bg-background/50 transition-all duration-300"
                    style={{
                        ...config.style,
                        // Ensure layout props don't break preview
                        borderLeft: config.style?.borderLeft || undefined,
                        paddingLeft: config.style?.paddingLeft || undefined,
                    }}
                >
                    <div 
                        className="text-sm font-medium"
                        style={{ color: config.style?.color }}
                    >
                        {config.start || '>>SE'} {config.label || '標記內容'}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                        這是標記內的範例文字...
                    </div>
                    <div 
                        className="text-sm font-medium mt-1"
                        style={{ color: config.style?.color }}
                    >
                        {config.end || '<<SE'} 結束
                    </div>
                </div>
            </div>

            {/* 快速樣式選擇 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">預設樣式</h4>
                    <button 
                        type="button"
                        onClick={() => {
                            setSelectedPreset('custom');
                            updateStyle({ 
                                borderLeft: undefined,
                                border: undefined,
                                backgroundColor: undefined,
                                paddingLeft: undefined
                            });
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                    >
                        <X className="w-3 h-3" /> 清除樣式
                    </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {STYLE_PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                                selectedPreset === preset.id
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-border/50 hover:border-primary/30 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <span className="mb-2">
                                {renderIcon(preset.icon)}
                            </span>
                            <span className="text-xs">{preset.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 顏色選擇 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">文字顏色</h4>
                    {config.style?.color && (
                        <button 
                            type="button"
                            onClick={() => updateStyle({ color: undefined })}
                            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> 重置顏色
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {colorOptions.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateStyle({ color: opt.color })}
                            className={cn(
                                "w-8 h-8 rounded-full border-2 transition-all",
                                config.style?.color === opt.color
                                    ? "border-foreground scale-110 shadow-lg"
                                    : "border-transparent hover:scale-105"
                            )}
                            style={{ backgroundColor: opt.color }}
                            title={opt.name}
                        />
                    ))}
                    {/* 自訂顏色 */}
                    <div className="relative">
                        <button
                            type="button"
                            className={cn(
                                "w-8 h-8 rounded-full border-2 flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500",
                                "border-transparent hover:scale-105 transition-all"
                            )}
                            title="自訂顏色"
                        >
                            <Palette className="w-4 h-4 text-white" />
                        </button>
                        <input
                            type="color"
                            value={config.style?.color || '#000000'}
                            onChange={(e) => updateStyle({ color: e.target.value })}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* 進階選項 */}
            <div className="border-t border-border/50 pt-4">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    進階選項
                </button>
                
                {showAdvanced && (
                    <div className="mt-4 space-y-4 p-4 rounded-lg bg-muted/20">
                        {/* 字型樣式 */}
                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">字型樣式</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => updateStyle({ 
                                        fontWeight: config.style?.fontWeight === 'bold' ? undefined : 'bold' 
                                    })}
                                    className={cn(
                                        "px-3 py-1.5 rounded border text-sm font-bold transition-all",
                                        config.style?.fontWeight === 'bold'
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border/50 hover:border-border"
                                    )}
                                >
                                    B
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateStyle({ 
                                        fontStyle: config.style?.fontStyle === 'italic' ? undefined : 'italic' 
                                    })}
                                    className={cn(
                                        "px-3 py-1.5 rounded border text-sm italic transition-all",
                                        config.style?.fontStyle === 'italic'
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border/50 hover:border-border"
                                    )}
                                >
                                    I
                                </button>
                            </div>
                        </div>

                        {/* 背景顏色 */}
                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">背景顏色</label>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <div 
                                        className="w-8 h-8 rounded border border-border/50 cursor-pointer"
                                        style={{ backgroundColor: config.style?.backgroundColor || 'transparent' }}
                                    />
                                    <input
                                        type="color"
                                        value={config.style?.backgroundColor?.replace(/rgba?\([^)]+\)/, '#ffffff') || '#ffffff'}
                                        onChange={(e) => updateStyle({ backgroundColor: e.target.value + '20' })}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => updateStyle({ backgroundColor: undefined })}
                                    className="text-xs text-muted-foreground hover:text-foreground underline"
                                >
                                    清除背景
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
