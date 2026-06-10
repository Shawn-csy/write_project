export type CoverBgType = "solid" | "gradient" | "split" | "noise" | "textrepeat";
export type CoverFont = "serif" | "sans" | "mono" | "brush";
export type CoverTextEffect = "none" | "stroke" | "shadow" | "double" | "gradient";
export type CoverAlign = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";
export type CoverFrameType = "none" | "single" | "double" | "corner-l" | "bottom-band" | "h-split";
export type CoverAccentShape = "circle" | "rect" | "diamond" | "line";

export const COVER_VAR_KEYS = [
  "title", "author", "persona", "date", "series", "status",
] as const;
export type CoverVarKey = (typeof COVER_VAR_KEYS)[number];

export interface CoverVars {
  title: string;
  author: string;
  persona: string;
  date: string;
  series: string;
  status: string;
}

export interface CoverTextLayer {
  id: string;
  text: string;
  direction: "horizontal" | "vertical";
  font: CoverFont;
  size: "xs" | "sm" | "md" | "lg" | "xl";
  fontSize?: number;
  letterSpacing: number;
  effect: CoverTextEffect;
  color: string;
  effectColor?: string;
  x: number;
  y: number;
  visible: boolean;
  w?: number;
  scale?: number;
  rotation?: number;
}

export interface CoverDesign {
  bg: {
    type: CoverBgType;
    colorA: string;
    colorB?: string;
    angle?: number;
    noiseOpacity?: number;
    splitRatio?: number;
  };
  title: {
    text?: string;
    direction: "horizontal" | "vertical";
    font: CoverFont;
    size: "xs" | "sm" | "md" | "lg" | "xl";
    fontSize?: number;
    letterSpacing: number;
    effect: CoverTextEffect;
    color: string;
    effectColor?: string;
    x: number;
    y: number;
    w?: number;
    scale?: number;
    rotation?: number;
    align?: CoverAlign;
  };
  layers?: CoverTextLayer[];
  /** @deprecated use layers */
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

export function resolveCoverText(template: string, vars: CoverVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return (vars as unknown as Record<string, string>)[key] ?? "";
  });
}

export function migrateLegacySub(design: CoverDesign): CoverTextLayer[] {
  const existing = design.layers ?? [];
  if (!design.sub?.visible) return existing;
  const sub = design.sub;
  const legacyLayer: CoverTextLayer = {
    id: `layer_legacy_sub`,
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
