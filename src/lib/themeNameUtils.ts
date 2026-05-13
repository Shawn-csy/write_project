export function normalizeThemeName(name = "") {
  return String(name).toLowerCase().replace(/[\s_()（）\-[\]{}]/g, "");
}

export function isDefaultLikeTheme(theme, { includeDefaultId = true } = {}) {
  if (!theme) return false;
  if (includeDefaultId && theme.id === "default") return true;
  const normalized = normalizeThemeName(theme.name || "");
  return normalized.includes("default") || normalized.includes("預設");
}
