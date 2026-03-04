export const normalizeThemeConfigs = (configs) => {
  if (Array.isArray(configs)) return configs;
  if (configs && typeof configs === "object") {
    if (Array.isArray(configs.configs)) return configs.configs;
    if (Array.isArray(configs.markerConfigs)) return configs.markerConfigs;
    if (Array.isArray(configs.markers)) return configs.markers;
    if (typeof configs.configs === "string") return normalizeThemeConfigs(configs.configs);
    if (typeof configs.markerConfigs === "string") return normalizeThemeConfigs(configs.markerConfigs);
    if (typeof configs.markers === "string") return normalizeThemeConfigs(configs.markers);
    const values = Object.values(configs);
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

const inferMatchMode = (config = {}) => {
  if (config.matchMode) return config.matchMode;
  if (config.regex) return "regex";
  if (config.start && config.end) return "enclosure";
  if (config.start) return "prefix";
  return "none";
};

export const normalizeMarkerConfigsSchema = (configs) => {
  const normalized = normalizeThemeConfigs(configs);
  return normalized
    .filter((config) => config && typeof config === "object")
    .map((config) => {
      const matchMode = inferMatchMode(config);
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

export const serializeThemeConfigs = (configs) => {
  const normalized = normalizeMarkerConfigsSchema(configs);
  return JSON.stringify(normalized);
};

export const safeParseThemeConfigsText = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return { value: null, error: "根節點必須是陣列" };
    }
    return { value: normalizeMarkerConfigsSchema(parsed), error: "" };
  } catch (error) {
    return { value: null, error: error?.message || "格式錯誤" };
  }
};
