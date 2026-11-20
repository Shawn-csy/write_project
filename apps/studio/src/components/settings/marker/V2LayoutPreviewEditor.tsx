import { previewMarkerConfigs } from "./markerPreviewColors";
import React, { useCallback, useMemo } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Input } from "../../ui/input";
import { Switch } from "../../ui/switch";
import { Button } from "../../ui/button";
import {
  applyMarkerSemanticRoutes,
  buildScriptDocumentV2FromAst,
  normalizeLayoutConfig,
  orchestrateDocument,
  type LayoutConfig,
  ColumnsPresentationRenderer,
  type TrackConfig,
  type TrackRole,
} from "../../../lib/v2";
import type { MarkerConfig } from "../../../types/script";

function layoutSample(selected: MarkerConfig | null, range?: MarkerConfig) {
  const speech = (character: string, text: string, line: number, markerId?: string) => ({
    type: "speech", character, children: [{ type: "dialogue", markerId, text, lineStart: line, lineEnd: line }],
  });
  const spoken = selected?.v2EventKind === "speech" || selected?.parseAs === "dialogue";
  const dialogue = {
    type: "dual_dialogue",
    left: [speech("小雨", spoken ? String(selected?.label || "對白") + "。" : "你聽見了嗎？", 2, spoken ? selected?.id : undefined)],
    right: [speech("阿岑", "是窗外的雨。", 3)],
  };
  const layer = (id: string, text: string, line: number) => ({
    type: "layer", layerType: id, text, lineStart: line, lineEnd: line,
  });
  const cue = selected && !spoken && selected.matchMode !== "range" ? selected : null;
  const start = layer(cue?.id || "rule-se-single", cue ? String(cue.label || cue.id) : "門鎖輕響", 1);
  const end = layer("rule-bg-start", "遠處傳來音樂", 4);
  if (!range) return { children: [start, dialogue, end] };
  return { children: [{
    type: "range", markerId: range.id, startNode: layer(range.id, String(range.label || "雨聲"), 1),
    children: [dialogue], endNode: layer(range.id, "漸弱", 4),
  }] };
}

interface V2LayoutPreviewEditorProps {
  layoutConfig: LayoutConfig;
  onChange: (config: LayoutConfig) => void;
  markerConfigs: MarkerConfig[];
  selectedConfig?: MarkerConfig | null;
  t: (key: string) => string;
}

const MIN_SHARE = 0.08;
const MAX_SHARE = 0.8;

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
  markerConfigs: sourceConfigs,
  selectedConfig = null,
  t,
}: V2LayoutPreviewEditorProps): React.JSX.Element {
  const markerConfigs = useMemo(() => previewMarkerConfigs(sourceConfigs), [sourceConfigs]);
  const tr = useCallback((key: string, fallback: string) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  }, [t]);

  const config = useMemo(() => normalizeLayoutConfig(layoutConfig), [layoutConfig]);
  const tracks = useMemo(
    () => [...config.tracks].sort((a, b) => a.order - b.order),
    [config.tracks]
  );

  const ast = useMemo(() => {
    const range = selectedConfig?.matchMode === "range" ? selectedConfig
      : config.rowGrouping === "marker_dialogue" && !selectedConfig
        ? markerConfigs.find(rule => rule.matchMode === "range" && (rule.v2SyncRows || rule.enableColumnGrouping))
        : undefined;
    return layoutSample(selectedConfig, range);
  }, [selectedConfig, config.rowGrouping, markerConfigs]);

  const orchestrated = useMemo(() => {
    const effective = applyMarkerSemanticRoutes(normalizeLayoutConfig(layoutConfig), markerConfigs);
    const doc = buildScriptDocumentV2FromAst(ast, { layoutConfig: effective, markerConfigs });
    return orchestrateDocument(doc);
  }, [layoutConfig, markerConfigs, ast]);

  const enabledTracks = useMemo(() => tracks.filter((track) => track.enabled), [tracks]);

  const totalWeight = useMemo(
    () => enabledTracks.reduce((sum, track) => sum + weightOf(track), 0) || enabledTracks.length || 1,
    [enabledTracks]
  );
  const shareOf = useCallback((track: TrackConfig) => weightOf(track) / totalWeight, [totalWeight]);

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

  const groupingOptions = [
    { value: "line", label: t("appearance.dialogueRowNormal") },
    { value: "adjacent_dialogue", label: t("appearance.dialogueRowSideBySide") },
    { value: "marker_dialogue", label: t("appearance.dialogueRowMarkerBased") },
  ];

  return (
    <div className="space-y-5 p-3 sm:p-5">
      <section aria-label={tr("markerLayoutEditor.fields", "欄位")} className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{tr("markerLayoutEditor.fields", "欄位")}</h3>
          <Button type="button" variant="outline" size="sm" onClick={addTrack}>
            <Plus className="h-4 w-4" />{t("appearance.addTrack")}
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="marker-track-table w-full text-start text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground"><tr>
              {["name", "width", "visible", "order"].map(key => <th key={key} scope="col">{t(`markerLayoutEditor.${key}`)}</th>)}
            </tr></thead>
            <tbody>{tracks.map((track, index) => {
              const share = Math.round(shareOf(track) * 100);
              return <tr key={track.id} className="border-t border-border">
                <td><Input aria-label={`${track.name} · ${t("markerLayoutEditor.name")}`} value={track.name}
                  onChange={e => updateTrack(track.id, { name: e.target.value })} className="h-8 min-w-0 bg-background text-sm" /></td>
                <td>{track.enabled && enabledTracks.length > 1 ? (
                  <label className="flex items-center gap-2">
                    <input type="range" min={MIN_SHARE * 100} max={MAX_SHARE * 100} value={share} step={1}
                      aria-label={`${track.name} · ${t("markerLayoutEditor.width")}`} aria-valuetext={`${share}%`}
                      className="h-8 w-full min-w-0 accent-primary" onChange={e => setShare(track, Number(e.target.value) / 100)} />
                    <span className="w-9 shrink-0 text-end text-xs tabular-nums">{share}%</span>
                  </label>
                ) : <span className="text-xs text-muted-foreground">{track.enabled ? "100%" : "—"}</span>}</td>
                <td><Switch checked={track.enabled} aria-label={`${track.name} · ${t("markerLayoutEditor.visible")}`}
                  onCheckedChange={enabled => updateTrack(track.id, { enabled })} /></td>
                <td><div className="flex items-center">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0}
                    aria-label={`${track.name} ${tr("markerLayoutEditor.moveUp", "上移")}`} onClick={() => moveTrack(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === tracks.length - 1}
                    aria-label={`${track.name} ${tr("markerLayoutEditor.moveDown", "下移")}`} onClick={() => moveTrack(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={tracks.length <= 1}
                    aria-label={`${t("common.remove")} · ${track.name}`} onClick={() => removeTrack(track.id)}><Trash2 className="h-4 w-4" /></Button>
                </div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </section>
      <section aria-label={tr("markerLayoutEditor.preview", "預覽")} className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{tr("markerLayoutEditor.preview", "預覽")}</h3>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {t("markerLayoutEditor.rowGrouping")}
            <select value={config.rowGrouping || "line"} className="h-8 rounded-md border border-input bg-background px-2 text-foreground"
              onChange={event => updateRowGrouping(event.target.value as LayoutConfig["rowGrouping"])}>
              {groupingOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="marker-preview-surface overflow-x-auto rounded-lg border border-border">
          {enabledTracks.length ? <div style={{ minWidth: `calc(2rem + ${enabledTracks.length * 7}rem)` }}>
            <ColumnsPresentationRenderer doc={orchestrated} markerConfigs={markerConfigs} fontSize={14} />
          </div> : <p className="p-4 text-sm text-muted-foreground">{t("markerLayoutEditor.noEnabled")}</p>}
        </div>
      </section>
    </div>
  );
}
