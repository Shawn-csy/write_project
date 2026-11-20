import React from "react";
import { MarkerStyleSettings } from "./configs/MarkerStyleSettings";
import { MarkerAnalysisSettings } from "./configs/MarkerAnalysisSettings";
import { AlertCircle, Check, Maximize2 } from "lucide-react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";
import { cn } from "../../../lib/utils";
import { useI18n } from "../../../contexts/I18nContext";
import type { EditableMarkerConfig, UpdateMarkerFn } from "./types";
import type { LayoutConfig, TrackConfig } from "../../../lib/v2";

interface MarkerDetailEditorProps {
    config: EditableMarkerConfig | null;
    idx: number;
    updateMarker: UpdateMarkerFn;
    tracks?: TrackConfig[];
    layoutConfig?: LayoutConfig;
    onLayoutChange?: (config: LayoutConfig) => void;
    onOpenFullLayoutEditor?: () => void;
}

const TYPE_OPTIONS = ["inline", "block"] as const;

const MATCH_MODES = ["enclosure", "prefix", "range", "regex"] as const;

function RuleSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-2 pb-3">
            <h3 className="text-sm font-semibold">{title}</h3>
            {children}
        </section>
    );
}

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
    return (
        <div className="marker-rule-form-row grid gap-2">
            <span className="pt-2 text-[13px] font-medium text-foreground/85">{label}</span>
            <div className="min-w-0">
                {children}
                {hint ? <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
            </div>
        </div>
    );
}

function SymbolInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
    return (
        <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <Input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className={cn("h-9 text-center font-mono text-sm", !value && "border-destructive")}
                placeholder={placeholder}
                aria-invalid={!value}
            />
        </label>
    );
}

function ToggleRow({ checked, onChange, label, description }: { checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string }) {
    const id = React.useId();
    return (
        <div className="flex items-start gap-3">
            <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
            <label htmlFor={id} className="flex cursor-pointer flex-col gap-0.5">
                <span className="text-[13px]">{label}</span>
                {description ? <span className="text-xs leading-relaxed text-muted-foreground">{description}</span> : null}
            </label>
        </div>
    );
}

export function MarkerDetailEditor({ config, idx, updateMarker, tracks = [], layoutConfig, onLayoutChange, onOpenFullLayoutEditor }: MarkerDetailEditorProps): React.JSX.Element {
    const { t } = useI18n();
    if (!config) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-8 text-muted-foreground">
                <AlertCircle className="mb-2 h-10 w-10 opacity-20" />
                <p className="text-sm">{t("markerDetailEditor.selectRuleHint")}</p>
            </div>
        );
    }

    const rawType = config.type === "block" || config.isBlock ? "block" : "inline";
    const matchMode = config.matchMode || "enclosure";
    const currentType = rawType;
    const isBlock = currentType === "block";
    const enabledTracks = tracks.filter((tr) => tr.enabled).sort((a, b) => a.order - b.order);
    const availableTypeOptions = matchMode === "range" ? TYPE_OPTIONS.filter((opt) => opt === "block") : TYPE_OPTIONS;
    const groupingEnabled = Boolean((config.v2SyncRows || config.enableColumnGrouping) && config.matchMode === "range");
    const isMarkerDialogueGrouping = layoutConfig?.rowGrouping === "marker_dialogue";
    const typeLabel = (opt: typeof TYPE_OPTIONS[number]) => (opt === "block"
        ? t("markerStudio.displayBlock", "獨立一行")
        : t("markerStudio.displayInline", "嵌在句子裡"));

    const updateMatchMode = (mode: typeof MATCH_MODES[number]) => {
        if (mode === "prefix") {
            updateMarker(idx, {
                matchMode: mode,
                type: "inline",
                isBlock: false,
                end: undefined,
            });
            return;
        }
        updateMarker(idx, "matchMode", mode);
    };

    return (
        <div className="min-w-0">
            <RuleSection title={t("markerStudio.stepSyntax")}>
                <div className="flex flex-wrap items-end gap-2">
                <label className="grid gap-1 text-xs text-muted-foreground">{t("markerLogic.matchMode")}
                <select
                    aria-label={t("markerLogic.matchMode")}
                    value={MATCH_MODES.find((mode) => mode === matchMode) ?? ""}
                    onChange={(event) => updateMatchMode(event.target.value as typeof MATCH_MODES[number])}
                    className="h-9 max-w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                    {!MATCH_MODES.some((mode) => mode === matchMode) && (
                        <option value="" disabled>{t("markerStudio.chooseSyntax")}</option>
                    )}
                    {MATCH_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                            {mode === "regex" ? t("markerLogic.regexLabel") : t(`modeSelector.${mode}`)}
                        </option>
                    ))}
                </select></label>

                {matchMode === "regex" ? (
                    <FieldRow label={t("markerLogic.regexLabel")} hint={t("markerStudio.regexHint", "每一行分別比對；右側試寫區會標出比對到的行。")}>
                        <Input
                            aria-label={t("markerLogic.regexLabel")}
                            value={config.regex || ""}
                            onChange={(e) => updateMarker(idx, "regex", e.target.value)}
                            className={cn("h-9 font-mono text-sm", !config.regex && "border-destructive")}
                            placeholder={t("markerLogic.regexPlaceholder")}
                        />
                    </FieldRow>
                ) : matchMode === "range" ? (
                    <FieldRow label={t("markerLogic.rangeSymbolPair")} hint={t("markerLogic.rangeBlockHint")}>
                        <div className="grid max-w-md grid-cols-2 gap-3">
                            <SymbolInput label={t("markerLogic.rangeStartLabel")} value={config.start || ""} onChange={(value) => updateMarker(idx, "start", value)} placeholder=">>SE" />
                            <SymbolInput label={t("markerLogic.rangeEndLabel")} value={config.end || ""} onChange={(value) => updateMarker(idx, "end", value)} placeholder="<<SE" />
                        </div>
                    </FieldRow>
                ) : matchMode === "prefix" ? (
                    <div className="w-28 max-w-full">
                        <SymbolInput label={t("markerStudio.sourceSymbol")} value={config.start || ""} onChange={(value) => updateMarker(idx, "start", value)} placeholder="#SE" />
                    </div>
                ) : (
                    <FieldRow label={t("markerLogic.symbolPair")} hint={t("markerLogic.enclosedContentHint")}>
                        <div className="grid max-w-md grid-cols-2 gap-3">
                            <SymbolInput label={t("markerLogic.startLabel")} value={config.start || ""} onChange={(value) => updateMarker(idx, "start", value)} placeholder="(" />
                            <SymbolInput label={t("markerLogic.endLabel")} value={config.end || ""} onChange={(value) => updateMarker(idx, "end", value)} placeholder=")" />
                        </div>
                    </FieldRow>
                )}
                </div>
            </RuleSection>

            <details className="border-t border-border py-3">
                <summary className="cursor-pointer text-sm font-semibold">{t("markerStudio.readerSettings")}</summary>
                <div className="mt-4 space-y-4">
                <FieldRow label={t("markerStudio.position", "位置")}>
                    <div role="radiogroup" aria-label={t("markerStudio.position", "位置")} className="inline-flex gap-0.5 rounded-lg bg-muted p-[3px]">
                        {availableTypeOptions.map((opt) => {
                            const isActive = currentType === opt;
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    role="radio"
                                    aria-checked={isActive}
                                    onClick={() => updateMarker(idx, { type: opt, isBlock: opt === "block" })}
                                    className={cn(
                                        "h-9 rounded-md px-3 text-[13px] transition-colors sm:h-[30px]",
                                        isActive ? "bg-background font-semibold text-foreground shadow-[0_0_0_1px_hsl(var(--border))]" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {typeLabel(opt)}
                                </button>
                            );
                        })}
                    </div>
                </FieldRow>

                <MarkerStyleSettings config={config} idx={idx} updateMarker={updateMarker} />

                {matchMode !== "regex" && (
                    <FieldRow
                        label={t("markerStudio.displayText", "顯示文字")}
                        hint={<>{t("markerStudio.templateHint", "留空就照原文顯示；")}<code className="rounded bg-muted px-1 font-mono">{"{{content}}"}</code>{t("markerStudio.templateHintTail", " 代表原稿內容。")}</>}
                    >
                        <Input
                            value={config.renderer?.template || ""}
                            onChange={(e) => {
                                const renderer = config.renderer || {};
                                updateMarker(idx, "renderer", { ...renderer, template: e.target.value });
                            }}
                            className="h-9 max-w-md font-mono text-sm"
                            placeholder={t("markerLogic.templatePlaceholder")}
                        />
                    </FieldRow>
                )}

                <div className="marker-rule-form-indent space-y-3">
                    {matchMode !== "regex" && (
                        <ToggleRow
                            checked={!!config.showDelimiters}
                            onChange={(checked) => updateMarker(idx, "showDelimiters", checked)}
                            label={t("markerStudio.showDelimiters", "閱讀時也顯示原本的符號")}
                        />
                    )}
                    {isBlock && matchMode !== "prefix" && (
                        <ToggleRow
                            checked={config.showEndLabel !== false}
                            onChange={(checked) => updateMarker(idx, "showEndLabel", checked)}
                            label={t("markerStudio.showEndLabel", "顯示結束標示")}
                        />
                    )}
                </div>
                </div>
            </details>

            <details className="border-t border-border py-3">
                <summary className="cursor-pointer text-sm font-semibold">{t("markerStudio.stepColumn")}</summary>
                <div className="mt-4 space-y-4">
                {enabledTracks.length > 0 ? (
                    <div>
                        <div role="radiogroup" aria-label={t("markerStudio.stepColumn", "多欄模式放在哪一欄")} className="flex flex-wrap gap-1">
                            {[{ id: "", name: t("markerLogic.trackAuto") }, ...enabledTracks].map((track) => {
                                const isTarget = track.id ? config.v2TrackId === track.id : !config.v2TrackId;
                                return (
                                    <button
                                        key={track.id || "auto"}
                                        type="button"
                                        role="radio"
                                        aria-checked={isTarget}
                                        onClick={() => updateMarker(idx, "v2TrackId", track.id || undefined)}
                                        title={track.id ? track.id : t("markerDetailEditor.trackAutoHint")}
                                        className={cn(
                                            "flex h-8 items-center justify-center gap-1 truncate rounded-md border px-2 text-[13px] transition-colors",
                                            isTarget ? "border-primary bg-primary/5 font-semibold text-foreground ring-1 ring-primary" : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground"
                                        )}
                                    >
                                        {isTarget && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                                        <span className="truncate">{track.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {onOpenFullLayoutEditor && (
                            <button type="button" onClick={onOpenFullLayoutEditor} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                <Maximize2 className="h-3 w-3" />
                                {t("markerDetailEditor.editLayout")}
                            </button>
                        )}
                    </div>
                ) : (
                    <FieldRow label={t("markerStudio.columnId", "欄位代號")}>
                        <Input
                            value={String(config.v2TrackId || "")}
                            onChange={(e) => updateMarker(idx, "v2TrackId", e.target.value || undefined)}
                            className="h-9 max-w-xs font-mono text-sm"
                            placeholder="main / sfx / secondary"
                        />
                    </FieldRow>
                )}

                {matchMode === "range" && (
                    <div className="space-y-3">
                        <ToggleRow
                            checked={!!(config.v2SyncRows || config.enableColumnGrouping)}
                            onChange={(checked) => {
                                updateMarker(idx, "v2SyncRows", checked || undefined);
                                updateMarker(idx, "enableColumnGrouping", undefined);
                            }}
                            label={t("markerStudio.syncRows", "區間內的各欄內容對齊同一列")}
                            description={t("markerLogic.v2SyncRowsDesc")}
                        />
                        <ToggleRow
                            checked={!!config.v2RangeOwnsContent}
                            onChange={(checked) => updateMarker(idx, "v2RangeOwnsContent", checked || undefined)}
                            label={t("markerStudio.rangeOwnsContent", "區間內的內容都放進這一欄")}
                            description={t("markerLogic.v2RangeOwnsContentDesc")}
                        />
                    </div>
                )}

                {groupingEnabled && !isMarkerDialogueGrouping && (
                    <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[hsl(var(--status-ready-fg))]/25 bg-[hsl(var(--status-ready-bg))] px-4 py-3 text-[13px] text-[hsl(var(--status-ready-fg))]" role="alert">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="min-w-[14rem] flex-1">{t("markerStudio.groupingMismatch", "目前的欄位版面不是「依標記並排」，對齊不會生效。")}</span>
                        {layoutConfig && onLayoutChange ? (
                            <Button type="button" size="sm" variant="outline" onClick={() => onLayoutChange({ ...layoutConfig, rowGrouping: "marker_dialogue" })}>
                                {t("markerStudio.fixGrouping", "改成依標記並排")}
                            </Button>
                        ) : onOpenFullLayoutEditor ? (
                            <Button type="button" size="sm" variant="outline" onClick={onOpenFullLayoutEditor}>{t("markerLogic.goFixLayout")}</Button>
                        ) : null}
                    </div>
                )}
                </div>
            </details>

            <details className="group border-t border-border/70 pt-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-muted-foreground hover:text-foreground">
                    <span>{t("markerStudio.advanced", "進階：比對優先順序與統計")}</span>
                    <span className="text-xs font-normal group-open:hidden">{t("markerDetailEditor.expand")}</span>
                    <span className="hidden text-xs font-normal group-open:inline">{t("markerDetailEditor.collapse")}</span>
                </summary>
                <div className="space-y-4 pt-4">
                    <FieldRow label={t("markerGeneral.priority")} hint={t("markerStudio.priorityHint", "數字越大越先比對；拖曳左側清單也會自動調整。")}>
                        <Input
                            type="number"
                            value={config.priority || 0}
                            onChange={(e) => updateMarker(idx, "priority", parseInt(e.target.value) || 0)}
                            className="h-9 max-w-[7rem] text-center font-mono text-sm"
                        />
                    </FieldRow>
                    <MarkerAnalysisSettings config={config} idx={idx} updateMarker={updateMarker} />
                </div>
            </details>
        </div>
    );
}
