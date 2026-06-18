import { customMetadataEntriesToMeta } from "./customMetadata";

// Minimal interface — enough for buildExportMetadataDocsBlocks return type.
export interface GoogleDocsBlock {
  runs: Array<{ text: string; bold?: boolean; italic?: boolean }>;
}

export interface ExportMetadataSource {
  title?: unknown;
  synopsis?: unknown;
  author?: unknown;
  draftDate?: unknown;
  customMetadata?: unknown[];
  tags?: Array<string | { name?: string }>;
  organization?: { name?: string; displayName?: string } | null;
  persona?: { displayName?: string; name?: string; defaultLicenseCommercial?: string; defaultLicenseDerivative?: string; defaultLicenseNotify?: string } | null;
  owner?: { displayName?: string; name?: string } | null;
  series?: { name?: string } | null;
  seriesOrder?: unknown;
  licenseCommercial?: unknown;
  licenseDerivative?: unknown;
  licenseNotify?: unknown;
  licenseSpecialTerms?: unknown[];
  targetAudience?: unknown;
  contentRating?: unknown;
  outline?: unknown;
  activityName?: unknown;
  activityContent?: unknown;
  demoLinks?: unknown[];
  coverUrl?: unknown;
}

export interface ExportMetadata {
  title: string;
  synopsis: string;
  fields: ExportMetadataField[];
  rows: string[];
}

export type ExportMetadataFieldKey =
  | "title"
  | "synopsis"
  | "organization"
  | "author"
  | "date"
  | "series"
  | "tags"
  | "audience"
  | "outline"
  | "roleSetting"
  | "backgroundInfo"
  | "performanceInstruction"
  | "openingIntro"
  | "chapterSettings"
  | "situationInfo"
  | "customField"
  | "activity"
  | "demoLink"
  | "contact"
  | "license"
  | "specialTerms";

export interface ExportMetadataField {
  key: ExportMetadataFieldKey;
  label: string;
  value: string;
}

export const EXPORT_METADATA_FIELD_ORDER: ExportMetadataFieldKey[] = [
  "title",
  "synopsis",
  "organization",
  "author",
  "date",
  "series",
  "tags",
  "audience",
  "outline",
  "roleSetting",
  "backgroundInfo",
  "performanceInstruction",
  "openingIntro",
  "chapterSettings",
  "situationInfo",
  "customField",
  "activity",
  "demoLink",
  "contact",
  "license",
  "specialTerms",
];

// Keys handled by dedicated structured fields — must not appear as customField rows.
const RESERVED_META_KEYS = new Set([
  "author", "authors", "authordisplaymode",
  "licensecommercial", "licensederivative", "licensenotify",
  "licensespecialterms", "licensetags",
  "series", "seriesorder",
  "marker_legend", "show_legend",
  "synopsis",
  // activity/event keys — handled via dedicated source fields, not customField
  "activityname", "activitybanner", "activitycontent",
  "activityworkurl", "activitydemolinks", "activitydemourl",
  "eventname", "eventbanner", "eventcontent",
  "eventworklink", "eventdemolinks", "eventdemolink",
  // preface fields — mapped to public labels
  "outline", "大綱",
  "rolesetting", "角色設定",
  "backgroundinfo", "environmentinfo", "背景資訊",
  "performanceinstruction", "演繹指示",
  "openingintro", "作品的開頭引言",
  "chaptersettings", "章節",
  "situationinfo", "狀況", "狀況資訊", "情境",
  // title override from customMetadata
  "title",
  "contact",
  // tag-derived
  "targetaudience", "contentrating",
]);

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalize = (value: unknown) => String(value ?? "").trim();

/**
 * Decodes a structured metadata value that may be stored as a JSON string.
 *
 * RoleSetting (and ChapterSettings) from the import pipeline are stored as
 * JSON: { mode: "multi", items: [{name, text}, ...] }.
 * For display we flatten to "名前：説明 / ..." readable form.
 * Plain strings are returned as-is.
 */
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
      // single-value wrapper { value: "..." }
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

const formatLicense = (commercial: string, derivative: string, notify: string) => [
  commercial ? `商業使用：${commercial === "allow" ? "可" : "不可"}` : "",
  derivative ? `改作許可：${derivative === "allow" ? "可" : derivative === "disallow" ? "不可" : "需同意"}` : "",
  notify ? `修改通知：${notify === "required" ? "需要" : "不需要"}` : "",
].filter(Boolean);

const contactRows = (rawContact: unknown): ExportMetadataField[] => {
  let value = rawContact;
  if (!normalize(value)) return [];
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch {}
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => [normalize(key), normalize(val)] as const)
      .filter(([key, val]) => key && val)
      .map(([key, val]) => ({ key: "contact" as const, label: "聯絡", value: `${key}: ${val}` }));
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item)).filter(Boolean)
      .map((item) => ({ key: "contact" as const, label: "聯絡", value: item }));
  }
  return normalize(value)
    .split(/\r?\n|\/|\||；|;|，|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ({ key: "contact" as const, label: "聯絡", value: item }));
};

export const buildExportMetadata = (source: ExportMetadataSource | null | undefined, fallbackTitle = "Script"): ExportMetadata => {
  const rawEntries = Array.isArray(source?.customMetadata) ? source.customMetadata : [];
  const meta = customMetadataEntriesToMeta(rawEntries);

  // Title fallback: source → customMetadata.Title → fallbackTitle
  const titleValue = normalize(source?.title) || normalize(meta.title) || fallbackTitle || "Script";

  const authorOverride = normalize(meta.author);
  const authorDisplayMode = normalize(meta.authordisplaymode).toLowerCase();
  const authorName = (
    authorDisplayMode === "override" && authorOverride
      ? authorOverride
      : normalize(source?.persona?.displayName || source?.persona?.name)
        || normalize(source?.owner?.displayName || source?.owner?.name)
        || (source?.author && typeof source.author === "object"
          ? normalize((source.author as { displayName?: string; name?: string }).displayName || (source.author as { displayName?: string; name?: string }).name)
          : "")
        || normalize(source?.author)
        || authorOverride
        || normalize(meta.authors)
  );
  const organizationName = normalize(source?.organization?.name || source?.organization?.displayName);
  const seriesName = normalize(source?.series?.name || meta.series || meta.seriesname);
  // seriesOrder: 0 is valid — use nullish check, not || fallback
  const rawSeriesOrder = source?.seriesOrder != null ? source.seriesOrder : meta.seriesorder;
  const seriesOrder = normalize(rawSeriesOrder);
  const draftDate = normalize(source?.draftDate || meta.draftdate || meta.date);
  const synopsis = normalize(source?.synopsis || meta.synopsis || meta.summary || meta.description || meta.notes);

  const allTags = (source?.tags || []).map((tag) => normalize(typeof tag === "string" ? tag : tag?.name)).filter(Boolean);
  const AUDIENCE_TOKENS = new Set(["男性向", "女性向", "全性向"]);
  const RATING_TOKENS = new Set(["成人向", "全年齡向"]);
  const displayTags = allTags.filter((t) => !AUDIENCE_TOKENS.has(t) && !RATING_TOKENS.has(t));
  const audienceTag = allTags.find((t) => AUDIENCE_TOKENS.has(t)) || "";
  const ratingTag = allTags.find((t) => RATING_TOKENS.has(t)) || "";
  // P2: also read targetAudience/contentRating from customMetadata (for public overlay alignment)
  const targetAudience = normalize(source?.targetAudience || meta.targetaudience || audienceTag);
  const contentRating = normalize(source?.contentRating || meta.contentrating || ratingTag);
  const audienceValue = [targetAudience, contentRating].filter(Boolean).join("・");

  const commercial = normalize(source?.licenseCommercial || meta.licensecommercial || source?.persona?.defaultLicenseCommercial).toLowerCase();
  const derivative = normalize(source?.licenseDerivative || meta.licensederivative || source?.persona?.defaultLicenseDerivative).toLowerCase();
  const notify = normalize(source?.licenseNotify || meta.licensenotify || source?.persona?.defaultLicenseNotify).toLowerCase();

  // licenseSpecialTerms: prefer source top-level, fallback to meta (legacy)
  const rawSpecialTerms = Array.isArray(source?.licenseSpecialTerms)
    ? source.licenseSpecialTerms
    : (() => {
        const legacyRaw = meta.licensespecialterms;
        if (!legacyRaw) return [];
        if (typeof legacyRaw === "string") {
          try {
            const parsed = JSON.parse(legacyRaw);
            if (Array.isArray(parsed)) return parsed;
          } catch {}
          return legacyRaw ? [legacyRaw] : [];
        }
        return [];
      })();
  const specialTerms = (rawSpecialTerms as unknown[])
    .map((item) => normalize(typeof item === "object" && item !== null ? (item as { text?: string }).text ?? item : item))
    .filter(Boolean);

  // Preface fields — map customMetadata keys to public labels, decode structured JSON
  const getPreface = (...keys: string[]) => {
    for (const k of keys) {
      const v = normalize((meta as Record<string, unknown>)[k]);
      if (v) return v;
    }
    return "";
  };
  const outlineValue = normalize(source?.outline) || getPreface("outline", "大綱");
  const roleSetting = formatStructuredMetadataValue(getPreface("rolesetting", "角色設定"));
  const backgroundInfo = getPreface("backgroundinfo", "environmentinfo", "背景資訊");
  const performanceInstruction = formatStructuredMetadataValue(getPreface("performanceinstruction", "演繹指示"));
  const openingIntro = getPreface("openingintro", "作品的開頭引言");
  const chapterSettings = formatStructuredMetadataValue(getPreface("chaptersettings", "章節"));
  const situationInfo = getPreface("situationinfo", "狀況", "狀況資訊", "情境");

  // P1b: activity fields — read from source top-level (Next: PublicScript structured fields)
  // then fallback to customMetadata legacy keys
  const activityName = normalize(source?.activityName || meta.activityname || meta.eventname);
  const activityContent = normalize(source?.activityContent || meta.activitycontent || meta.eventcontent);
  const rawDemoLinks: Array<{ name?: unknown; url?: unknown }> = Array.isArray(source?.demoLinks)
    ? (source.demoLinks as Array<{ name?: unknown; url?: unknown }>)
    : (() => {
        const raw = meta.activitydemolinks || meta.activitydemourl || meta.eventdemolinks || meta.eventdemolink;
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed as Array<{ name?: unknown; url?: unknown }>;
        } catch {}
        if (raw) return [{ url: raw }];
        return [];
      })();
  const demoLinkRows: ExportMetadataField[] = rawDemoLinks
    .map((link) => {
      const url = normalize(link.url);
      const name = normalize(link.name);
      return url ? { key: "demoLink" as const, label: "試聽範例", value: name ? `${name}：${url}` : url } : null;
    })
    .filter(Boolean) as ExportMetadataField[];

  // arbitrary non-reserved customMetadata entries
  const customFieldRows: ExportMetadataField[] = (rawEntries as Array<{ key?: unknown; value?: unknown }>)
    .map((entry) => ({
      normalizedKey: normalize(entry?.key).toLowerCase().replace(/\s+/g, ""),
      label: normalize(entry?.key),
      value: normalize(entry?.value),
    }))
    .filter(({ normalizedKey, value }) => normalizedKey && value && !RESERVED_META_KEYS.has(normalizedKey))
    .map(({ label, value }) => ({ key: "customField" as const, label, value }));

  const fields = [
    { key: "title" as const, label: "標題", value: titleValue },
    synopsis ? { key: "synopsis" as const, label: "簡介", value: synopsis } : null,
    organizationName ? { key: "organization" as const, label: "組織", value: organizationName } : null,
    authorName ? { key: "author" as const, label: "作者", value: authorName } : null,
    draftDate ? { key: "date" as const, label: "日期", value: draftDate } : null,
    seriesName ? { key: "series" as const, label: "系列", value: `${seriesName}${seriesOrder !== "" ? ` #${seriesOrder}` : ""}` } : null,
    displayTags.length ? { key: "tags" as const, label: "標籤", value: displayTags.join("、") } : null,
    audienceValue ? { key: "audience" as const, label: "觀眾", value: audienceValue } : null,
    outlineValue ? { key: "outline" as const, label: "大綱", value: outlineValue } : null,
    roleSetting ? { key: "roleSetting" as const, label: "角色設定", value: roleSetting } : null,
    backgroundInfo ? { key: "backgroundInfo" as const, label: "背景資訊", value: backgroundInfo } : null,
    performanceInstruction ? { key: "performanceInstruction" as const, label: "演繹指示", value: performanceInstruction } : null,
    openingIntro ? { key: "openingIntro" as const, label: "作品的開頭引言", value: openingIntro } : null,
    chapterSettings ? { key: "chapterSettings" as const, label: "章節", value: chapterSettings } : null,
    situationInfo ? { key: "situationInfo" as const, label: "狀況", value: situationInfo } : null,
    ...customFieldRows,
    activityName ? { key: "activity" as const, label: "活動", value: activityContent ? `${activityName}：${activityContent}` : activityName } : null,
    activityContent && !activityName ? { key: "activity" as const, label: "活動說明", value: activityContent } : null,
    ...demoLinkRows,
    ...contactRows(meta.contact),
    ...formatLicense(commercial, derivative, notify).map((value) => ({ key: "license" as const, label: "授權", value })),
    ...specialTerms.map((term) => ({ key: "specialTerms" as const, label: "特殊條款", value: term })),
  ].filter(Boolean) as ExportMetadataField[];

  const rows = fields
    .filter((field) => field.key !== "title" && field.key !== "synopsis")
    .map((field) => field.key === "license" ? field.value : `${field.label}：${field.value}`);

  return {
    title: titleValue,
    synopsis,
    fields,
    rows,
  };
};

export const filterExportMetadata = (
  metadata: ExportMetadata,
  selectedKeys: Iterable<ExportMetadataFieldKey> = EXPORT_METADATA_FIELD_ORDER
): ExportMetadata => {
  const selected = new Set(selectedKeys);
  const fields = metadata.fields.filter((field) => selected.has(field.key));
  return {
    title: selected.has("title") ? metadata.title : "",
    synopsis: selected.has("synopsis") ? metadata.synopsis : "",
    fields,
    rows: fields
      .filter((field) => field.key !== "title" && field.key !== "synopsis")
      .map((field) => field.key === "license" ? field.value : `${field.label}：${field.value}`),
  };
};

export const buildExportMetadataHtml = (metadata: ExportMetadata, coverUrl?: unknown): string => {
  const safeCoverUrl = normalize(coverUrl);
  if (!metadata.title && !metadata.synopsis && metadata.rows.length === 0) return "";
  return `
    <section style="margin-bottom:20px;">
      ${safeCoverUrl ? `
        <div style="margin-bottom:14px;">
          <img src="${escapeHtml(safeCoverUrl)}" alt="${escapeHtml(metadata.title)}" style="width:100%;max-height:360px;object-fit:cover;border-radius:10px;border:1px solid #d6d9e0;" />
        </div>
      ` : ""}
      ${metadata.title ? `<h1 style="margin:0 0 8px 0;font-size:28px;line-height:1.25;">${escapeHtml(metadata.title)}</h1>` : ""}
      ${metadata.synopsis ? `<p style="margin:0 0 12px 0;color:#4b5563;white-space:pre-wrap;">${escapeHtml(metadata.synopsis)}</p>` : ""}
      ${metadata.rows.length ? `
        <div style="padding:10px 12px;border:1px solid #d6d9e0;border-radius:10px;background:#f8fafc;">
          ${metadata.rows.map((row) => `<div style="font-size:12px;line-height:1.6;color:#374151;">${escapeHtml(row)}</div>`).join("")}
        </div>
      ` : ""}
    </section>
  `.trim();
};

export const buildExportMetadataDocsBlocks = (metadata: ExportMetadata): GoogleDocsBlock[] => {
  const blocks: GoogleDocsBlock[] = [];
  if (metadata.title) blocks.push({ runs: [{ text: metadata.title, bold: true }] });
  if (metadata.synopsis) blocks.push({ runs: [{ text: metadata.synopsis, italic: true }] });
  metadata.rows.forEach((row) => blocks.push({ runs: [{ text: row }] }));
  if (blocks.length > 0) blocks.push({ runs: [] });
  return blocks;
};

export const buildExportMetadataRows = (metadata: ExportMetadata): string[] => [
  metadata.title,
  ...(metadata.synopsis ? [metadata.synopsis] : []),
  ...metadata.rows,
].filter(Boolean);
