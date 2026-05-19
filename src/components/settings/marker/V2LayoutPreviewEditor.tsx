import React, { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Share2, Settings2, Trash2 } from "lucide-react";
import { Input } from "../../ui/input";
import { Switch } from "../../ui/switch";
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
import type { MarkerThemeApi } from "../../../types/api";

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

interface ThemeBarProps {
  markerThemes: MarkerThemeApi[];
  currentThemeId: string;
  switchTheme: (id: string) => void;
  onNew: () => void;
  onDelete: () => void;
  onShare: () => void;
  onMore: () => void;
  canDelete: boolean;
  isPublic?: boolean;
  currentUser?: { uid?: string } | null;
}

interface V2LayoutPreviewEditorProps {
  layoutConfig: LayoutConfig;
  onChange: (config: LayoutConfig) => void;
  markerConfigs: MarkerConfig[];
  selectedConfig?: MarkerConfig | null;
  t: (key: string) => string;
  themeBar?: ThemeBarProps;
}

export function V2LayoutPreviewEditor({
  layoutConfig,
  onChange,
  markerConfigs,
  selectedConfig = null,
  t,
  themeBar,
}: V2LayoutPreviewEditorProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Only enabled tracks appear in the preview grid
  const enabledTracks = useMemo(() => tracks.filter((t) => t.enabled), [tracks]);

  const markerConfigById = useMemo(
    () => new Map(markerConfigs.filter((m) => m.id).map((m) => [m.id, m])),
    [markerConfigs]
  );

  // Compute widths as fractions (normalized) for CSS grid
  const widths = useMemo(() => {
    if (enabledTracks.length === 0) return [];
    const raw = enabledTracks.map((t) => {
      const w = Number(t.desktopWidth);
      return Number.isFinite(w) && w > 0 ? w : 1;
    });
    const total = raw.reduce((s, w) => s + w, 0) || enabledTracks.length;
    return raw.map((w) => w / total);
  }, [enabledTracks]);

  const trackColumns = widths.length > 0
    ? widths.map((r) => `minmax(0, ${Math.max(0.12, r).toFixed(4)}fr)`).join(" ")
    : "minmax(0, 1fr)";
  // Full grid: line-number gutter + track columns
  const templateColumns = `32px ${trackColumns}`;

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

  const updateTrack = useCallback((id: string, patch: Partial<TrackConfig>) => {
    emit({
      ...config,
      tracks: config.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  }, [config, emit]);

  const removeTrack = useCallback((id: string) => {
    if (config.tracks.length <= 1) return;
    const nextTracks = config.tracks.filter((t) => t.id !== id);
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
    while (config.tracks.some((t) => t.id === id)) { n += 1; id = `track-${n}`; }
    const maxOrder = config.tracks.reduce((max, t) => Math.max(max, Number(t.order) || 0), 0);
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

  // Drag-resize handler between columns
  // dragIndex = index of left column being resized
  const handleResizeDragStart = useCallback((dragIndex: number, startX: number) => {
    const startWidths = widths.slice();
    const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 800;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dRatio = dx / containerWidth;
      const leftIdx = dragIndex;
      const rightIdx = dragIndex + 1;
      const minRatio = 0.08;
      const newLeft = Math.max(minRatio, startWidths[leftIdx] + dRatio);
      const newRight = Math.max(minRatio, startWidths[rightIdx] - dRatio);
      // convert fractions back to absolute desktopWidth values
      const total = enabledTracks.reduce((s, t) => {
        const w = Number(t.desktopWidth);
        return s + (Number.isFinite(w) && w > 0 ? w : 1);
      }, 0) || enabledTracks.length;
      const updatedTracks = config.tracks.map((t) => {
        if (t.id === enabledTracks[leftIdx]?.id) return { ...t, desktopWidth: parseFloat((newLeft * total).toFixed(3)) };
        if (t.id === enabledTracks[rightIdx]?.id) return { ...t, desktopWidth: parseFloat((newRight * total).toFixed(3)) };
        return t;
      });
      emit({ ...config, tracks: updatedTracks });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [widths, enabledTracks, config, emit]);

  // Track colors for visual distinction
  const TRACK_COLORS = [
    "bg-blue-500/8 border-blue-500/20",
    "bg-violet-500/8 border-violet-500/20",
    "bg-emerald-500/8 border-emerald-500/20",
    "bg-amber-500/8 border-amber-500/20",
    "bg-rose-500/8 border-rose-500/20",
    "bg-cyan-500/8 border-cyan-500/20",
  ];
  const TRACK_HEADER_COLORS = [
    "bg-blue-500/15",
    "bg-violet-500/15",
    "bg-emerald-500/15",
    "bg-amber-500/15",
    "bg-rose-500/15",
    "bg-cyan-500/15",
  ];

  return (
    <div className="border-b border-border/40 bg-background/30 shrink-0">
      {/* Combined header: theme bar + collapse toggle */}
      <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/10 transition-colors">
        {themeBar ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-xs text-muted-foreground shrink-0">{t("markerThemeHeader.currentTheme")}</span>
            <select
              className="h-7 flex-1 min-w-0 rounded border border-input bg-background px-2 text-xs"
              value={themeBar.currentThemeId}
              onChange={(e) => themeBar.switchTheme(e.target.value)}
            >
              {themeBar.markerThemes.map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.id === "default" ? "系統預設" : (theme.name || theme.id)}</option>
              ))}
            </select>
            <button type="button" onClick={themeBar.onNew} className="shrink-0 grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground" title={t("markerThemeHeader.newTheme")}>
              <Plus className="h-3 w-3" />
            </button>
            {themeBar.currentUser && (
              <button type="button" onClick={themeBar.onShare} className={cn("shrink-0 grid h-6 w-6 place-items-center rounded hover:bg-muted/60", themeBar.isPublic ? "text-sky-500" : "text-muted-foreground hover:text-foreground")} title={themeBar.isPublic ? t("markerThemeHeader.publicTitleOn") : t("markerThemeHeader.publicTitleOff")}>
                <Share2 className="h-3 w-3" />
              </button>
            )}
            <button type="button" onClick={themeBar.onMore} className="shrink-0 grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground" title={t("markerThemeHeader.moreSettings")}>
              <Settings2 className="h-3 w-3" />
            </button>
            {themeBar.canDelete && (
              <button type="button" onClick={themeBar.onDelete} className="shrink-0 grid h-6 w-6 place-items-center rounded text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive" title={t("markerThemeHeader.delete")}>
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : <div className="flex-1" />}
        <button
          type="button"
          onClick={() => setCollapsed((p) => !p)}
          className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <span>{collapsed ? t("appearance.trackPreviewExpand") : t("appearance.trackPreviewCollapse")}</span>
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {/* Main preview+edit grid */}
          <div
            ref={containerRef}
            className="overflow-hidden rounded-md border border-border/50 select-none"
          >
            {/* Column headers with resize handles */}
            <div
              className="grid"
              style={{ gridTemplateColumns: templateColumns }}
            >
              {/* Gutter header placeholder */}
              <div className="border-r border-border/30 bg-muted/10" />
              {enabledTracks.map((track, idx) => (
                  <div
                    key={track.id}
                    className={cn(
                      "relative px-2 pt-2 pb-1.5 border-r last:border-r-0 border-border/30",
                      TRACK_HEADER_COLORS[idx % TRACK_HEADER_COLORS.length]
                    )}
                  >
                    {/* Name + controls row */}
                    <div className="flex items-center gap-1 mb-1">
                      <Input
                        value={track.name}
                        onChange={(e) => updateTrack(track.id, { name: e.target.value })}
                        className="h-6 flex-1 min-w-0 text-xs font-semibold border-0 bg-transparent focus:bg-background/60 focus:border focus:border-border/40 p-0 px-1"
                        aria-label={`${track.id} name`}
                      />
                      <Switch
                        checked={track.enabled}
                        onCheckedChange={(checked) => updateTrack(track.id, { enabled: checked })}
                        className="h-4 w-7 shrink-0 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
                        aria-label={`${track.name} enabled`}
                      />
                      {tracks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTrack(track.id)}
                          className="shrink-0 grid h-5 w-5 place-items-center rounded text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`${track.name} remove`}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                    {/* Resize handle on right edge (not last) */}
                    {idx < enabledTracks.length - 1 && (
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/40 active:bg-primary/60 z-10 translate-x-px"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          handleResizeDragStart(idx, e.clientX);
                        }}
                      />
                    )}
                  </div>
                ))}
            </div>

            {/* Preview rows */}
            <div className="divide-y divide-border/20">
              {lineRows.map((row) => {
                const isRange = selectedConfig?.matchMode === "range";
                // range: lines 2 and 4 are the marker rows; line 3 is the "inside" content
                const isMarkerRow = selectedLine !== null && (
                  isRange ? (row.line === 2 || row.line === 4) : row.line === selectedLine
                );
                const isRangeInside = isRange && row.line === 3;
                return (
                <div
                  key={row.line}
                  className={cn(
                    "grid",
                    isMarkerRow && "ring-1 ring-inset ring-primary/50 bg-primary/5",
                    isRangeInside && "bg-primary/3"
                  )}
                  style={{ gridTemplateColumns: templateColumns }}
                >
                  {/* Line number gutter */}
                  <div className={cn("border-r border-border/20 bg-muted/5 flex items-start justify-center pt-2 min-h-[2rem]", isMarkerRow && "bg-primary/10")}>
                    <span className={cn("text-[10px] font-mono", isMarkerRow ? "text-primary font-bold" : "text-muted-foreground/50")}>
                      {isMarkerRow ? "▶" : `L${row.line}`}
                    </span>
                  </div>
                  {enabledTracks.map((track, idx) => {
                    const events = row.eventsByTrackId.get(track.id) ?? [];
                    return (
                      <div
                        key={`${row.line}-${track.id}`}
                        className={cn(
                          "px-2 py-1.5 border-r last:border-r-0 border-border/20 min-h-[2rem]",
                          TRACK_COLORS[idx % TRACK_COLORS.length],
                          events.length === 0 && "opacity-0"
                        )}
                      >
                        {events.map((event) => {
                          const mCfg = event.markerId ? markerConfigById.get(String(event.markerId)) : undefined;
                          const mStyle = mCfg?.style && typeof mCfg.style === "object" ? mCfg.style as React.CSSProperties : undefined;
                          return (
                            <div
                              key={event.id}
                              className="text-xs leading-relaxed rounded px-1"
                              style={mStyle}
                            >
                              {event.speakerId
                                ? <span className="text-muted-foreground text-[10px] mr-1">{event.speakerId}</span>
                                : null
                              }
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

          {/* Disabled tracks row */}
          {tracks.filter((t) => !t.enabled).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tracks.filter((t) => !t.enabled).map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-1.5 rounded border border-border/30 bg-muted/20 px-2 py-1 text-xs text-muted-foreground"
                >
                  <span>{track.name}</span>
                  <span className="font-mono text-[10px] opacity-60">({track.id})</span>
                  <Switch
                    checked={false}
                    onCheckedChange={() => updateTrack(track.id, { enabled: true })}
                    className="h-4 w-7 shrink-0 [&>span]:h-3 [&>span]:w-3"
                    aria-label={`${track.name} enabled`}
                  />
                  {tracks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTrack(track.id)}
                      className="grid h-4 w-4 place-items-center rounded text-muted-foreground/60 hover:text-destructive"
                      aria-label={`${track.name} remove`}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add track button */}
          <button
            type="button"
            onClick={addTrack}
            className="flex items-center gap-1.5 h-7 px-2 rounded border border-dashed border-border/50 text-xs text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30 transition-colors w-full justify-center"
            aria-label={t("appearance.addTrack")}
          >
            <Plus className="h-3 w-3" />
            <span>{t("appearance.addTrack")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
