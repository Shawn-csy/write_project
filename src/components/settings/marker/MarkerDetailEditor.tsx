import React, { useState } from "react";
import { MarkerStyleSettings } from "./configs/MarkerStyleSettings";
import { MarkerAnalysisSettings } from "./configs/MarkerAnalysisSettings";
import { MarkerPreview } from "./configs/MarkerPreview";
import { AlertCircle, Maximize2, ChevronDown, Check } from "lucide-react";
import { Input } from "../../ui/input";
import { cn } from "../../../lib/utils";
import { useI18n } from "../../../contexts/I18nContext";
import type { EditableMarkerConfig, UpdateMarkerFn } from "./types";
import type { LayoutConfig, TrackConfig } from "../../../lib/v2";

interface MarkerDetailEditorProps {
    config: EditableMarkerConfig | null;
    idx: number;
    updateMarker: UpdateMarkerFn;
    readOnly?: boolean;
    tracks?: TrackConfig[];
    layoutConfig?: LayoutConfig;
    onOpenFullLayoutEditor?: () => void;
}

/** Compact label-value row used throughout the editor */
function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
    return (
        <div className="flex items-start gap-3 py-2 border-b border-border/20 last:border-0">
            <span className="w-20 shrink-0 pt-1.5 text-[11px] text-muted-foreground leading-none">{label}</span>
            <div className="flex-1 min-w-0">
                {children}
                {hint && <p className="mt-1 text-[10px] text-muted-foreground/50 leading-relaxed">{hint}</p>}
            </div>
        </div>
    );
}

/** Divider with section label */
function SectionLabel({ label }: { label: string }) {
    return (
        <div className="pt-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">{label}</span>
        </div>
    );
}

const TYPE_OPTIONS = [
    { value: "inline", exampleNode: <span><span className="text-muted-foreground/40">你</span><span className="rounded bg-primary/20 text-primary px-0.5">很累</span><span className="text-muted-foreground/40">啊</span></span> },
    { value: "block",  exampleNode: <span className="flex flex-col gap-0.5 leading-tight"><span className="text-primary/50">/旁白</span><span className="rounded bg-primary/10 text-foreground/70 px-1">場景文字</span></span> },
] as const;

const MATCH_MODES = [
    { id: "enclosure", example: "文字[內容]文字", sample: "「旁白」", descKey: "enclosureDesc" },
    { id: "prefix",    example: "#SE 內容", sample: "#SE 敲門聲", descKey: "prefixDesc" },
    { id: "range",     example: ">>SE\\n多行內容\\n<<SE", sample: ">>SE ... <<SE", descKey: "rangeDesc" },
    { id: "regex",     example: "/^SE:/", sample: "SE: 敲門", descKey: "regexDesc" },
] as const;

export function MarkerDetailEditor({ config, idx, updateMarker, readOnly = false, tracks = [], layoutConfig, onOpenFullLayoutEditor }: MarkerDetailEditorProps): React.JSX.Element {
    const { t } = useI18n();
    if (!config) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border/50 p-8">
                <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">{t("markerDetailEditor.selectRuleHint")}</p>
            </div>
        );
    }

    const [previewOpen, setPreviewOpen] = useState(false);
    const rawType = config.type === "block" || config.isBlock ? "block" : "inline";
    const matchMode = config.matchMode || "enclosure";
    const currentType = matchMode === "prefix" ? "inline" : rawType;
    const isBlock = currentType === "block";
    const enabledTracks = tracks.filter((tr) => tr.enabled).sort((a, b) => a.order - b.order);
    const availableTypeOptions = matchMode === "prefix"
        ? TYPE_OPTIONS.filter((opt) => opt.value === "inline")
        : TYPE_OPTIONS;


    const updateStyle = (field: string, value: string | undefined) => {
        const next = { ...(config.style || {}) } as Record<string, string>;
        if (value === undefined || value === "") delete next[field];
        else next[field] = value;
        updateMarker(idx, "style", next);
    };

    const updateMatchMode = (mode: typeof MATCH_MODES[number]["id"]) => {
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
        <div className="h-full flex flex-col overflow-hidden">
            {/* Compact header: name + badge + live preview inline, click to expand */}
            <button
                type="button"
                onClick={() => setPreviewOpen((o) => !o)}
                className="w-full px-4 py-2.5 border-b flex items-center gap-3 bg-muted/20 shrink-0 min-w-0 hover:bg-muted/30 transition-colors text-left"
            >
                <span className="text-sm font-semibold text-foreground truncate shrink-0 max-w-[120px]">{config.label || t("markerDetailEditor.unnamedMarker")}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                    {matchMode === "range"
                        ? t("markerDetailEditor.badgeRange")
                        : isBlock
                            ? t("markerDetailEditor.badgeBlock")
                            : t("markerDetailEditor.badgeInline")}
                </span>
                <div className="flex-1 min-w-0">
                    <MarkerPreview config={config} compact />
                </div>
                <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform", previewOpen && "rotate-180")} />
            </button>

            {/* Expanded preview panel */}
            {previewOpen && (
                <div className="border-b bg-background/60 px-4 py-3 shrink-0 space-y-3">
                    <MarkerPreview config={config} expanded />
                    {/* Column placement if tracks available */}
                    {enabledTracks.length > 0 && (
                        <div>
                            <div className="text-[10px] text-muted-foreground/40 mb-1">{t("markerDetailEditor.trackPreview")}</div>
                            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${enabledTracks.length}, minmax(0, 1fr))` }}>
                                {enabledTracks.map((track) => {
                                    const isTarget = config.v2TrackId ? config.v2TrackId === track.id : false;
                                    return (
                                        <div key={track.id} className={cn(
                                            "rounded border px-2 py-1 text-[9px] text-center",
                                            isTarget ? "border-primary/50 bg-primary/10 text-primary font-semibold" : "border-border/30 bg-muted/20 text-muted-foreground/40"
                                        )}>
                                            {track.name}
                                            {isTarget && <div className="mt-0.5 font-mono opacity-70">{config.label}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-2">

                {/* ── 基本資訊 ── */}
                <Row label={t("markerGeneral.name")}>
                    <Input
                        value={config.label || ""}
                        onChange={(e) => updateMarker(idx, "label", e.target.value)}
                        className={cn("h-7 text-sm", !config.label && "border-destructive")}
                    />
                </Row>

                <Row label={t("markerGeneral.type")}>
                    <div className="flex gap-1.5">
                        {availableTypeOptions.map((opt) => {
                            const isActive = currentType === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => updateMarker(idx, { type: opt.value, isBlock: opt.value === "block" })}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-left transition-all text-[11px] font-medium",
                                        isActive
                                            ? "border-primary bg-primary/8 text-primary ring-1 ring-primary/30"
                                            : "border-border/50 text-foreground/70 hover:border-border hover:bg-muted/20"
                                    )}
                                >
                                    <span className={cn("font-mono text-[9px] rounded px-1 py-0.5", isActive ? "bg-background/80" : "bg-muted/40")}>
                                        {opt.exampleNode}
                                    </span>
                                    {t(`markerGeneral.${opt.value}`)}
                                </button>
                            );
                        })}
                    </div>
                    {matchMode === "prefix" && (
                        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/60">
                            {t("markerLogic.prefixNoBlockHint")}
                        </p>
                    )}
                </Row>

                {/* ── 觸發方式 ── */}
                <SectionLabel label={t("markerDetailEditor.sectionTrigger")} />

                <Row label={t("markerLogic.matchMode")}>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {MATCH_MODES.map((mode) => {
                            const isActive = matchMode === mode.id;
                            return (
                                <button
                                    key={mode.id}
                                    type="button"
                                    onClick={() => updateMatchMode(mode.id)}
                                    className={cn(
                                        "rounded-md border p-2 text-left transition-colors",
                                        isActive
                                            ? "border-primary/60 bg-primary/10 text-primary"
                                            : "border-border/50 bg-background/60 text-foreground/75 hover:border-border hover:bg-muted/25"
                                    )}
                                >
                                    <span className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold">{t(`modeSelector.${mode.id}`)}</span>
                                        {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                                    </span>
                                    <span className="mt-1 block whitespace-pre-line font-mono text-[10px] text-muted-foreground">{mode.example}</span>
                                    <span className="mt-1 block text-[10px] leading-snug text-muted-foreground/70">{t(`modeSelector.${mode.descKey}`)}</span>
                                </button>
                            );
                        })}
                    </div>
                </Row>

                {/* 符號輸入：依 matchMode 顯示不同欄位 */}
                {matchMode === "regex" ? (
                    <Row label={t("markerLogic.regexLabel")}>
                        <Input
                            value={config.regex || ""}
                            onChange={(e) => updateMarker(idx, "regex", e.target.value)}
                            className={cn("h-7 font-mono text-xs", !config.regex && "border-destructive")}
                            placeholder={t("markerLogic.regexPlaceholder")}
                        />
                    </Row>
                ) : matchMode === "range" ? (
                    <>
                        <Row label={t("markerLogic.rangeSymbolPair")}>
                            <div className="rounded-md border border-border/50 bg-muted/15 p-2">
                                <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                        <div className="mb-1 text-[10px] text-muted-foreground">{t("markerLogic.rangeStartLabel")}</div>
                                        <Input
                                            value={config.start || ""}
                                            onChange={(e) => updateMarker(idx, "start", e.target.value)}
                                            className={cn("h-8 font-mono text-xs text-center", !config.start && "border-destructive")}
                                            placeholder=">>SE"
                                        />
                                    </div>
                                    <div>
                                        <div className="mb-1 text-[10px] text-muted-foreground">{t("markerLogic.rangeEndLabel")}</div>
                                        <Input
                                            value={config.end || ""}
                                            onChange={(e) => updateMarker(idx, "end", e.target.value)}
                                            className={cn("h-8 font-mono text-xs text-center", !config.end && "border-destructive")}
                                            placeholder="<<SE"
                                        />
                                    </div>
                                </div>
                                <div className="mt-2 rounded bg-background/70 px-2 py-1.5 font-mono text-[10px] leading-5 text-muted-foreground">
                                    <div><span className="text-primary">{config.start || ">>SE"}</span> <span>{t("markerLogic.rangePreviewStart")}</span></div>
                                    <div className="border-l border-primary/30 pl-2 text-foreground/70">{t("markerLogic.rangeContentHint")}</div>
                                    <div><span className="text-primary">{config.end || "<<SE"}</span> <span>{t("markerLogic.rangePreviewEnd")}</span></div>
                                </div>
                            </div>
                        </Row>
                        <Row label={t("markerLogic.enableColumnGrouping")}>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!config.enableColumnGrouping}
                                    onChange={(e) => updateMarker(idx, "enableColumnGrouping", e.target.checked || undefined)}
                                    className="h-3.5 w-3.5 rounded border-input text-primary"
                                />
                                <span className="text-xs text-muted-foreground">{t("markerLogic.enableColumnGroupingDesc")}</span>
                            </label>
                        </Row>
                    </>
                ) : (
                    <>
                        <Row label={matchMode === "prefix" ? t("markerLogic.prefixSymbolLabel") : t("markerLogic.symbolPair")}>
                            <div className="rounded-md border border-border/50 bg-muted/15 p-2">
                                {matchMode === "prefix" ? (
                                    <>
                                        <div className="grid grid-cols-[minmax(90px,0.8fr)_minmax(120px,1fr)] items-end gap-1.5">
                                            <div>
                                                <div className="mb-1 text-[10px] text-muted-foreground">{t("markerLogic.prefixSymbolLabel")}</div>
                                                <Input
                                                    value={config.start || ""}
                                                    onChange={(e) => updateMarker(idx, "start", e.target.value)}
                                                    className={cn("h-8 font-mono text-xs text-center", !config.start && "border-destructive")}
                                                    placeholder="#SE"
                                                />
                                            </div>
                                            <div className="rounded bg-background/70 px-2 py-2 font-mono text-[10px] text-muted-foreground">
                                                <span className="text-primary">{config.start || "#SE"}</span>
                                                <span> {t("markerLogic.prefixPreviewContent")}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-[minmax(70px,0.8fr)_minmax(90px,1fr)_minmax(70px,0.8fr)] items-center gap-1.5">
                                            <div>
                                                <div className="mb-1 text-[10px] text-muted-foreground">{t("markerLogic.startLabel")}</div>
                                                <Input
                                                    value={config.start || ""}
                                                    onChange={(e) => updateMarker(idx, "start", e.target.value)}
                                                    className={cn("h-8 font-mono text-xs text-center", !config.start && "border-destructive")}
                                                    placeholder="("
                                                />
                                            </div>
                                            <div className="pt-5 text-center text-[10px] text-muted-foreground/70">
                                                {t("markerLogic.enclosedContentHint")}
                                            </div>
                                            <div>
                                                <div className="mb-1 text-[10px] text-muted-foreground">{t("markerLogic.endLabel")}</div>
                                                <Input
                                                    value={config.end || ""}
                                                    onChange={(e) => updateMarker(idx, "end", e.target.value)}
                                                    className={cn("h-8 font-mono text-xs text-center", !config.end && "border-destructive")}
                                                    placeholder=")"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-2 rounded bg-background/70 px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                                            <span>{t("markerLogic.enclosurePreviewPrefix")}</span>
                                            <span className="text-primary">{config.start || "("}</span>
                                            <span>{t("markerLogic.enclosedPreviewContent")}</span>
                                            <span className="text-primary">{config.end || ")"}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </Row>
                    </>
                )}

                {/* 顯示樣板（非 regex） */}
                {matchMode !== "regex" && (
                    <Row label={t("markerLogic.template")}>
                        <Input
                            value={config.renderer?.template || ""}
                            onChange={(e) => {
                                const renderer = config.renderer || {};
                                updateMarker(idx, "renderer", { ...renderer, template: e.target.value });
                            }}
                            className="h-7 text-xs font-mono"
                            placeholder={t("markerLogic.templatePlaceholder")}
                        />
                    </Row>
                )}

                {/* ── 輸出位置（V2 欄位設定）── */}
                <SectionLabel label={t("markerDetailEditor.sectionOutput")} />

                <div className="py-2 border-b border-border/20">
                    {enabledTracks.length > 0 ? (
                        <>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-muted-foreground/50">{t("markerDetailEditor.trackPreview")}</span>
                            {onOpenFullLayoutEditor && (
                                <button
                                    type="button"
                                    onClick={onOpenFullLayoutEditor}
                                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Maximize2 className="h-2.5 w-2.5" />
                                    {t("markerDetailEditor.editLayout")}
                                </button>
                            )}
                        </div>
                        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${enabledTracks.length + 1}, minmax(0, 1fr))` }}>
                            <button
                                type="button"
                                onClick={() => updateMarker(idx, "v2TrackId", undefined)}
                                className={cn(
                                    "rounded border px-2 py-1 text-left text-[9px] transition-colors",
                                    !config.v2TrackId
                                        ? "border-primary/50 bg-primary/10 text-primary"
                                        : "border-border/30 bg-background/50 text-muted-foreground/50 hover:border-border hover:text-foreground"
                                )}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="font-semibold truncate">{t("markerLogic.trackAuto")}</span>
                                    {!config.v2TrackId && <Check className="h-3 w-3 shrink-0" />}
                                </div>
                                <div className="mt-0.5 text-[8px] leading-tight text-muted-foreground/60">{t("markerDetailEditor.trackAutoHint")}</div>
                            </button>
                            {enabledTracks.map((track) => {
                                const isTarget = config.v2TrackId ? config.v2TrackId === track.id : false;
                                return (
                                    <button
                                        key={track.id}
                                        type="button"
                                        onClick={() => updateMarker(idx, "v2TrackId", track.id)}
                                        className={cn(
                                            "rounded border px-2 py-1 text-left text-[9px] transition-colors",
                                            isTarget
                                                ? "border-primary/50 bg-primary/10 text-primary"
                                                : "border-border/30 bg-background/50 text-muted-foreground/50 hover:border-border hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="font-semibold truncate">{track.name}</span>
                                            {isTarget && <Check className="h-3 w-3 shrink-0" />}
                                        </div>
                                        <div className="mt-0.5 font-mono text-[8px] text-muted-foreground/60">{track.id}</div>
                                        {isTarget && (
                                            <div className="mt-0.5 rounded bg-primary/10 px-1 py-0.5 truncate font-mono">
                                                {config.label || config.id}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        </>
                    ) : (
                        <Input
                            value={String(config.v2TrackId || "")}
                            onChange={(e) => updateMarker(idx, "v2TrackId", e.target.value || undefined)}
                            className="h-7 text-xs font-mono"
                            placeholder="main / sfx / secondary"
                        />
                    )}
                </div>

                {/* ── 外觀樣式 ── */}
                <SectionLabel label={t("markerDetailEditor.sectionStyle")} />
                <MarkerStyleSettings config={config} idx={idx} updateMarker={updateMarker} />

                {/* ── 進階（折疊）── */}
                <details className="group mt-2">
                    <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors select-none">
                        <span>{t("markerDetailEditor.sectionAdvanced")}</span>
                        <span className="font-normal normal-case group-open:hidden">{t("markerDetailEditor.expand")}</span>
                        <span className="font-normal normal-case hidden group-open:inline">{t("markerDetailEditor.collapse")}</span>
                    </summary>
                    <div className="border-t border-border/20 pt-2 space-y-0">
                        <Row label={t("markerGeneral.priority")}>
                            <Input
                                type="number"
                                value={config.priority || 0}
                                onChange={(e) => updateMarker(idx, "priority", parseInt(e.target.value) || 0)}
                                className="h-7 max-w-[100px] text-xs text-center font-mono"
                            />
                        </Row>
                        {isBlock && matchMode !== "prefix" && (
                            <Row label={t("markerLogic.showEnd")}>
                                <input
                                    type="checkbox"
                                    checked={config.showEndLabel !== false}
                                    onChange={(e) => updateMarker(idx, "showEndLabel", e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-input text-primary"
                                />
                            </Row>
                        )}
                        {matchMode !== "regex" && (
                            <Row label={t("markerLogic.showDelimiters")}>
                                <input
                                    type="checkbox"
                                    checked={!!config.showDelimiters}
                                    onChange={(e) => updateMarker(idx, "showDelimiters", e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-input text-primary"
                                />
                            </Row>
                        )}
                        <MarkerAnalysisSettings config={config} idx={idx} updateMarker={updateMarker} />
                    </div>
                </details>

                <div className="pb-4" />
            </div>
        </div>
    );
}
