/**
 * CoverDesignerPanel
 *
 * Editorial cover design tool with:
 * - Live template thumbnails
 * - Interactive drag canvas (title + layers + split line)
 * - Layered text system: title (permanent) + extra layers
 * - Variable slots: {{author}}, {{persona}}, {{date}}, {{series}}, {{status}}
 * - Drag-to-reorder layers
 */
import React, { useState, useCallback, useRef } from "react";
import { Maximize2, Plus, Trash2, ChevronDown, ChevronUp, Shuffle, Bookmark, X } from "lucide-react";
import { Dialog, DialogContent } from "../../ui/dialog";
import { CoverRenderer, COVER_W, COVER_H } from "../../ui/CoverRenderer";
import {
  COVER_DESIGN_TEMPLATES, TEMPLATE_KEYS, TEMPLATE_LABELS, emptyDesign,
  COVER_VAR_KEYS, COVER_VAR_LABELS, makeCoverLayerId, randomizeLayout,
  MAX_COVER_PRESETS,
} from "../../../types/coverDesign";
import type {
  CoverDesign, CoverBgType, CoverFont, CoverTextEffect,
  CoverFrameType, CoverAccentShape, CoverTextLayer, CoverVars, TemplateName, CoverVarKey,
  CoverPreset,
} from "../../../types/coverDesign";
import { useSettings } from "../../../contexts/SettingsContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function merge<T extends object>(base: T, patch: Partial<T>): T {
  return { ...base, ...patch };
}

function defaultLayer(overrides?: Partial<CoverTextLayer>): CoverTextLayer {
  return {
    id: makeCoverLayerId(),
    text: "",
    direction: "horizontal",
    font: "serif",
    size: "xs",
    letterSpacing: 0.08,
    effect: "none",
    color: "#888888",
    x: 0.5,
    y: 0.85,
    visible: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Primitive controls (dark-theme)
// ---------------------------------------------------------------------------

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[68px_1fr] items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{label}</span>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = value.startsWith("#") ? value : "#888888";
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-1.5">
        <div className="relative h-6 w-6 shrink-0 cursor-pointer overflow-hidden rounded border border-zinc-700" style={{ background: value }}>
          <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </div>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-6 min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-1.5 font-mono text-[11px] text-zinc-300 outline-none focus:border-zinc-500" />
      </div>
    </FieldRow>
  );
}

function SliderField({ label, value, min, max, step, unit = "", onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer appearance-none rounded bg-zinc-700 accent-zinc-300" />
        <span className="w-9 shrink-0 text-right font-mono text-[10px] text-zinc-500">{value}{unit}</span>
      </div>
    </FieldRow>
  );
}

function SelectField<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <FieldRow label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}
        className="h-6 w-full rounded border border-zinc-700 bg-zinc-900 px-1.5 text-[11px] text-zinc-300 outline-none focus:border-zinc-500">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </FieldRow>
  );
}

function ToggleField<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <FieldRow label={label}>
      <div className="flex overflow-hidden rounded border border-zinc-700">
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={`flex-1 py-0.5 text-[11px] transition-colors ${value === o.value ? "bg-zinc-200 font-semibold text-zinc-900" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"}`}>
            {o.label}
          </button>
        ))}
      </div>
    </FieldRow>
  );
}

// ---------------------------------------------------------------------------
// Detect the "source" of a layer's text: a var token or custom
// ---------------------------------------------------------------------------

type LayerSource = CoverVarKey | "custom";

function detectSource(text: string): LayerSource {
  const m = text.match(/^\{\{(\w+)\}\}$/);
  if (m && COVER_VAR_KEYS.includes(m[1] as CoverVarKey)) return m[1] as CoverVarKey;
  return "custom";
}

// ---------------------------------------------------------------------------
// Layer row: select-based source + color, advanced for style details
// ---------------------------------------------------------------------------

interface LayerRowProps {
  layer: CoverTextLayer;
  index: number;
  total: number;
  highlighted: boolean;
  onHighlight: () => void;
  onChange: (patch: Partial<CoverTextLayer>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function LayerRow({ layer, index, total, highlighted, onHighlight, onChange, onDelete, onMoveUp, onMoveDown }: LayerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const source = detectSource(layer.text);

  const sourceOptions: { value: LayerSource; label: string }[] = [
    ...COVER_VAR_KEYS.map((k) => ({ value: k as LayerSource, label: COVER_VAR_LABELS[k] })),
    { value: "custom", label: "自訂文字" },
  ];

  const handleSourceChange = (v: LayerSource) => {
    onChange({ text: v === "custom" ? "" : `{{${v}}}` });
  };

  const displayLabel = source === "custom"
    ? (layer.text || "自訂文字")
    : COVER_VAR_LABELS[source as CoverVarKey];

  return (
    <div className={`rounded-md border transition-colors ${highlighted ? "border-zinc-500 bg-zinc-800" : "border-zinc-800 bg-zinc-900/50"}`}>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <div className="flex shrink-0 flex-col">
          <button type="button" onClick={onMoveUp} disabled={index === 0}
            className="p-0.5 text-zinc-700 transition-colors hover:text-zinc-400 disabled:opacity-20">
            <ChevronUp className="h-3 w-3" />
          </button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1}
            className="p-0.5 text-zinc-700 transition-colors hover:text-zinc-400 disabled:opacity-20">
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <input type="checkbox" checked={layer.visible} onChange={(e) => onChange({ visible: e.target.checked })}
          className="h-3 w-3 shrink-0 accent-zinc-400" title="顯示/隱藏" />
        <button type="button" onClick={() => { setExpanded((p) => !p); onHighlight(); }}
          className="min-w-0 flex-1 truncate text-left text-[11px] text-zinc-300 hover:text-zinc-100">
          {displayLabel.length > 24 ? displayLabel.slice(0, 24) + "…" : displayLabel}
        </button>
        <button type="button" onClick={() => { setExpanded((p) => !p); onHighlight(); }}
          className="shrink-0 p-0.5 text-zinc-600 hover:text-zinc-300">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={onDelete}
          className="shrink-0 p-0.5 text-zinc-700 transition-colors hover:text-red-400">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && (
        <div className="space-y-2 px-2 pb-2 pt-1">
          <FieldRow label="內容">
            <select value={source} onChange={(e) => handleSourceChange(e.target.value as LayerSource)}
              className="h-6 w-full rounded border border-zinc-700 bg-zinc-900 px-1.5 text-[11px] text-zinc-300 outline-none focus:border-zinc-500">
              {sourceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FieldRow>
          {source === "custom" && (
            <FieldRow label="文字">
              <input type="text" value={layer.text} placeholder="輸入自訂文字…"
                onChange={(e) => onChange({ text: e.target.value })}
                className="h-6 w-full rounded border border-zinc-700 bg-zinc-900 px-1.5 text-[11px] text-zinc-300 outline-none focus:border-zinc-500 placeholder:text-zinc-700" />
            </FieldRow>
          )}
          <ColorField label="字色" value={layer.color} onChange={(v) => onChange({ color: v })} />
          <p className="pl-[72px] text-[10px] text-zinc-600">在預覽上直接拖動此層位置</p>
          <Advanced>
            <ToggleField<"horizontal" | "vertical">
              label="方向"
              value={layer.direction}
              options={[{ value: "horizontal", label: "橫" }, { value: "vertical", label: "縱" }]}
              onChange={(v) => onChange({ direction: v })}
            />
            <SelectField<CoverFont>
              label="字型"
              value={layer.font}
              options={[
                { value: "serif", label: "明體 Serif" }, { value: "sans", label: "黑體 Sans" },
                { value: "mono", label: "等寬 Mono" }, { value: "brush", label: "楷書 Brush" },
              ]}
              onChange={(v) => onChange({ font: v })}
            />
            <SelectField<CoverTextLayer["size"]>
              label="大小"
              value={layer.size}
              options={[
                { value: "xs", label: "極小" }, { value: "sm", label: "小" }, { value: "md", label: "中" },
                { value: "lg", label: "大" }, { value: "xl", label: "特大" },
              ]}
              onChange={(v) => onChange({ size: v })}
            />
            <SliderField label="字距" value={Math.round(layer.letterSpacing * 100)} min={0} max={60} step={2}
              onChange={(v) => onChange({ letterSpacing: v / 100 })} />
            <SelectField<CoverTextEffect>
              label="效果"
              value={layer.effect}
              options={[
                { value: "none", label: "無" }, { value: "shadow", label: "陰影" },
                { value: "stroke", label: "描邊" }, { value: "gradient", label: "漸層色" },
              ]}
              onChange={(v) => onChange({ effect: v })}
            />
            {layer.effect !== "none" && (
              <ColorField label="效果色" value={layer.effectColor ?? "#ffffff"} onChange={(v) => onChange({ effectColor: v })} />
            )}
          </Advanced>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible advanced section
// ---------------------------------------------------------------------------

function Advanced({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        {open ? "收合進階選項" : "進階選項"}
      </button>
      {open && <div className="mt-2 space-y-2.5 border-l border-zinc-800 pl-2">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Title editor (permanent layer)
// ---------------------------------------------------------------------------

function TitleEditor({ design, onChange }: { design: CoverDesign; onChange: (patch: Partial<CoverDesign["title"]>) => void }) {
  const { title } = design;
  const hasCustomText = !!(title.text);
  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-900/80">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">書名</span>
        <span className="text-[10px] text-zinc-600">（不可刪除）</span>
      </div>
      <div className="space-y-2 px-3 pb-3 pt-0">
        <ColorField label="字色" value={title.color} onChange={(v) => onChange({ color: v })} />
        <p className="pl-[72px] text-[10px] text-zinc-600">在預覽上直接拖動書名位置</p>
        <FieldRow label="覆寫文字">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={hasCustomText} onChange={(e) => onChange({ text: e.target.checked ? "　" : "" })}
              className="h-3 w-3 accent-zinc-400" />
            <span className="text-[11px] text-zinc-500">{hasCustomText ? "自訂書名文字" : "使用劇本標題"}</span>
          </label>
        </FieldRow>
        {hasCustomText && (
          <FieldRow label="文字">
            <input type="text" value={title.text ?? ""} placeholder="輸入書名文字…"
              onChange={(e) => onChange({ text: e.target.value })}
              className="h-6 w-full rounded border border-zinc-700 bg-zinc-900 px-1.5 text-[11px] text-zinc-300 outline-none focus:border-zinc-500 placeholder:text-zinc-700" />
          </FieldRow>
        )}
        <Advanced>
          <ToggleField<"horizontal" | "vertical">
            label="方向"
            value={title.direction}
            options={[{ value: "horizontal", label: "橫排" }, { value: "vertical", label: "縱排" }]}
            onChange={(v) => onChange({ direction: v })}
          />
          <SelectField<CoverFont>
            label="字型"
            value={title.font}
            options={[
              { value: "serif", label: "明體 Serif" }, { value: "sans", label: "黑體 Sans" },
              { value: "mono", label: "等寬 Mono" }, { value: "brush", label: "楷書 Brush" },
            ]}
            onChange={(v) => onChange({ font: v })}
          />
          <SelectField<"xs"|"sm"|"md"|"lg"|"xl">
            label="大小"
            value={title.size}
            options={[
              { value: "xs", label: "極小" }, { value: "sm", label: "小" }, { value: "md", label: "中" },
              { value: "lg", label: "大" }, { value: "xl", label: "特大" },
            ]}
            onChange={(v) => onChange({ size: v })}
          />
          <SliderField label="字距" value={Math.round(title.letterSpacing * 100)} min={0} max={60} step={2}
            onChange={(v) => onChange({ letterSpacing: v / 100 })} />
          <SelectField<CoverTextEffect>
            label="效果"
            value={title.effect}
            options={[
              { value: "none", label: "無" }, { value: "shadow", label: "陰影" },
              { value: "stroke", label: "描邊" }, { value: "gradient", label: "漸層色" },
            ]}
            onChange={(v) => onChange({ effect: v })}
          />
          {title.effect !== "none" && (
            <ColorField label="效果色" value={title.effectColor ?? "#ffffff"} onChange={(v) => onChange({ effectColor: v })} />
          )}
        </Advanced>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar tab panels
// ---------------------------------------------------------------------------

function BgPanel({ design, onUpdate }: { design: CoverDesign; onUpdate: (p: Partial<CoverDesign["bg"]>) => void }) {
  const { bg } = design;
  const needsSecondColor = bg.type === "gradient" || bg.type === "split";
  return (
    <div className="space-y-2.5">
      <ColorField label="主色" value={bg.colorA} onChange={(v) => onUpdate({ colorA: v })} />
      {needsSecondColor && (
        <ColorField label="副色" value={bg.colorB ?? "#ffffff"} onChange={(v) => onUpdate({ colorB: v })} />
      )}
      {bg.type === "split" && (
        <p className="pl-[72px] text-[10px] text-zinc-600">可在預覽上直接拖動分割線</p>
      )}
      <Advanced>
        <SelectField<CoverBgType> label="類型" value={bg.type}
          options={[
            { value: "solid", label: "純色" }, { value: "gradient", label: "漸層" },
            { value: "split", label: "分割" }, { value: "noise", label: "紙質噪點" },
            { value: "textrepeat", label: "文字底紋" },
          ]}
          onChange={(v) => onUpdate({ type: v })} />
        {bg.type === "gradient" && (
          <SliderField label="角度" value={bg.angle ?? 160} min={0} max={360} step={5} unit="°" onChange={(v) => onUpdate({ angle: v })} />
        )}
        {bg.type === "split" && (
          <SliderField label="比例" value={Math.round((bg.splitRatio ?? 0.5) * 100)} min={10} max={90} step={1} unit="%" onChange={(v) => onUpdate({ splitRatio: v / 100 })} />
        )}
        {bg.type === "noise" && (
          <SliderField label="紋理" value={Math.round((bg.noiseOpacity ?? 0.1) * 100)} min={2} max={30} step={1} unit="%" onChange={(v) => onUpdate({ noiseOpacity: v / 100 })} />
        )}
      </Advanced>
    </div>
  );
}

function DecoPanel({
  design, onUpdateFrame, onUpdateAccent,
}: {
  design: CoverDesign;
  onUpdateFrame: (p: Partial<NonNullable<CoverDesign["frame"]>>) => void;
  onUpdateAccent: (p: Partial<NonNullable<CoverDesign["accent"]>>) => void;
}) {
  const { frame, accent } = design;
  const hasFrame = (frame?.type ?? "none") !== "none";
  const hasAccent = !!accent?.shape;
  return (
    <div className="space-y-4">
      {/* Frame */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">裝飾框</p>
          <button type="button"
            onClick={() => onUpdateFrame({ type: hasFrame ? "none" : "single" })}
            className={`rounded px-2 py-0.5 text-[10px] transition-colors ${hasFrame ? "bg-zinc-700 text-zinc-200" : "border border-zinc-800 text-zinc-600 hover:text-zinc-400"}`}>
            {hasFrame ? "已開啟" : "關閉"}
          </button>
        </div>
        {hasFrame && (
          <>
            <ColorField label="顏色" value={frame?.color ?? "#000000"} onChange={(v) => onUpdateFrame({ color: v })} />
            <Advanced>
              <SelectField<CoverFrameType> label="樣式" value={frame?.type ?? "single"}
                options={[
                  { value: "single", label: "單框" }, { value: "double", label: "雙框" },
                  { value: "corner-l", label: "角落 L" }, { value: "bottom-band", label: "底部色帶" },
                  { value: "h-split", label: "水平線" },
                ]}
                onChange={(v) => onUpdateFrame({ type: v })} />
              <SliderField label="粗細" value={frame?.width ?? 1} min={1} max={6} step={1} onChange={(v) => onUpdateFrame({ width: v })} />
              {frame?.type !== "bottom-band" && frame?.type !== "h-split" && (
                <SliderField label="內縮" value={frame?.inset ?? 12} min={0} max={40} step={1} onChange={(v) => onUpdateFrame({ inset: v })} />
              )}
            </Advanced>
          </>
        )}
      </div>

      <div className="border-t border-zinc-800" />

      {/* Accent */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">點綴圖形</p>
          <button type="button"
            onClick={() => onUpdateAccent(hasAccent
              ? { shape: undefined as unknown as CoverAccentShape }
              : { shape: "circle", anchor: "tr", size: 40, color: "#ffffff", opacity: 0.5 })}
            className={`rounded px-2 py-0.5 text-[10px] transition-colors ${hasAccent ? "bg-zinc-700 text-zinc-200" : "border border-zinc-800 text-zinc-600 hover:text-zinc-400"}`}>
            {hasAccent ? "已開啟" : "關閉"}
          </button>
        </div>
        {hasAccent && (
          <>
            <ColorField label="顏色" value={accent?.color ?? "#ffffff"} onChange={(v) => onUpdateAccent({ color: v })} />
            <Advanced>
              <SelectField<CoverAccentShape> label="形狀" value={accent?.shape ?? "circle"}
                options={[
                  { value: "circle", label: "圓形" }, { value: "rect", label: "方形" },
                  { value: "diamond", label: "菱形" }, { value: "line", label: "線段" },
                ]}
                onChange={(v) => onUpdateAccent({ shape: v })} />
              <SelectField<"tl"|"tr"|"bl"|"br"|"tc"|"bc"> label="位置" value={accent?.anchor ?? "tr"}
                options={[
                  { value: "tl", label: "左上" }, { value: "tc", label: "中上" }, { value: "tr", label: "右上" },
                  { value: "bl", label: "左下" }, { value: "bc", label: "中下" }, { value: "br", label: "右下" },
                ]}
                onChange={(v) => onUpdateAccent({ anchor: v })} />
              <SliderField label="大小" value={accent?.size ?? 40} min={8} max={120} step={4} onChange={(v) => onUpdateAccent({ size: v })} />
              <SliderField label="透明度" value={Math.round((accent?.opacity ?? 0.5) * 100)} min={5} max={100} step={5} unit="%" onChange={(v) => onUpdateAccent({ opacity: v / 100 })} />
            </Advanced>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add layer row — select what to add, then click +
// ---------------------------------------------------------------------------

function AddLayerRow({ onAdd }: { onAdd: (source: LayerSource) => void }) {
  const [selected, setSelected] = useState<LayerSource>("author");
  const options: { value: LayerSource; label: string }[] = [
    ...COVER_VAR_KEYS.map((k) => ({ value: k as LayerSource, label: COVER_VAR_LABELS[k] })),
    { value: "custom", label: "自訂文字" },
  ];
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-zinc-700 px-2 py-1.5">
      <select value={selected} onChange={(e) => setSelected(e.target.value as LayerSource)}
        className="h-6 flex-1 rounded border border-zinc-700 bg-zinc-900 px-1.5 text-[11px] text-zinc-400 outline-none focus:border-zinc-500">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button type="button" onClick={() => onAdd(selected)}
        className="flex shrink-0 items-center gap-1 rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300 transition-colors hover:border-zinc-400 hover:text-zinc-100">
        <Plus className="h-3 w-3" />
        新增
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template thumbnail
// ---------------------------------------------------------------------------

function TemplateThumbnail({ name, vars, active, onSelect }: {
  name: TemplateName; vars: Partial<CoverVars>; active: boolean; onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect}
      className={`group flex shrink-0 flex-col items-center gap-1 rounded-lg p-1.5 transition-all ${active ? "bg-zinc-700 ring-1 ring-zinc-400" : "bg-transparent hover:bg-zinc-800"}`}>
      <div className={`overflow-hidden rounded shadow-md transition-transform group-hover:scale-[1.04] ${active ? "ring-1 ring-zinc-300" : ""}`}
        style={{ width: 40, height: 60 }}>
        <div style={{ transform: "scale(0.133)", transformOrigin: "top left", width: 300, height: 450, pointerEvents: "none" }}>
          <CoverRenderer design={COVER_DESIGN_TEMPLATES[name]} title={vars.title || "劇本"} vars={vars} />
        </div>
      </div>
      <span className={`text-[10px] tracking-wide ${active ? "text-zinc-200 font-medium" : "text-zinc-600"}`}>{TEMPLATE_LABELS[name]}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// User preset thumbnail
// ---------------------------------------------------------------------------

function PresetThumbnail({ preset, vars, active, onSelect, onDelete }: {
  preset: CoverPreset; vars: Partial<CoverVars>; active: boolean;
  onSelect: () => void; onDelete: () => void;
}) {
  return (
    <div className={`group relative flex shrink-0 flex-col items-center gap-1 rounded-lg p-1.5 transition-all ${active ? "bg-zinc-700 ring-1 ring-zinc-400" : "bg-transparent hover:bg-zinc-800"}`}>
      <button type="button" onClick={onSelect} className="flex flex-col items-center gap-1">
        <div className={`overflow-hidden rounded shadow-md transition-transform group-hover:scale-[1.04] ${active ? "ring-1 ring-zinc-300" : ""}`}
          style={{ width: 40, height: 60 }}>
          <div style={{ transform: "scale(0.133)", transformOrigin: "top left", width: 300, height: 450, pointerEvents: "none" }}>
            <CoverRenderer design={preset.design} title={vars.title || "劇本"} vars={vars} />
          </div>
        </div>
        <span className={`max-w-[48px] truncate text-[10px] tracking-wide ${active ? "text-zinc-200 font-medium" : "text-zinc-600"}`}>{preset.name}</span>
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute right-0.5 top-0.5 hidden rounded-full bg-zinc-800 p-0.5 text-zinc-500 hover:bg-red-900 hover:text-red-300 group-hover:flex">
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Save preset inline input
// ---------------------------------------------------------------------------

function SavePresetRow({ onSave, disabled }: { onSave: (name: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    setName("");
    setOpen(false);
  };

  if (disabled) {
    return (
      <button type="button" disabled
        className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-600 cursor-not-allowed"
        title={`最多 ${MAX_COVER_PRESETS} 個樣式`}>
        <Bookmark className="h-3 w-3" />儲存樣式
      </button>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200">
        <Bookmark className="h-3 w-3" />儲存樣式
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setOpen(false); setName(""); } }}
        placeholder="樣式名稱…"
        maxLength={30}
        className="h-6 w-28 rounded border border-zinc-600 bg-zinc-900 px-1.5 font-sans text-[11px] text-zinc-300 outline-none focus:border-zinc-400 placeholder:text-zinc-700"
      />
      <button type="button" onClick={handleSave} disabled={!name.trim()}
        className="rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300 transition-colors hover:border-zinc-400 hover:text-zinc-100 disabled:opacity-40">
        存
      </button>
      <button type="button" onClick={() => { setOpen(false); setName(""); }}
        className="text-[11px] text-zinc-600 hover:text-zinc-400">取消</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

type SidebarTab = "bg" | "text" | "deco";

export interface CoverDesignerPanelProps {
  design: CoverDesign | null;
  onChange: (d: CoverDesign) => void;
  scriptTitle: string;
  /** Runtime variable values from the script's metadata */
  vars?: Partial<CoverVars>;
}

export function CoverDesignerPanel({ design, onChange, scriptTitle, vars }: CoverDesignerPanelProps) {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [tab, setTab] = useState<SidebarTab>("bg");
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);

  const { coverPresets, saveCoverPreset, deleteCoverPreset } = useSettings();

  const current: CoverDesign = design ?? emptyDesign();
  const layers: CoverTextLayer[] = current.layers ?? [];

  const resolvedVars: Partial<CoverVars> = { title: scriptTitle, ...vars };

  // Detect active template (ignore layers since they contain ids)
  const activeTemplate = TEMPLATE_KEYS.find((k) => {
    const t = COVER_DESIGN_TEMPLATES[k];
    return JSON.stringify({ bg: t.bg, title: t.title, frame: t.frame, accent: t.accent })
      === JSON.stringify({ bg: current.bg, title: current.title, frame: current.frame, accent: current.accent });
  }) as TemplateName | undefined;

  const activePresetId = coverPresets.find((p) =>
    JSON.stringify({ bg: p.design.bg, title: p.design.title, frame: p.design.frame, accent: p.design.accent })
    === JSON.stringify({ bg: current.bg, title: current.title, frame: current.frame, accent: current.accent })
  )?.id;

  // Update helpers
  const updateBg     = useCallback((p: Partial<CoverDesign["bg"]>) => onChange({ ...current, bg: merge(current.bg, p) }), [current, onChange]);
  const updateTitle  = useCallback((p: Partial<CoverDesign["title"]>) => onChange({ ...current, title: merge(current.title, p) }), [current, onChange]);
  const updateFrame  = useCallback((p: Partial<NonNullable<CoverDesign["frame"]>>) => {
    const base = current.frame ?? { type: "none" as CoverFrameType, color: "#ffffff", width: 1, inset: 14 };
    onChange({ ...current, frame: merge(base, p) });
  }, [current, onChange]);
  const updateAccent = useCallback((p: Partial<NonNullable<CoverDesign["accent"]>>) => {
    const base = current.accent ?? { shape: "circle" as CoverAccentShape, anchor: "tr" as const, size: 40, color: "#ffffff", opacity: 0.5 };
    onChange({ ...current, accent: merge(base, p) });
  }, [current, onChange]);

  const updateLayer = useCallback((id: string, patch: Partial<CoverTextLayer>) => {
    onChange({ ...current, layers: layers.map((l) => l.id === id ? merge(l, patch) : l) });
  }, [current, layers, onChange]);

  const addLayer = useCallback((source: LayerSource) => {
    const text = source === "custom" ? "" : `{{${source}}}`;
    const layer = defaultLayer({ text, y: 0.85 + layers.length * 0.05 });
    onChange({ ...current, layers: [...layers, layer] });
    setTab("text");
    setSelectedLayerId(layer.id);
  }, [current, layers, onChange]);

  const deleteLayer = useCallback((id: string) => {
    onChange({ ...current, layers: layers.filter((l) => l.id !== id) });
    setSelectedLayerId(null);
    setEditingLayerId(null);
  }, [current, layers, onChange]);

  const moveLayer = useCallback((idx: number, dir: -1 | 1) => {
    const next = [...layers];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ ...current, layers: next });
  }, [current, layers, onChange]);

  const handleTitleDrag   = useCallback((x: number, y: number) => onChange({ ...current, title: { ...current.title, x, y } }), [current, onChange]);
  const handleTitleResize = useCallback((normW: number, fontSize: number) => onChange({ ...current, title: { ...current.title, w: normW, fontSize } }), [current, onChange]);
  const handleTitleRotate = useCallback((r: number) => onChange({ ...current, title: { ...current.title, rotation: r } }), [current, onChange]);
  const handleSplitDrag   = useCallback((ratio: number) => onChange({ ...current, bg: { ...current.bg, splitRatio: ratio } }), [current, onChange]);
  const handleLayerDrag   = useCallback((id: string, x: number, y: number) => {
    onChange({ ...current, layers: layers.map((l) => l.id === id ? { ...l, x, y } : l) });
  }, [current, layers, onChange]);
  const handleLayerResize = useCallback((id: string, normW: number, fontSize: number) => {
    onChange({ ...current, layers: layers.map((l) => l.id === id ? { ...l, w: normW, fontSize } : l) });
  }, [current, layers, onChange]);
  const handleLayerRotate = useCallback((id: string, r: number) => {
    onChange({ ...current, layers: layers.map((l) => l.id === id ? { ...l, rotation: r } : l) });
  }, [current, layers, onChange]);

  // Double-click to edit
  const handleDblClick = useCallback((id: string) => {
    setEditingLayerId(id);
    setSelectedLayerId(id);
    // Auto-enable custom text for title
    if (id === "__title__" && !current.title.text) {
      onChange({ ...current, title: { ...current.title, text: scriptTitle || "劇本標題" } });
    }
  }, [current, onChange, scriptTitle]);

  // Edit callbacks
  const handleEditChange = useCallback((id: string, text: string) => {
    if (id === "__title__") {
      onChange({ ...current, title: { ...current.title, text } });
    } else {
      onChange({ ...current, layers: layers.map((l) => l.id === id ? { ...l, text } : l) });
    }
  }, [current, layers, onChange]);

  const handleEditCommit = useCallback(() => setEditingLayerId(null), []);

  // Canvas display: render at 300×450, scale down to 200×300
  const DISPLAY_W = 200;
  const DISPLAY_H = 300;
  const canvasScale = DISPLAY_W / COVER_W;

  const TABS: { id: SidebarTab; label: string }[] = [
    { id: "bg", label: "背景" }, { id: "text", label: "文字層" }, { id: "deco", label: "裝飾" },
  ];

  return (
    <div className="mt-2">
      {/* Toggle */}
      <button type="button" onClick={() => setOpen((p) => !p)}
        className={`group flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
          open ? "border-zinc-500 bg-zinc-900 text-zinc-200" : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
        }`}>
        <span className={`text-[10px] transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        設計封面
        {design && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      </button>

      {open && (
        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-700/60 bg-zinc-950 shadow-2xl" style={{ fontFamily: "'Noto Sans CJK TC', sans-serif" }}>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">封面設計</span>
            <div className="flex items-center gap-2">
              <SavePresetRow
                onSave={(name) => saveCoverPreset(name, current)}
                disabled={coverPresets.length >= MAX_COVER_PRESETS}
              />
              <button type="button" onClick={() => onChange(randomizeLayout(current))}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200">
                <Shuffle className="h-3 w-3" />隨機排版
              </button>
              <button type="button" onClick={() => setFullscreen(true)}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200">
                <Maximize2 className="h-3 w-3" />預覽
              </button>
            </div>
          </div>

          {/* Template strip */}
          <div className="border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex gap-1 overflow-x-auto px-3 py-2">
              {TEMPLATE_KEYS.map((k) => (
                <TemplateThumbnail key={k} name={k} vars={resolvedVars} active={activeTemplate === k}
                  onSelect={() => {
                    const tmpl = COVER_DESIGN_TEMPLATES[k];
                    onChange({ ...tmpl, layers: tmpl.layers ?? [] });
                  }} />
              ))}
              {coverPresets.length > 0 && (
                <>
                  <div className="mx-1 w-px shrink-0 self-stretch bg-zinc-700" />
                  {coverPresets.map((p) => (
                    <PresetThumbnail
                      key={p.id}
                      preset={p}
                      vars={resolvedVars}
                      active={activePresetId === p.id}
                      onSelect={() => onChange({ ...p.design, layers: p.design.layers ?? [] })}
                      onDelete={() => deleteCoverPreset(p.id)}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Canvas + sidebar */}
          <div className="flex min-h-0">
            {/* Canvas */}
            <div className="flex shrink-0 flex-col items-center gap-2 border-r border-zinc-800 bg-zinc-900/20 px-4 py-4">
              <div className="relative" style={{ width: DISPLAY_W, height: DISPLAY_H }}>
                <div className="absolute inset-0 rounded-md"
                  style={{ backgroundImage: "repeating-conic-gradient(#222 0% 25%, #1a1a1a 0% 50%)", backgroundSize: "10px 10px" }} />
                <div className="relative overflow-hidden rounded-md shadow-[0_4px_28px_rgba(0,0,0,0.8)]"
                  style={{ width: DISPLAY_W, height: DISPLAY_H }}>
                  <div style={{ transform: `scale(${canvasScale})`, transformOrigin: "top left", width: COVER_W, height: COVER_H, pointerEvents: "auto" }}>
                    <CoverRenderer
                      design={current}
                      title={scriptTitle || "劇本標題"}
                      vars={resolvedVars}
                      interactive
                      selectedLayerId={selectedLayerId}
                      editingLayerId={editingLayerId}
                      onSelectLayer={setSelectedLayerId}
                      onDblClickLayer={handleDblClick}
                      onTitleDrag={handleTitleDrag}
                      onLayerDrag={handleLayerDrag}
                      onTitleResize={handleTitleResize}
                      onLayerResize={handleLayerResize}
                      onTitleRotate={handleTitleRotate}
                      onLayerRotate={handleLayerRotate}
                      onSplitDrag={current.bg.type === "split" ? handleSplitDrag : undefined}
                      onEditChange={handleEditChange}
                      onEditCommit={handleEditCommit}
                      onDeselect={() => { setSelectedLayerId(null); setEditingLayerId(null); }}
                    />
                  </div>
                </div>
              </div>
              <p className="max-w-[200px] text-center text-[10px] leading-relaxed text-zinc-700">
                點選文字 → 拖動／縮放／旋轉 · 雙擊 → 直接編輯
                {current.bg.type === "split" && <> · 拖動分割線調整比例</>}
              </p>
            </div>

            {/* Sidebar */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Tabs */}
              <div className="flex border-b border-zinc-800">
                {TABS.map((t) => (
                  <button key={t.id} type="button" onClick={() => setTab(t.id)}
                    className={`flex-1 py-2.5 text-[11px] font-medium tracking-wide transition-colors ${
                      tab === t.id ? "border-b-2 border-zinc-300 text-zinc-200" : "text-zinc-600 hover:text-zinc-400"
                    }`}>
                    {t.label}
                    {t.id === "text" && layers.length > 0 && (
                      <span className="ml-1 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[9px] text-zinc-400">{layers.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto px-3 py-3" style={{ maxHeight: DISPLAY_H }}>
                {tab === "bg" && <BgPanel design={current} onUpdate={updateBg} />}

                {tab === "text" && (
                  <div className="space-y-3">
                    {/* Title (permanent) */}
                    <TitleEditor design={current} onChange={updateTitle} />

                    {/* Extra layers */}
                    {layers.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">額外文字層</p>
                        {layers.map((layer, idx) => (
                          <LayerRow
                            key={layer.id}
                            layer={layer}
                            index={idx}
                            total={layers.length}
                            highlighted={selectedLayerId === layer.id}
                            onHighlight={() => setSelectedLayerId(layer.id)}
                            onChange={(p) => updateLayer(layer.id, p)}
                            onDelete={() => deleteLayer(layer.id)}
                            onMoveUp={() => moveLayer(idx, -1)}
                            onMoveDown={() => moveLayer(idx, 1)}
                          />
                        ))}
                      </div>
                    )}

                    <AddLayerRow onAdd={addLayer} />
                  </div>
                )}

                {tab === "deco" && <DecoPanel design={current} onUpdateFrame={updateFrame} onUpdateAccent={updateAccent} />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="flex max-w-none items-center justify-center bg-zinc-950 p-8">
          <div className="overflow-hidden rounded-xl shadow-[0_8px_48px_rgba(0,0,0,0.9)]">
            <CoverRenderer design={current} title={scriptTitle || "劇本標題"} vars={resolvedVars} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
