import React from "react";
import { Input } from "../../../ui/input";
import { cn } from "../../../../lib/utils";
import { useI18n } from "../../../../contexts/I18nContext";
import type { MarkerConfigEditorProps } from "../types";

const TYPE_OPTIONS = [
    {
        value: "inline",
        exampleLines: [
            { text: "角色A：你今天", highlight: false },
            { text: "看起來[[很累]]", highlight: true, highlightWord: "[[很累]]", before: "看起來", after: "" },
            { text: "啊。", highlight: false },
        ],
        descKey: "markerGeneral.inlineDesc",
    },
    {
        value: "block",
        exampleLines: [
            { text: "/旁白", isMarker: true },
            { text: "夜深了，城市", isMarker: false },
            { text: "漸漸沉靜下來。", isMarker: false },
            { text: "/旁白", isMarker: true },
        ],
        descKey: "markerGeneral.blockDesc",
    },
] as const;

export function MarkerGeneralSettings({ config, idx, updateMarker, isAdvancedMode = true }: MarkerConfigEditorProps): React.JSX.Element {
    const { t } = useI18n();
    const currentType = config.type === 'block' || config.isBlock ? 'block' : 'inline';

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t("markerGeneral.name")} <span className="text-destructive">*</span></label>
                <Input
                    value={config.label || ''}
                    onChange={(e) => updateMarker(idx, 'label', e.target.value)}
                    className={`h-10 text-base ${!config.label ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {!config.label && (
                    <p className="text-sm text-destructive font-medium">{t("markerGeneral.required")}</p>
                )}
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">{t("markerGeneral.type")}</label>
                <div className="grid grid-cols-2 gap-2">
                    {TYPE_OPTIONS.map((opt) => {
                        const isActive = currentType === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateMarker(idx, { type: opt.value, isBlock: opt.value === 'block' })}
                                className={cn(
                                    "flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-all",
                                    isActive
                                        ? "border-primary bg-primary/8 ring-1 ring-primary/40"
                                        : "border-border/50 hover:border-border hover:bg-muted/20"
                                )}
                            >
                                {/* Compact inline example */}
                                <div className={cn(
                                    "shrink-0 rounded px-1.5 py-1 font-mono text-[9px] leading-tight whitespace-nowrap",
                                    isActive ? "bg-background/80" : "bg-muted/40"
                                )}>
                                    {opt.value === 'inline' ? (
                                        <span>
                                            <span className="text-muted-foreground/50">你</span>
                                            <span className={cn("rounded px-0.5", isActive ? "bg-primary/25 text-primary" : "bg-foreground/10 text-foreground/70")}>很累</span>
                                            <span className="text-muted-foreground/50">啊</span>
                                        </span>
                                    ) : (
                                        <span className="flex flex-col gap-0.5">
                                            <span className={isActive ? "text-primary/60" : "text-muted-foreground/40"}>/旁白</span>
                                            <span className={cn("rounded px-1", isActive ? "bg-primary/15 text-foreground/80" : "bg-foreground/5 text-muted-foreground/60")}>場景文字</span>
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className={cn("text-[11px] font-medium leading-tight", isActive ? "text-primary" : "text-foreground/80")}>
                                        {t(`markerGeneral.${opt.value}`)}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground/60 leading-snug mt-0.5">
                                        {t(opt.descKey)}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {isAdvancedMode && (
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("markerGeneral.priority")}</label>
                    <Input
                        type="number"
                        value={config.priority || 0}
                        onChange={(e) => updateMarker(idx, 'priority', parseInt(e.target.value) || 0)}
                        className="h-10 max-w-[220px] text-sm text-center font-mono bg-muted/20"
                        title={t("markerGeneral.priorityHint")}
                    />
                </div>
            )}
        </div>
    );
}
