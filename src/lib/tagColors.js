import { MARKER_COLORS } from "../constants/markerColors";

const paletteIds = MARKER_COLORS.map((c) => c.id);

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }
  return hash;
};

export const getMorandiTagStyle = (tag, allTags = []) => {
  const unique = Array.from(new Set(allTags)).sort();
  const index = unique.indexOf(tag);
  if (index >= 0 && index < paletteIds.length) {
    return { backgroundColor: `var(--marker-color-${paletteIds[index]})`, color: "#fff" };
  }
  if (index >= paletteIds.length) {
    const hash = hashString(tag);
    const hue = hash % 360;
    const sat = 30 + (hash % 20); // 30-49
    const light = 45 + (hash % 15); // 45-59
    return { backgroundColor: `hsl(${hue} ${sat}% ${light}%)`, color: "#fff" };
  }
  const hash = hashString(tag);
  const fallbackId = paletteIds[hash % paletteIds.length];
  return { backgroundColor: `var(--marker-color-${fallbackId})`, color: "#fff" };
};
