const trimText = (value) => String(value ?? "").trim();

export const createEmptyActivityDemoLink = (id = "") => ({
  id,
  name: "",
  url: "",
  cast: "",
  description: "",
});

export const normalizeActivityDemoLinks = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, idx) => {
      if (typeof entry === "string") {
        const url = trimText(entry);
        return {
          id: `demo-${idx + 1}`,
          name: "",
          url,
          cast: "",
          description: "",
        };
      }
      if (!entry || typeof entry !== "object") return null;
      return {
        id: trimText(entry.id) || `demo-${idx + 1}`,
        name: trimText(entry.name || entry.title || entry.label),
        url: trimText(entry.url || entry.link),
        cast: trimText(entry.cast || entry.voiceActor || entry.speaker),
        description: trimText(entry.description || entry.desc),
      };
    })
    .filter(Boolean)
    .filter((entry) => entry.name || entry.url || entry.cast || entry.description);
};

export const parseActivityDemoLinks = (rawValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === "") return [];
  let parsed = rawValue;
  for (let i = 0; i < 2; i += 1) {
    if (typeof parsed !== "string") break;
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
  }

  if (Array.isArray(parsed)) {
    return normalizeActivityDemoLinks(parsed);
  }
  if (typeof parsed === "string") {
    return normalizeActivityDemoLinks([parsed]);
  }
  return [];
};

export const serializeActivityDemoLinks = (links) => {
  const normalized = normalizeActivityDemoLinks(links).map(({ name, url, cast, description }) => ({
    name,
    url,
    cast,
    description,
  }));
  if (normalized.length === 0) return "";
  return JSON.stringify(normalized);
};
