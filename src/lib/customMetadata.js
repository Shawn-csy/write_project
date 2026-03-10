const normKey = (key) => String(key || "").trim().toLowerCase().replace(/\s+/g, "");

export const normalizeCustomMetadataEntries = (entries) => {
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
    .filter(Boolean);
};

export const customMetadataEntriesToMeta = (entries) => {
  const normalized = normalizeCustomMetadataEntries(entries);
  const meta = {};
  normalized.forEach((entry) => {
    meta[normKey(entry.key)] = entry.value;
  });
  return meta;
};

export const customMetadataEntriesToRawEntries = (entries) => {
  return normalizeCustomMetadataEntries(entries).map((entry) => ({
    key: entry.key,
    value: entry.value,
  }));
};

