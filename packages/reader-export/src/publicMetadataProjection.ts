export type PublicPrefaceFieldKey =
  | "outline"
  | "roleSetting"
  | "backgroundInfo"
  | "performanceInstruction"
  | "openingIntro"
  | "chapterSettings"
  | "situationInfo";

export interface PublicPrefaceFieldDefinition {
  id: PublicPrefaceFieldKey;
  title: string;
  keys: string[];
}

export interface PublicPrefaceItem {
  id: PublicPrefaceFieldKey;
  title: string;
  value: string;
  rawValue?: string;
}

export const normalizePublicMetadataKey = (key: unknown) =>
  String(key || "").trim().toLowerCase().replace(/\s+/g, "");

const normalize = (value: unknown) => String(value ?? "").trim();

const RAW_PUBLIC_PREFACE_FIELD_DEFINITIONS = [
  { id: "outline", title: "大綱", keys: ["outline", "大綱"] },
  { id: "roleSetting", title: "角色設定", keys: ["rolesetting", "角色設定"] },
  { id: "backgroundInfo", title: "背景資訊", keys: ["backgroundinfo", "environmentinfo", "背景資訊"] },
  { id: "performanceInstruction", title: "演繹指示", keys: ["performanceinstruction", "演繹指示"] },
  { id: "openingIntro", title: "作品的開頭引言", keys: ["openingintro", "作品的開頭引言"] },
  { id: "chapterSettings", title: "章節", keys: ["chaptersettings", "章節"] },
  { id: "situationInfo", title: "狀況", keys: ["situationinfo", "狀況", "狀況資訊", "情境"] },
] satisfies PublicPrefaceFieldDefinition[];

export const PUBLIC_PREFACE_FIELD_DEFINITIONS: PublicPrefaceFieldDefinition[] = RAW_PUBLIC_PREFACE_FIELD_DEFINITIONS.map((definition) => ({
  ...definition,
  keys: definition.keys.map(normalizePublicMetadataKey),
}));

const BASE_SYSTEM_KEYS = [
  "author", "authors", "authordisplaymode",
  "license", "授權",
  "licensecommercial", "licensederivative", "licensenotify",
  "licensespecialterms", "licensetags",
  "series", "seriesname", "seriesorder",
  "marker_legend", "show_legend",
  "synopsis", "摘要", "summary", "description", "notes",
  "contact", "聯絡方式",
  "draftdate", "date",
  "title",
  "targetaudience", "觀眾取向",
  "contentrating", "內容分級",
  // activity/event keys
  "activityname", "activitybanner", "activitycontent",
  "activityworkurl", "activitydemolinks", "activitydemourl",
  "eventname", "eventbanner", "eventcontent",
  "eventworklink", "eventdemolinks", "eventdemolink",
];

const PREFACE_SYSTEM_KEYS = PUBLIC_PREFACE_FIELD_DEFINITIONS.flatMap((definition) => definition.keys);

export const PUBLIC_METADATA_SYSTEM_KEYS = new Set(
  [...BASE_SYSTEM_KEYS, ...PREFACE_SYSTEM_KEYS].map(normalizePublicMetadataKey)
);

export const isPublicMetadataSystemKey = (key: unknown) =>
  PUBLIC_METADATA_SYSTEM_KEYS.has(normalizePublicMetadataKey(key));

export const formatStructuredMetadataValue = (raw: string): string => {
  if (!raw) return raw;
  if (!raw.startsWith("{") && !raw.startsWith("[")) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const mode = String(parsed.mode || "");
      if (mode === "multi" && Array.isArray(parsed.items)) {
        return (parsed.items as Array<{ name?: unknown; text?: unknown }>)
          .map((item) => {
            const name = normalize(item.name);
            const text = normalize(item.text);
            if (name && text) return `${name}：${text}`;
            return name || text;
          })
          .filter(Boolean)
          .join(" / ");
      }
      if (mode === "chapter_multi" && Array.isArray(parsed.items)) {
        return (parsed.items as Array<{ chapter?: unknown; environment?: unknown; situation?: unknown }>)
          .map((item) => {
            const chapter = normalize(item.chapter);
            const env = normalize(item.environment);
            const sit = normalize(item.situation);
            const parts = [env && `環境：${env}`, sit && `狀況：${sit}`].filter(Boolean).join("；");
            return chapter ? (parts ? `${chapter}（${parts}）` : chapter) : parts;
          })
          .filter(Boolean)
          .join(" / ");
      }
      if (parsed.value !== undefined) return normalize(parsed.value);
    }
    if (Array.isArray(parsed)) {
      return (parsed as unknown[])
        .map((item) => {
          if (item && typeof item === "object") {
            const name = normalize((item as { name?: unknown }).name);
            const text = normalize((item as { text?: unknown }).text);
            return name && text ? `${name}：${text}` : name || text;
          }
          return normalize(item);
        })
        .filter(Boolean)
        .join(" / ");
    }
  } catch {}
  return raw;
};

export const findPublicPrefaceDefinition = (fieldKey: PublicPrefaceFieldKey) =>
  PUBLIC_PREFACE_FIELD_DEFINITIONS.find((definition) => definition.id === fieldKey);

export const readPublicPrefaceValue = (
  meta: Record<string, unknown>,
  fieldKey: PublicPrefaceFieldKey,
  sourceValue?: unknown
) => {
  const fromSource = normalize(sourceValue);
  if (fromSource) return fromSource;
  const definition = findPublicPrefaceDefinition(fieldKey);
  if (!definition) return "";
  for (const key of definition.keys) {
    const value = normalize(meta[key]);
    if (value) return value;
  }
  return "";
};

export const buildPublicPrefaceItems = (
  meta: Record<string, unknown>,
  sourceValues: Partial<Record<PublicPrefaceFieldKey, unknown>> = {}
): PublicPrefaceItem[] => {
  const items: PublicPrefaceItem[] = [];
  const seen = new Set<string>();
  for (const definition of PUBLIC_PREFACE_FIELD_DEFINITIONS) {
    const rawValue = readPublicPrefaceValue(meta, definition.id, sourceValues[definition.id]);
    const value = formatStructuredMetadataValue(rawValue);
    const sig = `${definition.id}::${value}`;
    if (!value || seen.has(sig)) continue;
    seen.add(sig);
    items.push({ id: definition.id, title: definition.title, value, rawValue });
  }
  return items;
};
