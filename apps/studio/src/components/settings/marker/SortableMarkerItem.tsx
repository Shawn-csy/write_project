import { ChevronDown, Ellipsis, GripVertical, Trash2 } from "lucide-react";
import { memo, useId, useState, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { useI18n } from "../../../contexts/I18nContext";
import { readProductionWordRule, type ProductionMarkerMapping } from "../../../lib/productionScriptExport";
import { cn } from "../../../lib/utils";
import type { MarkerConfig } from "../../../types/script";
import type { LayoutConfig } from "../../../lib/v2";
import type { UpdateMarkerFn } from "./types";
import { MarkerOutputPreview } from "./MarkerOutputPreview";
import { MarkerReadingExcerpt } from "./MarkerReadingExcerpt";
import { MarkerWordSettings } from "./MarkerWordSettings";
import { getMarkerStudioSample, readMarkerStudioSample, storeMarkerStudioSample } from "./markerStudioSample";

interface SortableMarkerItemProps {
  layoutConfig?: LayoutConfig;
  usePresentationRenderer?: boolean;
  id: string;
  config: MarkerConfig;
  idx: number;
  mapping: ProductionMarkerMapping;
  markerConfigs: MarkerConfig[];
  updateMarker: UpdateMarkerFn;
  onSelect: (id: string) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
}

function CellEditor({ label, preview, children }: { label: string; preview: ReactNode; children: ReactNode }) {
  const valueId = useId();
  return <Popover>
    <div className="marker-cell-editor">
      <div id={valueId} className="marker-cell-value" inert>{preview}</div>
      <PopoverTrigger asChild>
        <button type="button" className="marker-cell-trigger" aria-describedby={valueId} aria-label={label} title={label}>
          <ChevronDown className="ms-auto h-3 w-3 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
    </div>
    <PopoverContent align="start" aria-label={label} className="grid max-h-[65dvh] w-80 max-w-[92vw] gap-3 overflow-auto">
      {children}
    </PopoverContent>
  </Popover>;
}

export const SortableMarkerItem = memo(function SortableMarkerItem({
  layoutConfig, usePresentationRenderer, id, config, idx, mapping, markerConfigs, updateMarker, onSelect, onRemove, readOnly = false,
}: SortableMarkerItemProps) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: readOnly });
  const name = config.label || t("markerDetailEditor.unnamedMarker");
  const label = (key: string) => t(key) + " · " + name;
  const target = readProductionWordRule(config).target ?? mapping[id];
  const generated = getMarkerStudioSample(config, t, target);
  const [customSample, setCustomSample] = useState(() => readMarkerStudioSample(id));
  const sample = customSample ?? generated;
  const changeSample = (text: string | null) => {
    setCustomSample(text);
    storeMarkerStudioSample(id, text);
  };
  const symbol = config.matchMode === "regex" ? config.regex : [config.start, config.pause, config.end].filter(Boolean).join(" … ");
  const canMap = config.matchMode !== "virtual" && Boolean(config.start || config.regex);
  const enabledTracks = layoutConfig?.tracks.filter(track => track.enabled).sort((a, b) => a.order - b.order) ?? [];
  const previewProps = { text: sample, markerConfigs, mapping, layoutConfig, usePresentationRenderer };
  const multiline = config.matchMode === "range" || sample.includes("\n");
  return <tr ref={setNodeRef} className={cn("group", isDragging && "relative z-10 opacity-80")}
    style={{ transform: CSS.Translate.toString(transform), transition }}>
    <th scope="row">
      <div className="flex min-w-0 items-center">
        {!readOnly && <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners}
          className="shrink-0 cursor-grab touch-none rounded px-0.5 py-1 text-muted-foreground active:cursor-grabbing"
          aria-label={label("markerStudio.reorderRule")}><GripVertical className="h-4 w-4" /></button>}
        <button type="button" id={`marker-rule-${id}`} title={name} onClick={() => onSelect(id)}
          className="truncate rounded px-1 py-1 text-start font-medium hover:text-primary">{name}</button>
        {!readOnly && <DropdownMenu><DropdownMenuTrigger asChild>
          <button type="button" aria-label={label("markerStudio.ruleActions")} title={t("markerStudio.ruleActions")}
            className="ms-auto grid h-8 w-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
            <Ellipsis className="h-4 w-4" /></button>
        </DropdownMenuTrigger><DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => onSelect(id)}>{t("markerStudio.editRule")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onRemove(idx)} className="text-destructive"><Trash2 className="me-2 h-4 w-4" />{t("markerStudio.deleteRule")}</DropdownMenuItem>
        </DropdownMenuContent></DropdownMenu>}
      </div>
    </th>
    <td>
      {config.matchMode === "prefix" && !readOnly
        ? <input className="marker-cell-input font-mono" aria-label={label("markerStudio.sourceSymbol")}
            value={config.start ?? ""} onChange={e => updateMarker(idx, "start", e.target.value)} />
        : !readOnly && ["enclosure", "range", "regex"].includes(config.matchMode ?? "enclosure")
          ? <CellEditor label={label("markerStudio.sourceSymbol")} preview={<code>{symbol || "—"}</code>}>
            {(config.matchMode === "regex" ? [["regex", "markerLogic.regexLabel"]] : [
              ["start", "markerLogic.startLabel"],
              ...(config.matchMode === "range" ? [["pause", "stepSymbolConfig.pauseSymbol"]] : []),
              ["end", "markerLogic.endLabel"],
            ]).map(([field, key]) => <label key={field} className="grid gap-1 text-sm">{t(key)}
              <input className="rounded border bg-background p-2 font-mono" value={String(config[field] ?? "")}
                onChange={e => updateMarker(idx, field, e.target.value)} />
            </label>)}
          </CellEditor>
          : <span className="block truncate font-mono" title={symbol}>{symbol || "—"}</span>}
    </td>
    <td>
      {multiline ? <CellEditor label={label("markerStudio.testInput")} preview={sample.replace(/\n/g, " ↵ ") || "—"}>
        <label className="grid gap-1 text-sm">{t("markerStudio.testInput")}
          <textarea className="rounded border bg-background p-2 font-mono" rows={5} value={sample} onChange={e => changeSample(e.target.value)} />
        </label>
        {customSample !== null && <button type="button" onClick={() => changeSample(null)}>{t("markerStudio.resetSample")}</button>}
      </CellEditor> : <input className="marker-cell-input font-mono" aria-label={label("markerStudio.testInput")}
        value={sample} onChange={e => changeSample(e.target.value)} placeholder={t("markerStudio.testInput")} />}
    </td>
    <td><CellEditor label={label("markerStudio.wordResult")} preview={<MarkerOutputPreview {...previewProps} mode="word" compact />}>
      {!readOnly && canMap && <MarkerWordSettings config={config} idx={idx} updateMarker={updateMarker} target={target} />}
      <MarkerOutputPreview {...previewProps} mode="word" />
    </CellEditor></td>
    <td><CellEditor label={label("markerStudio.readingPreview")} preview={usePresentationRenderer
      ? <div className="marker-preview-surface"><MarkerReadingExcerpt text={sample} configs={markerConfigs} layout={layoutConfig} /></div>
      : <MarkerOutputPreview {...previewProps} mode="reader" compact />}>
      {!readOnly && usePresentationRenderer && enabledTracks.length > 0 && <label className="grid gap-1 text-sm">
        {t("markerStudio.stepColumn")}
        <select className="rounded border bg-background p-2" value={config.v2TrackId || ""} onChange={e => updateMarker(idx, "v2TrackId", e.target.value || undefined)}>
          <option value="">{t("markerLogic.trackAuto")}</option>
          {config.v2TrackId && !enabledTracks.some(track => track.id === config.v2TrackId) &&
            <option disabled value={config.v2TrackId}>{config.v2TrackId}</option>}
          {enabledTracks.map(track => <option key={track.id} value={track.id}>{track.name}</option>)}
        </select>
      </label>}
      {!readOnly && config.matchMode !== "regex" && <label className="grid gap-1 text-sm">{t("markerStudio.displayText")}
        <input className="rounded border bg-background p-2 font-mono" value={String((config.renderer as {template?:string})?.template ?? "")}
          placeholder="{{content}}" onChange={e => updateMarker(idx, "renderer", { ...config.renderer as object, template: e.target.value })} />
      </label>}
      <MarkerOutputPreview {...previewProps} mode="reader" />
    </CellEditor></td>
  </tr>;
});
