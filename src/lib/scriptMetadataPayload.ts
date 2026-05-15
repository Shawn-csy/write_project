import { normalizeActivityDemoLinks, serializeActivityDemoLinks } from "./activityDemoLinks";
import { normalizeCustomMetadataEntries } from "./customMetadata";
import { deriveSimpleLicenseTags } from "./licenseRights";
import type { ContactField, CustomField, LicenseSpecialTerm, SeriesOption, TagLike } from "../hooks/dashboard/types";

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
  seriesOptions?: SeriesOption[];
}

const normalizeMetaKey = (key: unknown) => String(key || "").trim().toLowerCase().replace(/\s+/g, "");
const isAuthorMetaKey = (key: unknown) => {
  const normalized = normalizeMetaKey(key);
  return normalized === "author" || normalized === "authors" || normalized === "authordisplaymode";
};

function resolveSeriesName(fields: ScriptMetadataPayloadFields, seriesOptions: SeriesOption[] = []): string {
  const selectedSeries = seriesOptions.find((item) => item.id === fields.seriesId);
  return String(selectedSeries?.name || fields.seriesName || "").trim();
}

export function buildCustomMetadataEntries(
  fields: ScriptMetadataPayloadFields,
  options: BuildCustomMetadataOptions = {}
): Array<{ key: string; value: string }> {
  const preserveAuthor = options.preserveAuthor === true;
  const effectiveAuthorDisplayMode = fields.authorDisplayMode === "override" ? "override" : "badge";
  const effectiveAuthor = String(fields.author || "");
  const orderedEntries: Array<{ key: string; value: string }> = [];

  if (!preserveAuthor && effectiveAuthorDisplayMode === "override" && effectiveAuthor) {
    orderedEntries.push({ key: "Author", value: effectiveAuthor });
  }
  if (!preserveAuthor) {
    orderedEntries.push({ key: "AuthorDisplayMode", value: effectiveAuthorDisplayMode });
  }
  if (fields.outline) orderedEntries.push({ key: "Outline", value: fields.outline });
  if (fields.roleSetting) orderedEntries.push({ key: "RoleSetting", value: fields.roleSetting });
  if (fields.backgroundInfo) orderedEntries.push({ key: "BackgroundInfo", value: fields.backgroundInfo });
  if (fields.performanceInstruction) orderedEntries.push({ key: "PerformanceInstruction", value: fields.performanceInstruction });
  if (fields.openingIntro) orderedEntries.push({ key: "OpeningIntro", value: fields.openingIntro });
  if (fields.chapterSettings) orderedEntries.push({ key: "ChapterSettings", value: fields.chapterSettings });
  if (fields.activityName) orderedEntries.push({ key: "ActivityName", value: fields.activityName });
  if (fields.activityBannerUrl) orderedEntries.push({ key: "ActivityBanner", value: fields.activityBannerUrl });
  if (fields.activityContent) orderedEntries.push({ key: "ActivityContent", value: fields.activityContent });

  const serializedDemoLinks = serializeActivityDemoLinks(fields.activityDemoLinks);
  const normalizedDemoLinks = normalizeActivityDemoLinks(fields.activityDemoLinks);
  if (serializedDemoLinks) orderedEntries.push({ key: "ActivityDemoLinks", value: serializedDemoLinks });
  if (normalizedDemoLinks[0]?.url) orderedEntries.push({ key: "ActivityDemoUrl", value: normalizedDemoLinks[0].url });
  if (fields.activityWorkUrl) orderedEntries.push({ key: "ActivityWorkUrl", value: fields.activityWorkUrl });

  orderedEntries.push({ key: "LicenseCommercial", value: fields.licenseCommercial });
  orderedEntries.push({ key: "LicenseDerivative", value: fields.licenseDerivative });
  orderedEntries.push({ key: "LicenseNotify", value: fields.licenseNotify });
  if (fields.licenseSpecialTerms && fields.licenseSpecialTerms.length > 0) {
    orderedEntries.push({ key: "LicenseSpecialTerms", value: JSON.stringify(fields.licenseSpecialTerms) });
  }
  const basicTags = deriveSimpleLicenseTags({
    commercialUse: fields.licenseCommercial,
    derivativeUse: fields.licenseDerivative,
    notifyOnModify: fields.licenseNotify,
  });
  if (basicTags.length > 0) orderedEntries.push({ key: "LicenseTags", value: JSON.stringify(basicTags) });

  if (fields.contact || (fields.contactFields && fields.contactFields.length > 0)) {
    const contactVal = fields.contactFields && fields.contactFields.length > 0
      ? JSON.stringify(Object.fromEntries(fields.contactFields.filter((field) => field.key).map((field) => [field.key, field.value])))
      : fields.contact;
    orderedEntries.push({ key: "Contact", value: contactVal });
  }

  if (fields.synopsis) orderedEntries.push({ key: "Synopsis", value: fields.synopsis });
  const resolvedSeriesName = resolveSeriesName(fields, options.seriesOptions || []);
  if (resolvedSeriesName) orderedEntries.push({ key: "Series", value: resolvedSeriesName });
  const parsedSeriesOrder = Number(fields.seriesOrder);
  if (Number.isFinite(parsedSeriesOrder) && parsedSeriesOrder >= 0) {
    orderedEntries.push({ key: "SeriesOrder", value: String(Math.floor(parsedSeriesOrder)) });
  }

  (fields.customFields || []).forEach(({ key, value, type }) => {
    if (type === "divider") {
      orderedEntries.push({ key, value: value || "SECTION" });
    } else if (key && value) {
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
