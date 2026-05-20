import type { MarkerConfig } from "../types/script";
import { isKnownMarkerColorToken } from "./markerStyleResolver";

export const validateMarkerConfigs = (configs: MarkerConfig[]): string[] => {
  const errors: string[] = [];
  const rangePairKeyToId = new Map<string, string>();

  configs.forEach((cfg, idx) => {
    const id = String(cfg?.id || `#${idx}`);
    const mode = String(cfg?.matchMode || "").trim().toLowerCase();
    const type = String(cfg?.type || "").trim().toLowerCase();
    const hasIsBlock = Object.prototype.hasOwnProperty.call(cfg || {}, "isBlock");
    const isBlockValue = hasIsBlock ? Boolean((cfg as any)?.isBlock) : null;
    const start = String((cfg as any)?.start || "");
    const end = String((cfg as any)?.end || "");

    if (mode === "enclosure" && !end) {
      errors.push(`${id}: enclosure 模式必須有 end`);
    }
    if (mode === "range" && (!start || !end)) {
      errors.push(`${id}: range 模式必須同時有 start 與 end`);
    }
    if (mode === "range" && type === "inline") {
      errors.push(`${id}: range 模式不可設定為 inline，請改為 block`);
    }
    if (mode === "range" && hasIsBlock && isBlockValue === false) {
      errors.push(`${id}: range 模式不可設定 isBlock=false`);
    }
    if (mode === "prefix" && !start) {
      errors.push(`${id}: prefix 模式必須有 start`);
    }

    if (mode === "range" && start && end) {
      const key = `${start}::${end}`;
      const existing = rangePairKeyToId.get(key);
      if (existing && existing !== id) {
        errors.push(`${id}: range 起訖 (${start} ... ${end}) 與 ${existing} 衝突`);
      } else {
        rangePairKeyToId.set(key, id);
      }
    }

    const style = ((cfg as any)?.style || {}) as Record<string, unknown>;
    const colorRaw = String(style.color || "").trim();
    if (/^var\(--marker-color-/i.test(colorRaw) && !isKnownMarkerColorToken(colorRaw)) {
      errors.push(`${id}: 未知色彩 token ${colorRaw}`);
    }
  });

  return errors;
};
