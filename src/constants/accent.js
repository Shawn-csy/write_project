export const accentThemes = {
  emerald: {
    label: "綠色",
    accent: "160 84% 39%",
    accentForeground: "154 44% 16%",
    accentMuted: "160 60% 92%",
    accentStrong: "160 78% 34%",
  },
  indigo: {
    label: "靛藍",
    accent: "234 89% 67%",
    accentForeground: "233 47% 18%",
    accentMuted: "234 74% 92%",
    accentStrong: "234 79% 60%",
  },
  amber: {
    label: "琥珀",
    accent: "38 92% 50%",
    accentForeground: "28 56% 18%",
    accentMuted: "38 88% 90%",
    accentStrong: "38 90% 44%",
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
      "#10B981",
      "#3B82F6",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#06B6D4",
      "#F97316",
      "#22C55E",
      "#0EA5E9",
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
