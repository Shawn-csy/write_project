export type CoverBgType = "solid" | "gradient" | "split" | "noise" | "textrepeat";
export type CoverFont = "serif" | "sans" | "mono" | "brush";
export type CoverTextEffect = "none" | "stroke" | "shadow" | "double" | "gradient";
// Legacy grid align — kept for backward compat, new path uses x/y
export type CoverAlign = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";
export type CoverFrameType = "none" | "single" | "double" | "corner-l" | "bottom-band" | "h-split";
export type CoverAccentShape = "circle" | "rect" | "diamond" | "line";

// ---------------------------------------------------------------------------
// Dynamic variable slots for text layers
// Resolved at render time from CoverVars
// ---------------------------------------------------------------------------
export const COVER_VAR_KEYS = [
  "title", "author", "persona", "date", "series", "status",
] as const;
export type CoverVarKey = (typeof COVER_VAR_KEYS)[number];

export const COVER_VAR_LABELS: Record<CoverVarKey, string> = {
  title:   "劇本標題",
  author:  "作者（自訂）",
  persona: "作者身分",
  date:    "日期",
  series:  "系列名稱",
  status:  "狀態",
};

/** Runtime values resolved from the script's current metadata fields */
export interface CoverVars {
  title: string;
  author: string;
  persona: string;   // persona displayName of current identity
  date: string;
  series: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Text layer — one draggable/stylable text element on the cover
// ---------------------------------------------------------------------------
export interface CoverTextLayer {
  id: string;
  /** Static text OR contains {{varKey}} tokens. Empty = hidden. */
  text: string;
  direction: "horizontal" | "vertical";
  font: CoverFont;
  size: "xs" | "sm" | "md" | "lg" | "xl";
  letterSpacing: number;
  effect: CoverTextEffect;
  color: string;
  effectColor?: string;
  /** Normalised 0–1 position from top-left */
  x: number;
  y: number;
  visible: boolean;
  /** Scale multiplier, default 1.0 */
  scale?: number;
  /** Rotation in degrees, default 0 */
  rotation?: number;
}

// ---------------------------------------------------------------------------
// CoverDesign — full design state
// ---------------------------------------------------------------------------
export interface CoverDesign {
  bg: {
    type: CoverBgType;
    colorA: string;
    colorB?: string;
    angle?: number;
    noiseOpacity?: number;
    /** 0–1: fraction of height that is colorA in split mode */
    splitRatio?: number;
  };
  /** Primary title layer — always present, cannot be deleted */
  title: {
    text?: string;              // overrides {{title}} var; empty = use script title
    direction: "horizontal" | "vertical";
    font: CoverFont;
    size: "xs" | "sm" | "md" | "lg" | "xl";
    letterSpacing: number;
    effect: CoverTextEffect;
    color: string;
    effectColor?: string;
    x: number;
    y: number;
    /** Scale multiplier, default 1.0 */
    scale?: number;
    /** Rotation in degrees, default 0 */
    rotation?: number;
    /** legacy grid align, still accepted for backward compat */
    align?: CoverAlign;
  };
  /** Extra text layers (author, sub-title, publisher, etc.) */
  layers?: CoverTextLayer[];
  /** @deprecated use layers instead */
  sub?: {
    text: string;
    direction: "horizontal" | "vertical";
    font: CoverFont;
    size: "xs" | "sm" | "md";
    color: string;
    x?: number;
    y?: number;
    align: CoverAlign;
    visible: boolean;
  };
  frame?: {
    type: CoverFrameType;
    color: string;
    width: number;
    inset: number;
  };
  accent?: {
    shape: CoverAccentShape;
    anchor: "tl" | "tr" | "bl" | "br" | "tc" | "bc";
    size: number;
    color: string;
    opacity: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve all {{varKey}} tokens in a string against CoverVars */
export function resolveCoverText(template: string, vars: CoverVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return (vars as unknown as Record<string, string>)[key] ?? "";
  });
}

export function makeCoverLayerId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Migrate legacy `sub` field to a CoverTextLayer */
export function migrateLegacySub(design: CoverDesign): CoverTextLayer[] {
  const existing = design.layers ?? [];
  if (!design.sub?.visible) return existing;
  const sub = design.sub;
  const legacyLayer: CoverTextLayer = {
    id: makeCoverLayerId(),
    text: sub.text,
    direction: sub.direction,
    font: sub.font,
    size: sub.size as CoverTextLayer["size"],
    letterSpacing: 0.06,
    effect: "none",
    color: sub.color,
    x: sub.x ?? 0.5,
    y: sub.y ?? 0.9,
    visible: sub.visible,
  };
  return [...existing, legacyLayer];
}

// ---------------------------------------------------------------------------
// Templates — 5 high-quality editorial designs
// ---------------------------------------------------------------------------

export const COVER_DESIGN_TEMPLATES: Record<string, CoverDesign> = {
  // 1. 白磁 — ivory, vertical serif, hairline border
  hakuji: {
    bg: { type: "solid", colorA: "#f7f3ed" },
    title: {
      direction: "vertical", font: "serif", size: "lg",
      letterSpacing: 0.22, effect: "none", color: "#1c1612",
      x: 0.5, y: 0.42,
    },
    layers: [
      {
        id: "hakuji-author",
        text: "{{author}}",
        direction: "horizontal", font: "serif", size: "xs",
        letterSpacing: 0.12, effect: "none", color: "#6b6560",
        x: 0.5, y: 0.88, visible: true,
      },
    ],
    frame: { type: "single", color: "#1c1612", width: 1, inset: 14 },
  },

  // 2. 深夜活版 — near-black, cream, letterpress
  shinyakatsuban: {
    bg: { type: "solid", colorA: "#0f0d0b" },
    title: {
      direction: "vertical", font: "serif", size: "xl",
      letterSpacing: 0.18, effect: "none", color: "#e8dfc8",
      x: 0.5, y: 0.42,
    },
    layers: [
      {
        id: "shinya-author",
        text: "{{persona}}",
        direction: "horizontal", font: "sans", size: "xs",
        letterSpacing: 0.18, effect: "none", color: "#7a6e60",
        x: 0.5, y: 0.9, visible: true,
      },
    ],
    frame: { type: "double", color: "#4a4238", width: 1, inset: 10 },
    accent: { shape: "line", anchor: "bc", size: 48, color: "#c8a96e", opacity: 0.6 },
  },

  // 3. 朱割 — indigo/ivory split, title spans seam
  shuwari: {
    bg: { type: "split", colorA: "#1a1f3c", colorB: "#f4f0ea", splitRatio: 0.52 },
    title: {
      direction: "vertical", font: "serif", size: "lg",
      letterSpacing: 0.14, effect: "none", color: "#f4f0ea",
      x: 0.5, y: 0.48,
    },
    layers: [
      {
        id: "shuwari-sub",
        text: "{{series}}",
        direction: "horizontal", font: "sans", size: "xs",
        letterSpacing: 0.2, effect: "none", color: "#1a1f3c",
        x: 0.5, y: 0.88, visible: true,
      },
    ],
    frame: { type: "none", color: "#ffffff", width: 0, inset: 0 },
    accent: { shape: "circle", anchor: "tr", size: 56, color: "#c4395a", opacity: 0.85 },
  },

  // 4. 鉛字 — noise/aged paper, brush calligraphy
  namarimoji: {
    bg: { type: "noise", colorA: "#ede8de", noiseOpacity: 0.12 },
    title: {
      direction: "vertical", font: "brush", size: "xl",
      letterSpacing: 0.1, effect: "shadow", color: "#110e09",
      effectColor: "rgba(0,0,0,0.2)", x: 0.5, y: 0.42,
    },
    layers: [
      {
        id: "namari-author",
        text: "{{author}}",
        direction: "horizontal", font: "serif", size: "xs",
        letterSpacing: 0.1, effect: "none", color: "#5c4a30",
        x: 0.5, y: 0.88, visible: true,
      },
    ],
    frame: { type: "corner-l", color: "#8b1a1a", width: 2, inset: 14 },
    accent: { shape: "rect", anchor: "br", size: 28, color: "#8b1a1a", opacity: 0.9 },
  },

  // 5. 蒼鉛 — indigo gradient, mono sans, wide tracking
  souen: {
    bg: { type: "gradient", colorA: "#1b2a4a", colorB: "#050810", angle: 160 },
    title: {
      direction: "horizontal", font: "sans", size: "md",
      letterSpacing: 0.28, effect: "none", color: "#a8c4e0",
      x: 0.5, y: 0.44,
    },
    layers: [
      {
        id: "souen-author",
        text: "{{persona}}",
        direction: "horizontal", font: "mono", size: "xs",
        letterSpacing: 0.12, effect: "none", color: "#4a6680",
        x: 0.5, y: 0.88, visible: true,
      },
      {
        id: "souen-date",
        text: "{{date}}",
        direction: "horizontal", font: "mono", size: "xs",
        letterSpacing: 0.06, effect: "none", color: "#2a4050",
        x: 0.5, y: 0.93, visible: true,
      },
    ],
    frame: { type: "h-split", color: "#2a4a6a", width: 1, inset: 0 },
    accent: { shape: "diamond", anchor: "tc", size: 18, color: "#a8c4e0", opacity: 0.4 },
  },
};

// ---------------------------------------------------------------------------
// Randomize — full structural variation (bg, frame, accent, title, layers)
// ---------------------------------------------------------------------------

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rndRange(min: number, max: number, step = 1): number {
  const steps = Math.floor((max - min) / step);
  return min + Math.round(Math.random() * steps) * step;
}

// Curated colour palettes: [bgA, bgB?, titleColor, layerColor, accentColor]
const PALETTES: [string, string | undefined, string, string, string][] = [
  ["#f7f3ed", undefined,   "#1c1612", "#6b6560", "#8b1a1a"],  // ivory
  ["#0f0d0b", undefined,   "#e8dfc8", "#7a6e60", "#c8a96e"],  // near-black
  ["#1a1f3c", "#f4f0ea",   "#f4f0ea", "#1a1f3c", "#c4395a"],  // indigo/ivory split
  ["#1b2a4a", "#050810",   "#a8c4e0", "#4a6680", "#a8c4e0"],  // dark indigo gradient
  ["#ede8de", undefined,   "#110e09", "#5c4a30", "#8b1a1a"],  // aged paper
  ["#2c0a0a", undefined,   "#f2d6b3", "#a06040", "#e8603c"],  // deep red
  ["#0a1a0f", undefined,   "#b8e0c8", "#5a9068", "#60c080"],  // forest
  ["#1a1028", "#0a0818",   "#c8b8f0", "#8070b0", "#b090e8"],  // purple gradient
  ["#f0e8d8", "#d8c8a8",   "#2a1808", "#6a4828", "#c04820"],  // warm gradient
  ["#141820", undefined,   "#d0e8f8", "#607888", "#40a0d0"],  // midnight blue
];

const BG_TYPES: CoverBgType[] = ["solid", "solid", "gradient", "split", "noise", "solid"];
const FONTS: CoverFont[] = ["serif", "sans", "mono", "brush"];
const EFFECTS: CoverTextEffect[] = ["none", "none", "shadow", "stroke", "gradient"];
const FRAME_TYPES: CoverFrameType[] = ["none", "none", "single", "double", "corner-l", "bottom-band", "h-split"];
const ACCENT_SHAPES: CoverAccentShape[] = ["circle", "rect", "diamond", "line"];
const ACCENT_ANCHORS: Array<"tl"|"tr"|"bl"|"br"|"tc"|"bc"> = ["tl", "tr", "bl", "br", "tc", "bc"];

// Layout grammars: title placement + per-layer placements
type Grammar = {
  titleX: number; titleY: number;
  titleDir: "horizontal" | "vertical";
  titleRotation: number; titleScale: number;
  titleSize: "xs"|"sm"|"md"|"lg"|"xl";
  layerSlots: Array<{ x: number; y: number; rotation: number; dir: "horizontal"|"vertical" }>;
};

const GRAMMARS: Grammar[] = [
  // 中央縱排
  { titleX:0.5, titleY:0.44, titleDir:"vertical",   titleRotation:0,   titleScale:1,    titleSize:"lg",
    layerSlots:[{x:0.5,y:0.88,rotation:0,dir:"horizontal"},{x:0.5,y:0.93,rotation:0,dir:"horizontal"}] },
  // 左側縱排大字，右下小字堆疊
  { titleX:0.28, titleY:0.44, titleDir:"vertical",  titleRotation:0,   titleScale:1.1,  titleSize:"xl",
    layerSlots:[{x:0.72,y:0.80,rotation:0,dir:"horizontal"},{x:0.72,y:0.87,rotation:0,dir:"horizontal"}] },
  // 右側縱排，左下文字
  { titleX:0.72, titleY:0.44, titleDir:"vertical",  titleRotation:0,   titleScale:1,    titleSize:"lg",
    layerSlots:[{x:0.28,y:0.84,rotation:0,dir:"horizontal"},{x:0.28,y:0.90,rotation:0,dir:"horizontal"}] },
  // 橫排頂部，底部置中
  { titleX:0.5, titleY:0.28, titleDir:"horizontal", titleRotation:0,   titleScale:1,    titleSize:"md",
    layerSlots:[{x:0.5,y:0.88,rotation:0,dir:"horizontal"},{x:0.5,y:0.93,rotation:0,dir:"horizontal"}] },
  // 橫排底部，作者頂部
  { titleX:0.5, titleY:0.78, titleDir:"horizontal", titleRotation:0,   titleScale:1,    titleSize:"md",
    layerSlots:[{x:0.5,y:0.12,rotation:0,dir:"horizontal"},{x:0.5,y:0.18,rotation:0,dir:"horizontal"}] },
  // 書名斜-6度橫排
  { titleX:0.5, titleY:0.42, titleDir:"horizontal", titleRotation:-6,  titleScale:1.05, titleSize:"lg",
    layerSlots:[{x:0.5,y:0.88,rotation:0,dir:"horizontal"},{x:0.5,y:0.93,rotation:0,dir:"horizontal"}] },
  // 書名斜+8度橫排，作者對齊斜
  { titleX:0.5, titleY:0.44, titleDir:"horizontal", titleRotation:8,   titleScale:1,    titleSize:"md",
    layerSlots:[{x:0.5,y:0.88,rotation:8,dir:"horizontal"},{x:0.5,y:0.93,rotation:0,dir:"horizontal"}] },
  // 超大縱排充滿
  { titleX:0.5, titleY:0.46, titleDir:"vertical",   titleRotation:0,   titleScale:1.3,  titleSize:"xl",
    layerSlots:[{x:0.5,y:0.92,rotation:0,dir:"horizontal"},{x:0.5,y:0.96,rotation:0,dir:"horizontal"}] },
  // 分散佈局：書名左，作者右
  { titleX:0.32, titleY:0.5, titleDir:"vertical",   titleRotation:0,   titleScale:1,    titleSize:"lg",
    layerSlots:[{x:0.72,y:0.5,rotation:90,dir:"horizontal"},{x:0.5,y:0.92,rotation:0,dir:"horizontal"}] },
  // 書名右下大字斜
  { titleX:0.58, titleY:0.62, titleDir:"horizontal",titleRotation:-14, titleScale:1.2,  titleSize:"xl",
    layerSlots:[{x:0.3,y:0.2,rotation:0,dir:"horizontal"},{x:0.5,y:0.9,rotation:0,dir:"horizontal"}] },
];

export function randomizeLayout(design: CoverDesign): CoverDesign {
  const palette = rnd(PALETTES);
  const [bgA, bgB, titleColor, layerColor, accentColor] = palette;

  const grammar = rnd(GRAMMARS);
  const font = rnd(FONTS);
  const bgTypePool = bgB ? (["split", "gradient"] as CoverBgType[]) : BG_TYPES;
  const bgType = rnd(bgTypePool);

  const bg: CoverDesign["bg"] = {
    type: bgType,
    colorA: bgA,
    colorB: bgB ?? bgA,
    angle: bgType === "gradient" ? rndRange(0, 360, 15) : undefined,
    splitRatio: bgType === "split" ? rndRange(30, 70, 5) / 100 : undefined,
    noiseOpacity: bgType === "noise" ? rndRange(5, 20, 1) / 100 : undefined,
  };

  const effect = rnd(EFFECTS);
  const effectColor = effect !== "none" ? rnd([titleColor, accentColor, "#ffffff"]) : undefined;

  const frameType = rnd(FRAME_TYPES);
  const frame: CoverDesign["frame"] = frameType === "none" ? { type: "none", color: accentColor, width: 1, inset: 14 } : {
    type: frameType,
    color: accentColor,
    width: rndRange(1, 3),
    inset: rndRange(8, 20, 2),
  };

  const hasAccent = Math.random() > 0.35;
  const accent: CoverDesign["accent"] | undefined = hasAccent ? {
    shape: rnd(ACCENT_SHAPES),
    anchor: rnd(ACCENT_ANCHORS),
    size: rndRange(16, 64, 8),
    color: accentColor,
    opacity: rndRange(40, 90, 5) / 100,
  } : undefined;

  const layers = (design.layers ?? []).map((l, i) => {
    const slot = grammar.layerSlots[i] ?? grammar.layerSlots[grammar.layerSlots.length - 1];
    return { ...l, x: slot.x, y: slot.y, rotation: slot.rotation, direction: slot.dir, color: layerColor, font };
  });

  return {
    ...design,
    bg,
    frame,
    accent,
    title: {
      ...design.title,
      x: grammar.titleX,
      y: grammar.titleY,
      direction: grammar.titleDir,
      rotation: grammar.titleRotation,
      scale: grammar.titleScale,
      size: grammar.titleSize,
      font,
      color: titleColor,
      effect,
      effectColor,
      letterSpacing: rndRange(5, 30, 5) / 100,
    },
    layers,
  };
}

export function emptyDesign(): CoverDesign {
  return {
    bg: { type: "solid", colorA: "#0f0d0b" },
    title: {
      direction: "vertical", font: "serif", size: "md",
      letterSpacing: 0.15, effect: "none", color: "#e8dfc8",
      x: 0.5, y: 0.44,
    },
    layers: [],
  };
}

// ---------------------------------------------------------------------------
// User-saved cover presets
// ---------------------------------------------------------------------------

export interface CoverPreset {
  id: string;
  name: string;
  design: CoverDesign;
  createdAt: number;
}

export const MAX_COVER_PRESETS = 20;

export const TEMPLATE_KEYS = ["hakuji", "shinyakatsuban", "shuwari", "namarimoji", "souen"] as const;
export type TemplateName = (typeof TEMPLATE_KEYS)[number];

export const TEMPLATE_LABELS: Record<TemplateName, string> = {
  hakuji:         "白磁",
  shinyakatsuban: "深夜活版",
  shuwari:        "朱割",
  namarimoji:     "鉛字",
  souen:          "蒼鉛",
};
