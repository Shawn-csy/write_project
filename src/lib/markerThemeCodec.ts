import { extractErrorMessage } from './utils';

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

export const normalizeMarkerConfigsSchema = (configs: unknown) => {
  const normalized = normalizeThemeConfigs(configs);
  return normalized
    .filter((config) => config && typeof config === "object")
    .map((config) => {
      const matchMode = inferMatchMode(config as Record<string, unknown>);
      const parseAs = String(config.parseAs || "").trim();
      const isMappedNode = Boolean(parseAs);
      const isBlock = Boolean(config.isBlock) || config.type === "block" || matchMode === "range" || isMappedNode;
      const type = config.type || (isBlock ? "block" : "inline");
      const next = {
        ...config,
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
    });
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
    return { value: normalizeMarkerConfigsSchema(parsed), error: "" };
  } catch (error) {
    return { value: null, error: extractErrorMessage(error) || "格式錯誤" };
  }
};
