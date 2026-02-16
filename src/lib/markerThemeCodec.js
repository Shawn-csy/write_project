export const normalizeThemeConfigs = (configs) => {
  if (Array.isArray(configs)) return configs;
  if (configs && typeof configs === "object") return Object.values(configs);
  if (typeof configs === "string") {
    try {
      const parsed = JSON.parse(configs);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return Object.values(parsed);
    } catch {
      return [];
    }
  }
  return [];
};

export const serializeThemeConfigs = (configs) => {
  const normalized = normalizeThemeConfigs(configs);
  return JSON.stringify(normalized);
};

export const safeParseThemeConfigsText = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return { value: null, error: "根節點必須是陣列" };
    }
    return { value: normalizeThemeConfigs(parsed), error: "" };
  } catch (error) {
    return { value: null, error: error?.message || "格式錯誤" };
  }
};
