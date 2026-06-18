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
  | "contact"
  | "license";

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
  "contact",
  "license",
];

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalize = (value: unknown) => String(value ?? "").trim();

const formatLicense = (commercial: string, derivative: string, notify: string) => [
  commercial ? `商業使用：${commercial === "allow" ? "可" : "不可"}` : "",
  derivative ? `改作許可：${derivative === "allow" ? "可" : derivative === "disallow" ? "不可" : "需同意"}` : "",
  notify ? `修改通知：${notify === "required" ? "需要" : "不需要"}` : "",
].filter(Boolean);

const contactRows = (rawContact: unknown): ExportMetadataField[] => {
  let value = rawContact;
  if (!normalize(value)) return [];
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {}
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => [normalize(key), normalize(val)] as const)
      .filter(([key, val]) => key && val)
      .map(([key, val]) => ({ key: "contact" as const, label: "聯絡", value: `${key}: ${val}` }));
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item)).filter(Boolean).map((item) => ({ key: "contact" as const, label: "聯絡", value: item }));
  }
  return normalize(value)
    .split(/\r?\n|\/|\||；|;|，|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ({ key: "contact" as const, label: "聯絡", value: item }));
};

export const buildExportMetadata = (source: ExportMetadataSource | null | undefined, fallbackTitle = "Script"): ExportMetadata => {
  const meta = customMetadataEntriesToMeta(Array.isArray(source?.customMetadata) ? source.customMetadata : []);
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
  const seriesOrder = normalize(source?.seriesOrder || meta.seriesorder);
  const draftDate = normalize(source?.draftDate || meta.draftdate || meta.date);
  const synopsis = normalize(source?.synopsis || meta.synopsis || meta.summary || meta.description || meta.notes);
  const tags = (source?.tags || [])
    .map((tag) => normalize(typeof tag === "string" ? tag : tag?.name))
    .filter(Boolean);
  const commercial = normalize(source?.licenseCommercial || meta.licensecommercial || source?.persona?.defaultLicenseCommercial).toLowerCase();
  const derivative = normalize(source?.licenseDerivative || meta.licensederivative || source?.persona?.defaultLicenseDerivative).toLowerCase();
  const notify = normalize(source?.licenseNotify || meta.licensenotify || source?.persona?.defaultLicenseNotify).toLowerCase();

  const fields = [
    { key: "title" as const, label: "標題", value: normalize(source?.title) || fallbackTitle || "Script" },
    synopsis ? { key: "synopsis" as const, label: "簡介", value: synopsis } : null,
    organizationName ? { key: "organization" as const, label: "組織", value: organizationName } : null,
    authorName ? { key: "author" as const, label: "作者", value: authorName } : null,
    draftDate ? { key: "date" as const, label: "日期", value: draftDate } : null,
    seriesName ? { key: "series" as const, label: "系列", value: `${seriesName}${seriesOrder ? ` #${seriesOrder}` : ""}` } : null,
    tags.length ? { key: "tags" as const, label: "標籤", value: tags.join("、") } : null,
    ...contactRows(meta.contact),
    ...formatLicense(commercial, derivative, notify).map((value) => ({ key: "license" as const, label: "授權", value })),
  ].filter(Boolean) as ExportMetadataField[];
  const rows = fields
    .filter((field) => field.key !== "title" && field.key !== "synopsis")
    .map((field) => field.key === "license" ? field.value : `${field.label}：${field.value}`);

  return {
    title: normalize(source?.title) || fallbackTitle || "Script",
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
