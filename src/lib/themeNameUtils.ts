export function normalizeThemeName(name = "") {
  return String(name).toLowerCase().replace(/[\s_()（）\-[\]{}]/g, "");
}

interface ThemeLike {
  id?: string;
  name?: string;
}

export function isDefaultLikeTheme(theme: ThemeLike | null | undefined, { includeDefaultId = true }: { includeDefaultId?: boolean } = {}) {
  if (!theme) return false;
  if (includeDefaultId && theme.id === "default") return true;
  const normalized = normalizeThemeName(theme.name || "");
  return normalized.includes("default") || normalized.includes("預設");
}
