import { normalizeActivityDemoLinks } from "./activityDemoLinks";
import { normalizeCustomMetadataEntries } from "./customMetadata";
import { isReservedCustomKey } from "./metadataBoundary";
import type { ContactField, CustomField, LicenseSpecialTerm, TagLike } from "../hooks/dashboard/types";

export interface ScriptMetadataPayloadFields {
  title: string;
  author: string;
  authorDisplayMode: string;
  date: string;
  synopsis: string;
  outline: string;
  roleSetting: string;
  backgroundInfo: string;
  performanceInstruction: string;
  openingIntro: string;
  chapterSettings: string;
  activityName: string;
  activityBannerUrl: string;
  activityContent: string;
  activityDemoLinks: unknown[];
  activityWorkUrl: string;
  contact: string;
  contactFields: ContactField[];
  seriesName: string;
  seriesId: string | null;
  seriesOrder: string | number;
  coverUrl: string;
  status: string;
  licenseCommercial: string;
  licenseDerivative: string;
  licenseNotify: string;
  licenseSpecialTerms: LicenseSpecialTerm[];
  copyright: string;
  identity: string;
  selectedOrgId: string | null;
  currentTags: TagLike[];
  customFields: CustomField[];
}

interface BuildCustomMetadataOptions {
  preserveAuthor?: boolean;
  existingAuthorEntries?: Array<{ key: string; value: string }>;
}

const normalizeMetaKey = (key: unknown) => String(key || "").trim().toLowerCase().replace(/\s+/g, "");
const isAuthorMetaKey = (key: unknown) => {
  const normalized = normalizeMetaKey(key);
  return normalized === "author" || normalized === "authors" || normalized === "authordisplaymode";
};

export function buildCustomMetadataEntries(
  fields: ScriptMetadataPayloadFields,
  options: BuildCustomMetadataOptions = {}
): Array<{ key: string; value: string }> {
  const preserveAuthor = options.preserveAuthor === true;
  const effectiveAuthorDisplayMode = fields.authorDisplayMode === "override" ? "override" : "badge";
  const effectiveAuthor = String(fields.author || "");
  const orderedEntries: Array<{ key: string; value: string }> = [];

  // Author and AuthorDisplayMode are RESERVED_CUSTOM_KEYS owned by structured api.author field.
  // Do NOT write Author or AuthorDisplayMode into customMetadata.
  // (preserveAuthor path handled separately via applyPreservedAuthorEntries in the save hook.)
  // Synopsis/Outline/ActivityName/ActivityBanner/ActivityContent/ActivityWorkUrl/ActivityDemoLinks
  // are RESERVED_CUSTOM_KEYS — owned by structured fields (E1-E6). Do NOT write them into customMetadata.
  if (fields.roleSetting) orderedEntries.push({ key: "RoleSetting", value: fields.roleSetting });
  if (fields.backgroundInfo) orderedEntries.push({ key: "BackgroundInfo", value: fields.backgroundInfo });
  if (fields.performanceInstruction) orderedEntries.push({ key: "PerformanceInstruction", value: fields.performanceInstruction });
  if (fields.openingIntro) orderedEntries.push({ key: "OpeningIntro", value: fields.openingIntro });
  if (fields.chapterSettings) orderedEntries.push({ key: "ChapterSettings", value: fields.chapterSettings });

  // License fields are now owned by structured API fields (licenseCommercial / licenseDerivative / licenseNotify).
  // Do NOT write LicenseCommercial, LicenseDerivative, LicenseNotify, LicenseSpecialTerms, or LicenseTags
  // into customMetadata — they are RESERVED_CUSTOM_KEYS. Legacy read-path in fromApiToDraft is preserved.

  if (fields.contact || (fields.contactFields && fields.contactFields.length > 0)) {
    const contactVal = fields.contactFields && fields.contactFields.length > 0
      ? JSON.stringify(Object.fromEntries(fields.contactFields.filter((field) => field.key).map((field) => [field.key, field.value])))
      : fields.contact;
    orderedEntries.push({ key: "Contact", value: contactVal });
  }

  // Synopsis is a RESERVED_CUSTOM_KEY — now owned by structured api.synopsis field.
  // Series and SeriesOrder are now owned by structured API fields (seriesId / seriesOrder).
  // Do NOT write Series or SeriesOrder into customMetadata — they are RESERVED_CUSTOM_KEYS.

  (fields.customFields || []).forEach(({ key, value, type }) => {
    if (!key || isReservedCustomKey(key)) return;  // never write reserved keys
    if (type === "divider") {
      orderedEntries.push({ key, value: value || "SECTION" });
    } else if (value) {
      orderedEntries.push({ key, value });
    }
  });

  return normalizeCustomMetadataEntries(orderedEntries);
}

export function applyPreservedAuthorEntries(
  entries: Array<{ key: string; value: string }>,
  existingAuthorEntries: Array<{ key: string; value: string }>
): Array<{ key: string; value: string }> {
  return normalizeCustomMetadataEntries([
    ...entries.filter((entry) => !isAuthorMetaKey(entry?.key)),
    ...existingAuthorEntries,
  ]);
}

export function buildJsonPreviewPayload(fields: ScriptMetadataPayloadFields): Record<string, unknown> {
  const customObject: Record<string, unknown> = {};
  (fields.customFields || []).forEach(({ key, value }) => {
    if (key) customObject[key] = value;
  });
  const contactObject: Record<string, unknown> = {};
  (fields.contactFields || []).forEach(({ key, value }) => {
    if (key) contactObject[key] = value;
  });

  return {
    title: fields.title,
    credit: "",
    author: fields.author,
    authorDisplayMode: fields.authorDisplayMode,
    authors: "",
    draftDate: fields.date,
    synopsis: fields.synopsis,
    outline: fields.outline,
    roleSetting: fields.roleSetting,
    backgroundInfo: fields.backgroundInfo,
    performanceInstruction: fields.performanceInstruction,
    openingIntro: fields.openingIntro,
    chapterSettings: fields.chapterSettings,
    activityName: fields.activityName,
    activityBannerUrl: fields.activityBannerUrl,
    activityContent: fields.activityContent,
    activityDemoLinks: normalizeActivityDemoLinks(fields.activityDemoLinks).map(({ name, url, cast, description }) => ({
      name,
      url,
      cast,
      description,
    })),
    activityWorkUrl: fields.activityWorkUrl,
    contact: fields.contact,
    series: fields.seriesName,
    seriesId: fields.seriesId,
    seriesOrder: fields.seriesOrder,
    cover: fields.coverUrl,
    status: fields.status,
    licenseCommercial: fields.licenseCommercial,
    licenseDerivative: fields.licenseDerivative,
    licenseNotify: fields.licenseNotify,
    licenseSpecialTerms: fields.licenseSpecialTerms,
    copyright: fields.copyright,
    publishAs: fields.identity,
    selectedOrgId: fields.selectedOrgId || "",
    tags: (fields.currentTags || []).map((tag) => ({ name: tag.name, color: tag.color })),
    contactFields: contactObject,
    custom: customObject,
  };
}
