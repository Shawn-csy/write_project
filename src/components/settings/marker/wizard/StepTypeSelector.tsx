import React from 'react';
import { cn } from '../../../../lib/utils';
import { MARKER_TYPES, MARKER_PRESETS } from '../presets/markerPresets';
import { useI18n } from '../../../../contexts/I18nContext';
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
        presetId: "sound-effect",
    },
    {
        id: "dialogue",
        presetId: "dialogue-note",
    },
    {
        id: "action",
        presetId: "action-note",
    },
    {
        id: "post",
        presetId: "post-production",
    },
];

/**
 * Step 1: 類型選擇器
 * 讓用戶選擇要建立的標記類型
 */
export function StepTypeSelector({ value, onChange, onPresetSelect, onScenarioSelect }) {
    const { t } = useI18n();
    const [entryMode, setEntryMode] = React.useState("scenario"); // scenario | manual
    const scenarioText = {
        audio: {
            title: t("stepTypeSelector.scenario.audio.title"),
            description: t("stepTypeSelector.scenario.audio.description"),
        },
        dialogue: {
            title: t("stepTypeSelector.scenario.dialogue.title"),
            description: t("stepTypeSelector.scenario.dialogue.description"),
        },
        action: {
            title: t("stepTypeSelector.scenario.action.title"),
            description: t("stepTypeSelector.scenario.action.description"),
        },
        post: {
            title: t("stepTypeSelector.scenario.post.title"),
            description: t("stepTypeSelector.scenario.post.description"),
        },
    };

    const renderIcon = (iconName) => {
        const Icon = IconMap[iconName];
        return Icon ? <Icon className="w-5 h-5" /> : null;
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">{t("stepTypeSelector.chooseMode")}</h3>
                <div className="inline-flex rounded-md border border-border/60 overflow-hidden w-fit">
                    <button
                        type="button"
                        className={cn("h-8 px-3 text-xs", entryMode === "scenario" ? "bg-background font-medium" : "bg-muted/30 text-muted-foreground")}
                        onClick={() => setEntryMode("scenario")}
                    >
                        {t("stepTypeSelector.scenarioMode")}
                    </button>
                    <button
                        type="button"
                        className={cn("h-8 px-3 text-xs border-l border-border/60", entryMode === "manual" ? "bg-background font-medium" : "bg-muted/30 text-muted-foreground")}
                        onClick={() => setEntryMode("manual")}
                    >
                        {t("stepTypeSelector.manualMode")}
                    </button>
                </div>
                <p className="text-xs text-muted-foreground">
                    {t("stepTypeSelector.modeTip")}
                </p>
            </div>

            {entryMode === "scenario" && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">{t("stepTypeSelector.startFromScenario")}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {CREATOR_SCENARIOS.map((scenario) => (
                            <button
                                key={scenario.id}
                                type="button"
                                onClick={() =>
                                  onScenarioSelect?.({
                                    ...scenario,
                                    title: scenarioText[scenario.id]?.title || scenario.id,
                                  })
                                }
                                className="rounded-lg border border-border/60 bg-card/60 p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                            >
                                <div className="text-sm font-medium text-foreground">{scenarioText[scenario.id]?.title || scenario.id}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{scenarioText[scenario.id]?.description || ""}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {entryMode === "manual" && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">{t("stepTypeSelector.manualMode")}</h3>
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{t("stepTypeSelector.manualTip")}</p>
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
                    <h4 className="text-xs font-medium text-muted-foreground">{t("stepTypeSelector.startFromBlank")}</h4>
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
                        {value === 'single' && t("stepTypeSelector.hint.single")}
                        {value === 'range' && t("stepTypeSelector.hint.range")}
                        {value === 'inline' && t("stepTypeSelector.hint.inline")}
                    </p>
                </div>
            )}
        </div>
    );
}
