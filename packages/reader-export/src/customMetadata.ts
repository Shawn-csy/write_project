const normKey = (key: unknown) => String(key || "").trim().toLowerCase().replace(/\s+/g, "");

export const normalizeCustomMetadataEntries = (entries: unknown) => {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => {
      const key = String(entry?.key || "").trim();
      if (!key) return null;
      return {
        key,
        value: String(entry?.value ?? ""),
        type: entry?.type === "divider" ? "divider" : "text",
      };
    })
    .filter(Boolean) as { key: string; value: string; type: "text" | "divider" }[];
};

export const customMetadataEntriesToMeta = (entries: unknown[]): Record<string, string> => {
  const normalized = normalizeCustomMetadataEntries(entries);
  const meta: Record<string, string> = {};
  normalized.forEach((entry) => {
    meta[normKey(entry.key)] = entry.value;
  });
  return meta;
};
