import React, { useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Check, Italic, SlidersHorizontal } from "lucide-react";
import { Button } from "../../../ui/button";
import { MARKER_COLORS } from "../../../../constants/markerColors";
import { cn } from "../../../../lib/utils";
import { useI18n } from "../../../../contexts/I18nContext";
import type { MarkerConfigEditorProps } from "../types";

export function MarkerStyleSettings({ config, idx, updateMarker }: MarkerConfigEditorProps): React.JSX.Element {
    const { t } = useI18n();
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const updateStyle = (styleField: string, value: string | undefined) => {
        const currentStyle = config.style || {};
        const newStyle = { ...currentStyle } as Record<string, string>;
        if (value === undefined || value === "") {
            delete newStyle[styleField];
        } else {
            newStyle[styleField] = value;
        }
        updateMarker(idx, 'style', newStyle);
    };

    const toggleFontStyle = (field: string, onValue: string, offValue = 'normal') => {
        const current = config.style?.[field];
        updateStyle(field, current === onValue ? offValue : onValue);
    };

    const setAlign = (value: string | undefined) => updateStyle('textAlign', value);

    const textColor = String(config.style?.color || "");
    const backgroundColor = String(config.style?.backgroundColor || "");
    const selectedPreset = MARKER_COLORS.find((color) => textColor === `var(--marker-color-${color.id})`);

    return (
        <div className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-foreground">{t("markerStyle.quickStyle")}</span>
                    {selectedPreset ? (
                        <span className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                            {selectedPreset.name}
                        </span>
                    ) : null}
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5">
                    <Button
                        type="button"
                        size="sm"
                        variant={config.style?.fontWeight === 'bold' ? "secondary" : "outline"}
                        className="h-7 gap-1.5 text-xs px-2"
                        onClick={() => toggleFontStyle('fontWeight', 'bold')}
                    >
                        <Bold className="h-3 w-3" />
                        {t("markerStyle.bold")}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={config.style?.fontStyle === 'italic' ? "secondary" : "outline"}
                        className="h-7 gap-1.5 text-xs px-2"
                        onClick={() => toggleFontStyle('fontStyle', 'italic')}
                    >
                        <Italic className="h-3 w-3" />
                        {t("markerStyle.italic")}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={backgroundColor && backgroundColor !== 'transparent' ? "secondary" : "outline"}
                        className="h-7 text-xs px-2"
                        onClick={() => updateStyle('backgroundColor', backgroundColor && backgroundColor !== 'transparent' ? undefined : 'rgba(250, 204, 21, 0.22)')}
                    >
                        {t("markerStyle.highlight")}
                    </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                    <button
                        type="button"
                        onClick={() => updateStyle('color', undefined)}
                        className={cn(
                            "flex h-6 items-center justify-center rounded border px-2 text-[10px] font-medium transition-all",
                            !textColor ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-background text-muted-foreground hover:border-border"
                        )}
                    >
                        {t("markerStyle.defaultColor")}
                    </button>
                    {MARKER_COLORS.slice(0, 11).map((color) => {
                        const variable = `var(--marker-color-${color.id})`;
                        const isSelected = textColor === variable;
                        return (
                            <button
                                key={color.id}
                                type="button"
                                onClick={() => updateStyle('color', variable)}
                                className={cn(
                                    "relative h-6 w-6 rounded-full border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                                    isSelected ? "border-primary ring-2 ring-primary ring-offset-1 scale-110" : "border-border/50 hover:border-border hover:scale-105"
                                )}
                                style={{ backgroundColor: variable }}
                                title={color.name}
                            >
                                {isSelected ? (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <Check className="h-3 w-3 text-white drop-shadow" strokeWidth={3} />
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            </div>

            <details
                className="rounded-lg border border-dashed border-border/60 bg-background/60"
                open={advancedOpen}
                onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
            >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground">
                    <span className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                        {t("markerStyle.advancedStyle")}
                    </span>
                    <span className="text-xs text-muted-foreground">{advancedOpen ? t("markerStyle.collapse") : t("markerStyle.expand")}</span>
                </summary>

                <div className="grid gap-4 border-t border-border/50 p-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t("markerStyle.textColor")}</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                className="h-10 w-12 rounded border border-input bg-background p-1"
                                value={textColor && !textColor.startsWith('var(--') ? textColor : '#000000'}
                                onChange={(event) => updateStyle('color', event.target.value)}
                            />
                            <Button type="button" variant="outline" size="sm" onClick={() => updateStyle('color', undefined)}>
                                {t("markerStyle.defaultColor")}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t("markerStyle.bgColor")}</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                className="h-10 w-12 rounded border border-input bg-background p-1"
                                value={backgroundColor && backgroundColor !== 'transparent' ? backgroundColor : '#ffffff'}
                                onChange={(event) => updateStyle('backgroundColor', event.target.value)}
                            />
                            <Button type="button" variant="outline" size="sm" onClick={() => updateStyle('backgroundColor', undefined)}>
                                {t("markerStyle.transparent")}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t("markerStyle.fontDefault")}</label>
                        <select
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={config.style?.fontFamily || ''}
                            onChange={(event) => updateStyle('fontFamily', event.target.value)}
                        >
                            <option value="">{t("markerStyle.fontDefault")}</option>
                            <option value="'Courier New', 'Songti TC', 'SimSun', serif">{t("markerStyle.scriptFont")}</option>
                            <option value="serif">{t("markerStyle.serif")}</option>
                            <option value="sans-serif">{t("markerStyle.sans")}</option>
                            <option value="monospace">{t("markerStyle.mono")}</option>
                            <option value="cursive">{t("markerStyle.cursive")}</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">{t("markerStyle.size")}</label>
                            <select
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                value={config.style?.fontSize || ''}
                                onChange={(event) => updateStyle('fontSize', event.target.value)}
                            >
                                <option value="">{t("markerStyle.size")}</option>
                                <option value="0.9em">0.9x</option>
                                <option value="1em">1.0x</option>
                                <option value="1.2em">1.2x</option>
                                <option value="1.5em">1.5x</option>
                                <option value="2em">2.0x</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">{t("markerStyle.lineHeight")}</label>
                            <select
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                value={config.style?.lineHeight || ''}
                                onChange={(event) => updateStyle('lineHeight', event.target.value)}
                            >
                                <option value="">{t("markerStyle.lineHeight")}</option>
                                <option value="1">1.0</option>
                                <option value="1.2">1.2</option>
                                <option value="1.5">1.5</option>
                                <option value="2">2.0</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-foreground">{t("markerStyle.align")}</label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: undefined, label: t("markerStyle.noAlign"), icon: null },
                                { value: 'left', label: t("markerStyle.alignLeft"), icon: AlignLeft },
                                { value: 'center', label: t("markerStyle.alignCenter"), icon: AlignCenter },
                                { value: 'right', label: t("markerStyle.alignRight"), icon: AlignRight },
                            ].map((option) => {
                                const Icon = option.icon;
                                const active = (config.style?.textAlign || undefined) === option.value;
                                return (
                                    <Button
                                        key={option.value || 'none'}
                                        type="button"
                                        variant={active ? "secondary" : "outline"}
                                        size="sm"
                                        className="h-9 gap-2"
                                        onClick={() => setAlign(option.value)}
                                    >
                                        {Icon ? <Icon className="h-4 w-4" /> : null}
                                        {option.label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </details>
        </div>
    );
}
