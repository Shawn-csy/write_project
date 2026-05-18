import { extractErrorMessage } from './utils';
import { validateMarkerConfigs } from './markerConfigValidation';

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
      const parsed = JSON.parse(configs);
      return normalizeThemeConfigs(parsed);
    } catch {
      return [];
    }
  }
  return [];
};

const inferMatchMode = (config: Record<string, unknown> = {}) => {
  if (config.matchMode) return config.matchMode;
  if (config.regex) return "regex";
  if (config.start && config.end) return "enclosure";
  if (config.start) return "prefix";
  return "none";
};

export const normalizeMarkerConfigsSchema = (configs: unknown): import("../types/script").MarkerConfig[] => {
  const normalized = normalizeThemeConfigs(configs);
  return normalized
    .filter((config) => config && typeof config === "object")
    .map((config) => {
      const cfg = config as Record<string, unknown>;
      const matchMode = inferMatchMode(cfg);
      const parseAs = String(cfg.parseAs || "").trim();
      const isMappedNode = Boolean(parseAs);
      const isBlock = Boolean(cfg.isBlock) || cfg.type === "block" || matchMode === "range" || isMappedNode;
      const type = cfg.type || (isBlock ? "block" : "inline");
      const next: Record<string, unknown> = {
        ...cfg,
        matchMode,
        isBlock,
        type,
      };

      if (next.mapFields && typeof next.mapFields !== "object") {
        delete next.mapFields;
      }
      if (next.mapCasts && typeof next.mapCasts !== "object") {
        delete next.mapCasts;
      }
      return next;
    }) as import("../types/script").MarkerConfig[];
};

export const serializeThemeConfigs = (configs: unknown) => {
  const normalized = normalizeMarkerConfigsSchema(configs);
  return JSON.stringify(normalized);
};

export const safeParseThemeConfigsText = (text: string) => {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return { value: null, error: "根節點必須是陣列" };
    }
    const normalized = normalizeMarkerConfigsSchema(parsed);
    const validationErrors = validateMarkerConfigs(normalized as import("../types/script").MarkerConfig[]);
    if (validationErrors.length > 0) {
      return { value: null, error: validationErrors.join("\n") };
    }
    return { value: normalized, error: "" };
  } catch (error) {
    return { value: null, error: extractErrorMessage(error) || "格式錯誤" };
  }
};
