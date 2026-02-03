import React from 'react';
import { cn } from '../../../../lib/utils';
import { MARKER_TYPES, MARKER_PRESETS } from '../presets/markerPresets';
import { 
    Volume2, Music, MessageSquare, Clapperboard, Film, Edit3, 
    FileText, Package, Highlighter 
} from 'lucide-react';

const IconMap = {
    Volume2, Music, MessageSquare, Clapperboard, Film, Edit3,
    FileText, Package, Highlighter
};

/**
 * Step 1: 類型選擇器
 * 讓用戶選擇要建立的標記類型
 */
export function StepTypeSelector({ value, onChange, onPresetSelect }) {
    const [showPresets, setShowPresets] = React.useState(true);

    const renderIcon = (iconName) => {
        const Icon = IconMap[iconName];
        return Icon ? <Icon className="w-5 h-5" /> : null;
    };

    return (
        <div className="space-y-6">
            {/* 快速開始 - 預設模板 */}
            {showPresets && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground">快速開始</h3>
                        <button 
                            type="button"
                            onClick={() => setShowPresets(false)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            隱藏
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {MARKER_PRESETS.filter(p => p.id !== 'custom-blank').map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => onPresetSelect(preset)}
                                className={cn(
                                    "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                                    "hover:border-primary/50 hover:bg-primary/5",
                                    "border-border/50 bg-card/50"
                                )}
                            >
                                <span className="mb-2 text-muted-foreground group-hover:text-primary transition-colors">
                                    {renderIcon(preset.icon)}
                                </span>
                                <span className="text-xs font-medium text-foreground">{preset.name}</span>
                                <span className="text-[10px] text-muted-foreground line-clamp-1">{preset.description}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 分隔線 */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-background px-2 text-xs text-muted-foreground">
                        或選擇類型
                    </span>
                </div>
            </div>

            {/* 類型選擇卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MARKER_TYPES.map((type) => {
                    const isSelected = value === type.id;
                    
                    return (
                        <button
                            key={type.id}
                            type="button"
                            onClick={() => onChange(type.id)}
                            className={cn(
                                "flex flex-col p-4 rounded-xl border-2 text-left transition-all group",
                                isSelected 
                                    ? "border-primary bg-primary/5 shadow-md scale-[1.02]" 
                                    : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className={cn(
                                    "transition-colors",
                                    isSelected ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {renderIcon(type.icon)}
                                </span>
                                <span className={cn(
                                    "font-medium",
                                    isSelected ? "text-primary" : "text-foreground"
                                )}>
                                    {type.name}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">
                                {type.description}
                            </p>
                            <div className={cn(
                                "mt-auto p-2 rounded-md font-mono text-xs whitespace-pre-wrap",
                                isSelected 
                                    ? "bg-primary/10 text-primary" 
                                    : "bg-muted/50 text-muted-foreground"
                            )}>
                                {type.example}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* 選擇後的說明提示 */}
            {value && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">
                        {value === 'single' && '單行標記適合用於標記獨立的一行內容，例如音效說明、場景註記等。'}
                        {value === 'range' && '區間標記適合用於標記多行的連續內容，例如持續音效、角色心聲等。'}
                        {value === 'inline' && '行內樣式適合用於標記行中的特定片段，例如對白中的 (V.O.) 或方位說明。'}
                    </p>
                </div>
            )}
        </div>
    );
}
