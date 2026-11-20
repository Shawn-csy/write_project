import type { CSSProperties } from "react";
import type { MarkerConfig } from "../../../types/script";

// Theme variables stay live when the studio theme changes. Only the display
// copy is adapted; the parser, saved rules and DOCX export use original colors.
export function previewColor(value: unknown, role: "ink" | "fill"): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  if (/^(transparent|inherit|initial|unset|currentcolor)$/i.test(value)) return value;
  return `color-mix(in srgb, ${value}, var(--preview-${role}) var(--preview-${role}-mix))`;
}

export function previewStyle<T extends CSSProperties>(style: T): T {
  return { ...style, color: previewColor(style.color, "ink"), backgroundColor: previewColor(style.backgroundColor, "fill") };
}

export function previewMarkerConfigs(configs: MarkerConfig[]): MarkerConfig[] {
  return configs.map(rule => rule.style ? { ...rule, style: previewStyle(rule.style) } : rule);
}
