import { normalizeActivityDemoLinks } from "./activityDemoLinks";
import type { CoverDesign } from "../types/coverDesign";

interface PrefaceItem {
  id: string;
  title: string;
  value: string;
}

interface AuthorLike {
  id?: string;
  displayName?: string;
  avatarUrl?: string;
  avatarCrop?: { cx?: number; cy?: number; zoom?: number } | null;
}

interface OrganizationLike {
  id?: string;
  name?: string;
  logoUrl?: string;
  logoCrop?: { cx?: number; cy?: number; zoom?: number } | null;
}

interface BuildProjectionInput {
  title?: string;
  synopsis?: string;
  coverUrl?: string | null;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  coverDesign?: CoverDesign | null;
  author?: AuthorLike | null;
  organization?: OrganizationLike | null;
  tags?: string[];
  targetAudience?: string;
  contentRating?: string;
  customFields?: Array<{ key?: string; value?: string }>;
  prefaceItems?: PrefaceItem[];
  contact?: unknown;
  license?: string;
  commercialUse?: string;
  derivativeUse?: string;
  notifyOnModify?: string;
  licenseSpecialTerms?: unknown[];
  activity?: {
    name?: string;
    bannerUrl?: string;
    bannerCrop?: { cx?: number; cy?: number; zoom?: number } | null;
    content?: string;
    demoUrl?: string;
    demoLinks?: unknown[];
    workUrl?: string;
  };
  showMarkerLegend?: boolean;
  content?: string;
}

const normalizePrefaceKey = (key = "") =>
  String(key || "").trim().toLowerCase().replace(/\s+/g, "");

const PREFACE_RULES = [
  { id: "outline", title: "大綱", keys: ["outline", "大綱"] },
  { id: "rolesetting", title: "角色設定", keys: ["rolesetting", "角色設定"] },
  { id: "backgroundinfo", title: "背景資訊", keys: ["backgroundinfo", "背景資訊"] },
  { id: "performanceinstruction", title: "演繹指示", keys: ["performanceinstruction", "演繹指示"] },
  { id: "openingintro", title: "作品的開頭引言", keys: ["openingintro", "作品的開頭引言"] },
  { id: "chaptersettings", title: "章節", keys: ["chaptersettings"] },
].map((rule) => ({ ...rule, keys: rule.keys.map(normalizePrefaceKey) }));

export const buildPrefaceItemsFromMeta = (meta: Record<string, string> = {}) => {
  const valueByKey = new Map<string, string>();
  Object.entries(meta || {}).forEach(([key, value]) => {
    const normalizedKey = normalizePrefaceKey(key);
    const normalizedValue = String(value || "").trim();
    if (!normalizedKey || !normalizedValue || valueByKey.has(normalizedKey)) return;
    valueByKey.set(normalizedKey, normalizedValue);
  });

  const items: PrefaceItem[] = [];
  const seen = new Set<string>();
  PREFACE_RULES.forEach((rule) => {
    const key = rule.keys.find((k) => valueByKey.has(k));
    if (!key) return;
    const value = valueByKey.get(key);
    const signature = `${rule.id}::${value}`;
    if (!value || seen.has(signature)) return;
    seen.add(signature);
    items.push({ id: rule.id, title: rule.title, value });
  });
  return items;
};

export const buildPrefaceItemsFromSections = (
  sections: {
    outline?: string;
    roleSetting?: string;
    backgroundInfo?: string;
    performanceInstruction?: string;
    openingIntro?: string;
    chapterSettings?: string;
  },
  customFields: Array<{ type?: string; label?: string; value?: string }> = []
) => {
  const baseItems: PrefaceItem[] = [
    { id: "outline", title: "大綱", value: String(sections.outline || "").trim() },
    { id: "rolesetting", title: "角色設定", value: String(sections.roleSetting || "").trim() },
    { id: "backgroundinfo", title: "背景資訊", value: String(sections.backgroundInfo || "").trim() },
    { id: "performanceinstruction", title: "演繹指示", value: String(sections.performanceInstruction || "").trim() },
    { id: "openingintro", title: "作品的開頭引言", value: String(sections.openingIntro || "").trim() },
    { id: "chaptersettings", title: "章節", value: String(sections.chapterSettings || "").trim() },
  ].filter((item) => item.value);

  const customItems: PrefaceItem[] = customFields
    .filter((field) => field.type !== "divider")
    .map((field, idx) => ({
      id: `custom-${idx + 1}`,
      title: String(field.label || "").trim() || `自訂欄位 ${idx + 1}`,
      value: String(field.value || "").trim(),
    }))
    .filter((item) => item.value);

  return [...baseItems, ...customItems];
};

export function buildPublicReaderProjection(input: BuildProjectionInput) {
  const normalizedTags = (Array.isArray(input.tags) ? input.tags : [])
    .map((tag) => String(tag || "").trim())
    .filter(Boolean);

  const normalizedCustomFields = (Array.isArray(input.customFields) ? input.customFields : [])
    .map((field) => ({
      key: String(field?.key || "").trim(),
      value: String(field?.value || "").trim(),
    }))
    .filter((field) => field.key || field.value);

  const normalizedLicenseSpecialTerms = (Array.isArray(input.licenseSpecialTerms) ? input.licenseSpecialTerms : [])
    .map((item) => String((item as { text?: string } | null)?.text || item || "").trim())
    .filter(Boolean);

  return {
    title: input.title || "未命名劇本",
    synopsis: String(input.synopsis || "").trim(),
    coverUrl: input.coverUrl || "",
    coverCrop: input.coverCrop || null,
    coverDesign: input.coverDesign || null,
    author: input.author || null,
    organization: input.organization || null,
    license: String(input.license || "").trim(),
    tags: normalizedTags,
    targetAudience: String(input.targetAudience || "").trim(),
    contentRating: String(input.contentRating || "").trim(),
    customFields: normalizedCustomFields,
    prefaceItems: Array.isArray(input.prefaceItems) ? input.prefaceItems : [],
    contact: input.contact || {},
    commercialUse: String(input.commercialUse || "").trim(),
    derivativeUse: String(input.derivativeUse || "").trim(),
    notifyOnModify: String(input.notifyOnModify || "").trim(),
    licenseSpecialTerms: normalizedLicenseSpecialTerms,
    activity: {
      name: String(input.activity?.name || "").trim(),
      bannerUrl: String(input.activity?.bannerUrl || "").trim(),
      bannerCrop: input.activity?.bannerCrop || null,
      content: String(input.activity?.content || "").trim(),
      demoUrl: String(input.activity?.demoUrl || "").trim(),
      demoLinks: normalizeActivityDemoLinks(input.activity?.demoLinks || []),
      workUrl: String(input.activity?.workUrl || "").trim(),
    },
    showMarkerLegend: Boolean(input.showMarkerLegend),
    content: String(input.content || ""),
  };
}
