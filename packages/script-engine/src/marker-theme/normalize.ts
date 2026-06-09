/**
 * Ported from src/lib/markerThemeCodec.ts
 * Normalises arbitrary theme config shapes into canonical MarkerConfig[].
 */

import type { MarkerConfig } from "../document/astTypes";
import { normalizeLegacyMarkerType } from "./markerRules";

export const normalizeThemeConfigs = (configs: unknown): unknown[] => {
  if (Array.isArray(configs)) return configs;
  if (configs && typeof configs === "object") {
    const obj = configs as Record<string, unknown>;
    if (Array.isArray(obj.configs)) return obj.configs;
    if (Array.isArray(obj.markerConfigs)) return obj.markerConfigs;
    if (Array.isArray(obj.markers)) return obj.markers;
    if (typeof obj.configs === "string") return normalizeThemeConfigs(obj.configs);
    if (typeof obj.markerConfigs === "string") return normalizeThemeConfigs(obj.markerConfigs);
    if (typeof obj.markers === "string") return normalizeThemeConfigs(obj.markers);
    const values = Object.values(obj);
    if (values.length === 1 && Array.isArray(values[0])) return values[0];
    return values;
  }
  if (typeof configs === "string") {
    try {
      return normalizeThemeConfigs(JSON.parse(configs));
    } catch {
      return [];
    }
  }
  return [];
};

const inferMatchMode = (config: Record<string, unknown> = {}): string => {
  if (config.matchMode) return String(config.matchMode);
  if (config.regex) return "regex";
  if (config.start && config.end) return "enclosure";
  if (config.start) return "prefix";
  return "none";
};

export const normalizeMarkerConfigsSchema = (configs: unknown): MarkerConfig[] => {
  const normalized = normalizeThemeConfigs(configs);
  return normalized
    .filter((config) => config && typeof config === "object")
    .map((config) => {
      const cfg = config as Record<string, unknown>;
      const matchMode = inferMatchMode(cfg);
      const parseAs = String(cfg.parseAs || "").trim();
      const isMappedNode = Boolean(parseAs);
      const isBlock =
        Boolean(cfg.isBlock) ||
        cfg.type === "block" ||
        matchMode === "range" ||
        isMappedNode;
      const type = cfg.type || (isBlock ? "block" : "inline");
      const next: Record<string, unknown> = { ...cfg, matchMode, isBlock, type };
      if (next.mapFields && typeof next.mapFields !== "object") delete next.mapFields;
      if (next.mapCasts && typeof next.mapCasts !== "object") delete next.mapCasts;
      return normalizeLegacyMarkerType(next as MarkerConfig);
    }) as MarkerConfig[];
};
