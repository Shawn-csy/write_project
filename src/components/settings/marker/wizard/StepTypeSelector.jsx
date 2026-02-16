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

const CREATOR_SCENARIOS = [
    {
        id: "audio",
        title: "我要標記音效",
        description: "適合 SFX、環境音、持續音效",
        presetId: "sound-effect",
    },
    {
        id: "dialogue",
        title: "我要標記對白註記",
        description: "適合 V.O.、O.S.、旁白或語氣標註",
        presetId: "dialogue-note",
    },
    {
        id: "action",
        title: "我要標記動作或段落註解",
        description: "適合動作描述、導演備註",
        presetId: "action-note",
    },
    {
        id: "post",
        title: "我要標記後期處理",
        description: "適合剪接、配樂、調色等後製註記",
        presetId: "post-production",
    },
];

/**
 * Step 1: 類型選擇器
 * 讓用戶選擇要建立的標記類型
 */
export function StepTypeSelector({ value, onChange, onPresetSelect, onScenarioSelect }) {
    const [entryMode, setEntryMode] = React.useState("scenario"); // scenario | manual

    const renderIcon = (iconName) => {
        const Icon = IconMap[iconName];
        return Icon ? <Icon className="w-5 h-5" /> : null;
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">先選一種建立方式</h3>
                <div className="inline-flex rounded-md border border-border/60 overflow-hidden w-fit">
                    <button
                        type="button"
                        className={cn("h-8 px-3 text-xs", entryMode === "scenario" ? "bg-background font-medium" : "bg-muted/30 text-muted-foreground")}
                        onClick={() => setEntryMode("scenario")}
                    >
                        情境推薦
                    </button>
                    <button
                        type="button"
                        className={cn("h-8 px-3 text-xs border-l border-border/60", entryMode === "manual" ? "bg-background font-medium" : "bg-muted/30 text-muted-foreground")}
                        onClick={() => setEntryMode("manual")}
                    >
                        手動設定
                    </button>
                </div>
                <p className="text-xs text-muted-foreground">
                    先用情境推薦最快；需要精準控制時再切到手動設定。
                </p>
            </div>

            {entryMode === "scenario" && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">從創作情境開始</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {CREATOR_SCENARIOS.map((scenario) => (
                            <button
                                key={scenario.id}
                                type="button"
                                onClick={() => onScenarioSelect?.(scenario)}
                                className="rounded-lg border border-border/60 bg-card/60 p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                            >
                                <div className="text-sm font-medium text-foreground">{scenario.title}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{scenario.description}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {entryMode === "manual" && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">手動設定</h3>
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">可先選官方範本，再微調符號與樣式。</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {MARKER_PRESETS.filter((p) => p.id !== 'custom-blank').map((preset) => (
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
                    <div className="h-px bg-border/40" />
                    <h4 className="text-xs font-medium text-muted-foreground">或從空白類型開始</h4>
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
                </div>
            )}

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
