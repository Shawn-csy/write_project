export const accentThemes = {
  emerald: {
    label: "冷灰藍",
    accent: "207 18% 54%",
    accentDark: "207 22% 68%",
    accentForeground: "210 24% 20%",
    accentMuted: "208 20% 90%",
    accentStrong: "207 20% 46%",
    accentMutedDark: "208 16% 24%",
    accentStrongDark: "207 24% 74%",
  },
  indigo: {
    label: "暖灰棕",
    accent: "25 20% 57%",
    accentDark: "25 24% 69%",
    accentForeground: "23 26% 22%",
    accentMuted: "26 24% 90%",
    accentStrong: "24 24% 48%",
    accentMutedDark: "24 16% 24%",
    accentStrongDark: "25 26% 74%",
  },
  amber: {
    label: "灰紫",
    accent: "286 14% 58%",
    accentDark: "286 18% 70%",
    accentForeground: "282 20% 22%",
    accentMuted: "287 18% 91%",
    accentStrong: "286 18% 50%",
    accentMutedDark: "286 14% 24%",
    accentStrongDark: "286 22% 75%",
  },
};

export const accentOptions = [
  { value: "emerald", label: accentThemes.emerald.label },
  { value: "indigo", label: accentThemes.indigo.label },
  { value: "amber", label: accentThemes.amber.label },
];

// 共用 class 名稱（底層由 CSS 變數驅動）
export const accentClasses = {
  label: "accent-label",
  folderBg: "accent-folder-bg",
  folderBgDark: "accent-folder-bg-dark",
  folderText: "accent-folder-text",
  folderTextDark: "accent-folder-text-dark",
  fileHoverBg: "accent-file-hover-bg",
  fileActiveBg: "accent-file-active-bg",
  fileActiveText: "accent-file-active-text",
  fileActiveBorder: "accent-border",
  dot: "accent-dot",
  focusRing: "accent-focus-ring",
};

export const defaultAccent = "emerald";

export const buildAccentPalette = (hsl) => {
  const parse = (val) => {
    const parts = (val || "").trim().split(/\s+/);
    if (parts.length < 3) return null;
    const [h, s, l] = parts;
    return {
      h: Number(h),
      s: Number(String(s).replace("%", "")),
      l: Number(String(l).replace("%", "")),
    };
  };
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const parsed = parse(hsl);
  if (!parsed) {
    return [
      "#79B4A9", // Verdigris
      "#9CC69B", // Cambridge Blue
      "#9DB5B2", // Cadet Blue
      "#87A8B3", // Muted Steel Blue
      "#A6B1E1", // Muted Periwinkle
      "#D4A5A5", // Pastel Pink
      "#E3C8A0", // Latte
      "#B7B7A4", // Artichoke
      "#8E8D8A", // Warm Gray
      "#C0A0B9", // Muted Orchid
    ];
  }
  const offsets = [0, 24, -20, 48, -36, 72, -52, 96, -68, 120];
  return offsets.map((off, idx) => {
    const hue = (parsed.h + off + 360) % 360;
    const lightAdjust = off === 0 ? 0 : off > 0 ? 6 : -6;
    const satAdjust = idx % 2 === 0 ? -6 : 4;
    const s = clamp(parsed.s + satAdjust, 25, 95);
    const l = clamp(parsed.l + lightAdjust, 25, 78);
    return `hsl(${hue} ${s}% ${l}%)`;
  });
};

export const buildGrayPalette = () => {
  // 10 階灰度，保留足夠對比以區分角色
  return [
    "hsl(0 0% 12%)",
    "hsl(0 0% 24%)",
    "hsl(0 0% 36%)",
    "hsl(0 0% 48%)",
    "hsl(0 0% 58%)",
    "hsl(0 0% 68%)",
    "hsl(0 0% 76%)",
    "hsl(0 0% 82%)",
    "hsl(0 0% 88%)",
    "hsl(0 0% 94%)",
  ];
};
