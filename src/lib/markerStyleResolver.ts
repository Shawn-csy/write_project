import { MARKER_COLORS } from "../constants/markerColors";

const TOKEN_TO_HEX = new Map<string, string>(
  MARKER_COLORS.map((c) => [
    `--marker-color-${String(c.id || "").trim()}`,
    String(c.light || "").trim().toUpperCase(),
  ])
);

export const resolveMarkerColorToken = (value: unknown): string | undefined => {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();
  const cssVar = raw.match(/^var\((--[^)]+)\)$/i);
  if (!cssVar) return undefined;
  const token = String(cssVar[1] || "").trim();
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const computed = window.getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    if (/^#[0-9a-f]{6}$/i.test(computed)) return computed.toUpperCase();
    const rgb = computed.match(/^rgb\(([^)]+)\)$/i);
    if (rgb) {
      const nums = rgb[1].split(",").slice(0, 3).map((n) => Math.max(0, Math.min(255, Number(n.trim()) || 0)));
      if (nums.length === 3) {
        return `#${nums.map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
      }
    }
  }
  const mapped = TOKEN_TO_HEX.get(token);
  if (!mapped || !/^#[0-9A-F]{6}$/.test(mapped)) return undefined;
  return mapped;
};

export const isKnownMarkerColorToken = (value: unknown): boolean => {
  const raw = String(value || "").trim();
  const cssVar = raw.match(/^var\((--[^)]+)\)$/i);
  if (!cssVar) return false;
  return TOKEN_TO_HEX.has(String(cssVar[1] || "").trim());
};
