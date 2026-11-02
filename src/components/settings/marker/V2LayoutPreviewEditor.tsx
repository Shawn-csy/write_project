import React, { useCallback, useMemo } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Input } from "../../ui/input";
import { Switch } from "../../ui/switch";
import { Slider } from "../../ui/slider";
import { Button } from "../../ui/button";
import { EventTextV2 } from "../../renderer/v2/EventTextV2";
import { cn } from "../../../lib/utils";
import {
  applyMarkerSemanticRoutes,
  buildScriptDocumentV2FromAst,
  normalizeLayoutConfig,
  orchestrateDocument,
  type LayoutConfig,
  type ScriptEvent,
  type TrackConfig,
  type TrackRole,
} from "../../../lib/v2";
import type { MarkerConfig } from "../../../types/script";

const SAMPLE_AST = {
  type: "root",
  children: [
    {
      type: "speech",
      character: "角色 A",
      lineStart: 1,
      lineEnd: 1,
      children: [{ type: "dialogue", text: "這是對白範例文字，會出現在對白欄位。", lineStart: 1, lineEnd: 1 }],
    },
    { type: "layer", layerType: "rule-se-single", text: "SE: 門關上聲", lineStart: 2, lineEnd: 2 },
    {
      type: "speech",
      character: "角色 B",
      lineStart: 3,
      lineEnd: 3,
      children: [{ type: "dialogue", text: "這是副對白，通常在第二對白欄位。", lineStart: 3, lineEnd: 3 }],
    },
    { type: "layer", layerType: "rule-bg-start", text: "BGM: 背景音樂開始", lineStart: 4, lineEnd: 4 },
  ],
};

// Build a range-marker sample AST: start(L2) + mid dialogue(L3) + end(L4)
const buildRangeAst = (markerId: string, label: string) => ({
  type: "root",
  children: [
    {
      type: "speech",
      character: "角色 A",
      lineStart: 1,
      lineEnd: 1,
      children: [{ type: "dialogue", text: "這是對白範例文字，會出現在對白欄位。", lineStart: 1, lineEnd: 1 }],
    },
    { type: "layer", layerType: markerId, text: `${label} 開始`, lineStart: 2, lineEnd: 2 },
    {
      type: "speech",
      character: "角色 A",
      lineStart: 3,
      lineEnd: 3,
      children: [{ type: "dialogue", text: "範圍中的對白內容。", lineStart: 3, lineEnd: 3 }],
    },
    { type: "layer", layerType: markerId, text: `${label} 結束`, lineStart: 4, lineEnd: 4 },
    {
      type: "speech",
      character: "角色 B",
      lineStart: 5,
      lineEnd: 5,
      children: [{ type: "dialogue", text: "這是副對白，通常在第二對白欄位。", lineStart: 5, lineEnd: 5 }],
    },
  ],
});

interface V2LayoutPreviewEditorProps {
  layoutConfig: LayoutConfig;
  onChange: (config: LayoutConfig) => void;
  markerConfigs: MarkerConfig[];
  selectedConfig?: MarkerConfig | null;
  t: (key: string) => string;
}

const MIN_SHARE = 0.08;
const MAX_SHARE = 0.8;

// Neutral tints from tokens; alternating so neighbouring columns stay distinguishable.
const TRACK_TINTS = ["bg-primary/5", "bg-accent/10", "bg-muted/50"];
const TRACK_HEAD_TINTS = ["bg-primary/10", "bg-accent/15", "bg-muted"];

const weightOf = (track: TrackConfig): number => {
  const w = Number(track.desktopWidth);
  return Number.isFinite(w) && w > 0 ? w : 1;
};

/**
 * Column layout editor: a field list (name, visibility, width, order) beside a
 * read-only preview. Controls live in the list, never inside the narrow preview
 * columns, so it stays usable on phones.
 */
export function V2LayoutPreviewEditor({
  layoutConfig,
  onChange,
  markerConfigs,
  selectedConfig = null,
  t,
}: V2LayoutPreviewEditorProps): React.JSX.Element {
  const tr = useCallback((key: string, fallback: string) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  }, [t]);

  const config = useMemo(() => normalizeLayoutConfig(layoutConfig), [layoutConfig]);
  const tracks = useMemo(
    () => [...config.tracks].sort((a, b) => a.order - b.order),
    [config.tracks]
  );

  // Which sample line gets replaced when a marker is selected
  // L1 = speech (dialogue), L2 = sfx/layer
  const selectedLine = useMemo<number | null>(() => {
    if (!selectedConfig?.id) return null;
    const isDialogue = selectedConfig.v2EventKind === "speech"
      || (!selectedConfig.v2EventKind && selectedConfig.matchMode === "enclosure");
    return isDialogue ? 1 : 2;
  }, [selectedConfig]);

  const ast = useMemo(() => {
    if (!selectedConfig?.id || selectedLine === null) return SAMPLE_AST;
    const markerId = selectedConfig.id;
    const label = selectedConfig.label || markerId;
    const isRange = selectedConfig.matchMode === "range";
    if (isRange) return buildRangeAst(markerId, label);
    const sampleText = `${label} 範例`;
    const isDialogue = selectedLine === 1;
    const newChildren = SAMPLE_AST.children.map((node) => {
      if (isDialogue && node.type === "speech" && node.lineStart === 1) {
        return {
          ...node,
          character: label,
          markerId,
          children: node.children?.map((c) =>
            c.lineStart === 1 ? { ...c, text: sampleText, markerId } : c
          ),
        };
      }
      if (!isDialogue && node.type === "layer" && node.lineStart === 2) {
        return { ...node, layerType: markerId, text: sampleText };
      }
      return node;
    });
    return { ...SAMPLE_AST, children: newChildren };
  }, [selectedConfig, selectedLine]);

  const orchestrated = useMemo(() => {
    const effective = applyMarkerSemanticRoutes(normalizeLayoutConfig(layoutConfig), markerConfigs);
    const doc = buildScriptDocumentV2FromAst(ast, { layoutConfig: effective, markerConfigs });
    return orchestrateDocument(doc);
  }, [layoutConfig, markerConfigs, ast]);

  const enabledTracks = useMemo(() => tracks.filter((track) => track.enabled), [tracks]);

  const markerConfigById = useMemo(
    () => new Map(markerConfigs.filter((m) => m.id).map((m) => [m.id, m])),
    [markerConfigs]
  );

  const totalWeight = useMemo(
    () => enabledTracks.reduce((sum, track) => sum + weightOf(track), 0) || enabledTracks.length || 1,
    [enabledTracks]
  );
  const shareOf = useCallback((track: TrackConfig) => weightOf(track) / totalWeight, [totalWeight]);

  // Gutter + one column per enabled track; columns keep a readable minimum and the preview scrolls sideways.
  const templateColumns = `2rem ${enabledTracks.map((track) => `minmax(9rem, ${Math.max(0.12, shareOf(track)).toFixed(4)}fr)`).join(" ") || "minmax(9rem, 1fr)"}`;

  const lineRows = useMemo(() => {
    const rows = new Map<number, Map<string, ScriptEvent[]>>();
    let minLine = Infinity;
    let maxLine = 0;
    orchestrated.lanes.forEach((lane) => {
      lane.events.forEach((event) => {
        const line = Number.isFinite(event.lineSpan?.start) ? Number(event.lineSpan.start) : 1;
        minLine = Math.min(minLine, line);
        maxLine = Math.max(maxLine, line);
        if (!rows.has(line)) rows.set(line, new Map());
        const row = rows.get(line)!;
        row.set(lane.trackId, [...(row.get(lane.trackId) ?? []), event]);
      });
    });
    if (!Number.isFinite(minLine) || maxLine <= 0) return [];
    return Array.from({ length: maxLine - minLine + 1 }, (_, i) => ({
      line: minLine + i,
      eventsByTrackId: rows.get(minLine + i) ?? new Map<string, ScriptEvent[]>(),
    }));
  }, [orchestrated]);

  const emit = useCallback((next: LayoutConfig) => onChange(normalizeLayoutConfig(next)), [onChange]);

  const updateRowGrouping = useCallback((rowGrouping: LayoutConfig["rowGrouping"]) => {
    emit({ ...config, rowGrouping });
  }, [config, emit]);

  const updateTrack = useCallback((id: string, patch: Partial<TrackConfig>) => {
    emit({
      ...config,
      tracks: config.tracks.map((track) => (track.id === id ? { ...track, ...patch } : track)),
    });
  }, [config, emit]);

  const removeTrack = useCallback((id: string) => {
    if (config.tracks.length <= 1) return;
    const nextTracks = config.tracks.filter((track) => track.id !== id);
    emit({
      ...config,
      fallbackTrackId: config.fallbackTrackId === id
        ? nextTracks[0]?.id || config.fallbackTrackId
        : config.fallbackTrackId,
      tracks: nextTracks,
      routingRules: [],
    });
  }, [config, emit]);

  const addTrack = useCallback(() => {
    let n = config.tracks.length + 1;
    let id = `track-${n}`;
    while (config.tracks.some((track) => track.id === id)) { n += 1; id = `track-${n}`; }
    const maxOrder = config.tracks.reduce((max, track) => Math.max(max, Number(track.order) || 0), 0);
    emit({
      ...config,
      tracks: [
        ...config.tracks,
        {
          id,
          name: `欄位 ${n}`,
          role: "custom" as TrackRole,
          order: maxOrder + 10,
          enabled: true,
          desktopWidth: 0.25,
          mobileBehavior: "inline",
        },
      ],
    });
  }, [config, emit]);

  const moveTrack = useCallback((index: number, direction: -1 | 1) => {
    const a = tracks[index];
    const b = tracks[index + direction];
    if (!a || !b) return;
    emit({
      ...config,
      tracks: config.tracks.map((track) => {
        if (track.id === a.id) return { ...track, order: b.order };
        if (track.id === b.id) return { ...track, order: a.order };
        return track;
      }),
    });
  }, [tracks, config, emit]);

  // Set a column's share of the row; the other enabled columns keep their weights.
  const setShare = useCallback((track: TrackConfig, share: number) => {
    const others = enabledTracks.filter((item) => item.id !== track.id).reduce((sum, item) => sum + weightOf(item), 0);
    if (others <= 0) return;
    const clamped = Math.min(MAX_SHARE, Math.max(MIN_SHARE, share));
    updateTrack(track.id, { desktopWidth: parseFloat(((clamped * others) / (1 - clamped)).toFixed(3)) });
  }, [enabledTracks, updateTrack]);

  const groupingOptions: Array<{ value: LayoutConfig["rowGrouping"]; label: string; title: string; active: boolean }> = [
    { value: "line", label: t("appearance.dialogueRowNormal"), title: t("appearance.dialogueRowLayoutDesc"), active: config.rowGrouping !== "adjacent_dialogue" && config.rowGrouping !== "marker_dialogue" },
    { value: "adjacent_dialogue", label: t("appearance.dialogueRowSideBySide"), title: t("appearance.dialogueRowLayoutDesc"), active: config.rowGrouping === "adjacent_dialogue" },
    { value: "marker_dialogue", label: t("appearance.dialogueRowMarkerBased"), title: t("appearance.dialogueRowMarkerBasedDesc"), active: config.rowGrouping === "marker_dialogue" },
  ];

  return (
    <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      {/* Field list */}
      <section aria-label={tr("markerLayoutEditor.fields", "欄位")} className="min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-semibold">{tr("markerLayoutEditor.fields", "欄位")}</h3>
            <p className="text-xs text-muted-foreground">{tr("markerLayoutEditor.fieldsHint", "調整名稱、順序與寬度，右側即時預覽。")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-10 shrink-0 sm:h-8" onClick={addTrack} aria-label={t("appearance.addTrack")}>
            <Plus className="h-4 w-4" />
            {t("appearance.addTrack")}
          </Button>
        </div>

        <ul className="space-y-2">
          {tracks.map((track, index) => {
            const share = Math.round(shareOf(track) * 100);
            return (
              <li key={track.id} className={cn("rounded-[10px] border border-border bg-card p-3", !track.enabled && "opacity-70")}>
                <div className="flex items-center gap-2">
                  <Input
                    value={track.name}
                    onChange={(e) => updateTrack(track.id, { name: e.target.value })}
                    className="h-10 min-w-0 flex-1 text-sm font-medium sm:h-9"
                    aria-label={`${track.id} name`}
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={track.enabled}
                      onCheckedChange={(checked) => updateTrack(track.id, { enabled: checked })}
                      aria-label={`${track.name} enabled`}
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {track.enabled && enabledTracks.length > 1 ? (
                    <label className="flex min-w-[10rem] flex-1 items-center gap-2 text-xs text-muted-foreground">
                      <span className="shrink-0">{tr("markerLayoutEditor.width", "寬度")}</span>
                      <Slider
                        min={Math.round(MIN_SHARE * 100)}
                        max={Math.round(MAX_SHARE * 100)}
                        step={1}
                        value={[Math.min(Math.round(MAX_SHARE * 100), Math.max(Math.round(MIN_SHARE * 100), share))]}
                        onValueChange={([value]) => setShare(track, (value ?? share) / 100)}
                        aria-label={`${track.name} ${tr("markerLayoutEditor.width", "寬度")}`}
                      />
                      <span className="w-9 shrink-0 text-right tabular-nums text-foreground">{share}%</span>
                    </label>
                  ) : (
                    <span className="flex-1 text-xs text-muted-foreground">
                      {track.enabled ? tr("markerLayoutEditor.onlyColumn", "唯一的顯示欄位，寬度自動填滿。") : tr("markerLayoutEditor.hidden", "已隱藏，不會出現在預覽與閱讀頁。")}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8" disabled={index === 0} onClick={() => moveTrack(index, -1)} aria-label={`${track.name} ${tr("markerLayoutEditor.moveUp", "上移")}`}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8" disabled={index === tracks.length - 1} onClick={() => moveTrack(index, 1)} aria-label={`${track.name} ${tr("markerLayoutEditor.moveDown", "下移")}`}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    {tracks.length > 1 ? (
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive sm:h-8 sm:w-8" onClick={() => removeTrack(track.id)} aria-label={`${track.name} remove`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">{tr("markerLayoutEditor.rowGrouping", "對白排列")}</div>
          <div role="radiogroup" aria-label={tr("markerLayoutEditor.rowGrouping", "對白排列")} className="grid grid-cols-3 gap-0.5 rounded-lg bg-muted p-[3px]">
            {groupingOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={option.active}
                title={option.title}
                onClick={() => updateRowGrouping(option.value)}
                className={cn(
                  "min-h-10 rounded-md px-1.5 text-xs transition-colors sm:min-h-8",
                  option.active ? "bg-background font-semibold text-foreground shadow-[0_0_0_1px_hsl(var(--border))]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Preview */}
      <section aria-label={tr("markerLayoutEditor.preview", "預覽")} className="min-w-0 lg:sticky lg:top-3">
        <h3 className="mb-2 text-[15px] font-semibold">{tr("markerLayoutEditor.preview", "預覽")}</h3>
        {enabledTracks.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {tr("markerLayoutEditor.noEnabled", "沒有顯示中的欄位，開啟左側任一欄位即可預覽。")}
          </div>
        ) : (
          <div className="marker-test-paper overflow-x-auto rounded-[10px] border border-border">
            <div className="min-w-max">
              <div className="grid border-b border-border" style={{ gridTemplateColumns: templateColumns }}>
                <div className="border-r border-border bg-muted" />
                {enabledTracks.map((track, idx) => (
                  <div key={track.id} className={cn("truncate border-r border-border px-2 py-1.5 text-xs font-semibold last:border-r-0", TRACK_HEAD_TINTS[idx % TRACK_HEAD_TINTS.length])} title={track.name}>
                    {track.name}
                  </div>
                ))}
              </div>
              <div className="divide-y divide-border/60">
                {lineRows.map((row) => {
                  const isRange = selectedConfig?.matchMode === "range";
                  const isMarkerRow = selectedLine !== null && (
                    isRange ? (row.line === 2 || row.line === 4) : row.line === selectedLine
                  );
                  const isRangeInside = isRange && row.line === 3;
                  const isRangeStart = isRange && row.line === 2;
                  const isRangeEnd = isRange && row.line === 4;
                  return (
                    <div key={row.line} className={cn("grid", isMarkerRow && "bg-primary/5")} style={{ gridTemplateColumns: templateColumns }}>
                      <div className={cn("flex min-h-[2rem] items-start justify-center border-r border-border/60 bg-muted/40 pt-2", isMarkerRow && "bg-primary/10")}>
                        <span className={cn("font-mono text-[10px]", isMarkerRow ? "font-bold text-primary" : "text-muted-foreground")}>
                          {isMarkerRow ? "▶" : `L${row.line}`}
                        </span>
                      </div>
                      {enabledTracks.map((track, idx) => {
                        const events = row.eventsByTrackId.get(track.id) ?? [];
                        const selectedMarkerTrackId = selectedConfig?.v2TrackId;
                        const isRangeMarkerTrack = isRange && selectedMarkerTrackId
                          ? track.id === selectedMarkerTrackId
                          : isRange && events.some((e) => e.markerId === selectedConfig?.id);
                        const rangeInsideFill = isRangeInside && isRangeMarkerTrack;
                        const selectedMarkerStyle = selectedConfig?.style && typeof selectedConfig.style === "object"
                          ? selectedConfig.style as React.CSSProperties
                          : undefined;
                        return (
                          <div
                            key={`${row.line}-${track.id}`}
                            className={cn(
                              "min-h-[2rem] min-w-0 border-r border-border/60 px-2 py-1.5 last:border-r-0",
                              !isRangeMarkerTrack && TRACK_TINTS[idx % TRACK_TINTS.length],
                              events.length === 0 && !rangeInsideFill && "opacity-0"
                            )}
                            style={rangeInsideFill && selectedMarkerStyle?.backgroundColor
                              ? { backgroundColor: selectedMarkerStyle.backgroundColor, opacity: 0.4 }
                              : undefined}
                          >
                            {events.map((event) => {
                              const mCfg = event.markerId ? markerConfigById.get(String(event.markerId)) : undefined;
                              const rawStyle = mCfg?.style && typeof mCfg.style === "object" ? mCfg.style as React.CSSProperties : undefined;
                              const rangeStyle: React.CSSProperties | undefined = rawStyle && isRange && event.markerId === selectedConfig?.id ? {
                                ...rawStyle,
                                borderRadius: isRangeStart ? "4px 4px 0 0" : isRangeEnd ? "0 0 4px 4px" : "0",
                                marginBottom: isRangeStart ? 0 : undefined,
                                marginTop: isRangeEnd ? 0 : undefined,
                              } : rawStyle;
                              return (
                                <div key={event.id} className="min-w-0 break-words px-1 text-xs leading-relaxed" style={rangeStyle}>
                                  {event.speakerId ? <span className="mr-1 text-[10px] text-muted-foreground">{event.speakerId}</span> : null}
                                  <EventTextV2
                                    text={event.text}
                                    markerConfigs={markerConfigs}
                                    hiddenMarkerIds={[]}
                                    markerTooltipPrefix="標記"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground lg:hidden">{tr("markerLayoutEditor.scrollHint", "預覽可左右滑動查看所有欄位。")}</p>
      </section>
    </div>
  );
}
