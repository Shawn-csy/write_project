const trimText = (value: unknown) => String(value ?? "").trim();

interface ActivityDemoLink {
  id: string;
  name: string;
  url: string;
  cast: string;
  voiceActorIds?: string[];
  voiceTypes?: Array<"male" | "female">;
  description: string;
}

export const createEmptyActivityDemoLink = (id = "") => ({
  id,
  name: "",
  url: "",
  cast: "",
  voiceActorIds: [],
  voiceTypes: [],
  description: "",
});

const isNonEmptyDemoLink = (entry: ActivityDemoLink) =>
  Boolean(entry.name || entry.url || entry.cast || entry.description);

export const normalizeActivityDemoLinks = (value: unknown): ActivityDemoLink[] => {
  if (!Array.isArray(value)) return [];
  const normalized = value.map<ActivityDemoLink | null>((entry: unknown, idx: number) => {
      if (typeof entry === "string") {
        const url = trimText(entry);
        return {
          id: `demo-${idx + 1}`,
          name: "",
          url,
          cast: "",
          voiceActorIds: [],
          voiceTypes: [],
          description: "",
        };
      }
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      return {
        id: trimText(item.id) || `demo-${idx + 1}`,
        name: trimText(item.name || item.title || item.label),
        url: trimText(item.url || item.link),
        cast: trimText(item.cast || item.voiceActor || item.speaker),
        voiceActorIds: Array.isArray(item.voiceActorIds) ? [...new Set((item.voiceActorIds as unknown[]).map((id: unknown) => trimText(id)).filter(Boolean))] : [],
        voiceTypes: Array.isArray(item.voiceTypes) ? [...new Set((item.voiceTypes as unknown[]).filter((type: unknown): type is "male" | "female" => type === "male" || type === "female"))] : [],
        description: trimText(item.description || item.desc),
      };
    });
  return normalized.filter((entry): entry is ActivityDemoLink => entry !== null).filter(isNonEmptyDemoLink);
};

export const parseActivityDemoLinks = (rawValue: unknown) => {
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

export const serializeActivityDemoLinks = (links: unknown) => {
  const normalized = normalizeActivityDemoLinks(links).map(({ name, url, cast, voiceActorIds, voiceTypes, description }) => ({
    name,
    url,
    cast,
    voiceActorIds,
    voiceTypes,
    description,
  }));
  if (normalized.length === 0) return "";
  return JSON.stringify(normalized);
};
