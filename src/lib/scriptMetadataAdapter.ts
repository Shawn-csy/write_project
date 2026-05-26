/**
 * Script Metadata Adapter
 *
 * Single mapping layer between API shape ↔ draft state ↔ save payload.
 * All hydration and save logic should flow through these pure functions.
 *
 * See docs/refactor/metadata-boundary.md for the boundary rules.
 */

import { customMetadataEntriesToMeta, customMetadataEntriesToRawEntries, normalizeCustomMetadataEntries } from "./customMetadata";
import { parseActivityDemoLinks } from "./activityDemoLinks";
import { parseBasicLicenseFromMeta } from "./licenseRights";
import { buildCustomFieldsFromRawEntries } from "../hooks/dashboard/scriptMetadataUtils";
import { buildCustomMetadataEntries, applyPreservedAuthorEntries } from "./scriptMetadataPayload";
import type { BaseScriptApi, ScriptUpdatePayload } from "../types/api";
import type { ContactField, CustomField, LicenseSpecialTerm, TagLike } from "../hooks/dashboard/types";

// ---------------------------------------------------------------------------
// Draft type — the single source of truth for in-memory editing state
// ---------------------------------------------------------------------------

export interface ScriptMetadataDraft {
  // Structured API fields
  title: string;
  status: string;
  coverUrl: string;
  coverCrop: { cx?: number; cy?: number; zoom?: number } | null;
  draftDate: string;
  author: string;
  authorDisplayMode: string;
  personaId: string;          // "" means none
  organizationId: string | null;
  seriesId: string | null;
  seriesOrder: string | number;
  seriesName: string;         // display only, derived from seriesOptions on save
  licenseCommercial: string;
  licenseDerivative: string;
  licenseNotify: string;
  licenseSpecialTerms: LicenseSpecialTerm[];
  markerThemeId: string;
  showMarkerLegend: boolean;
  disableCopy: boolean;
  currentTags: TagLike[];
  targetAudience: string;
  contentRating: string;

  // customMetadata-backed content fields (no structured API field)
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
  copyright: string;
  customFields: CustomField[];
}

export function emptyDraft(): ScriptMetadataDraft {
  return {
    title: "",
    status: "Private",
    coverUrl: "",
    coverCrop: null,
    draftDate: "",
    author: "",
    authorDisplayMode: "badge",
    personaId: "",
    organizationId: null,
    seriesId: null,
    seriesOrder: "",
    seriesName: "",
    licenseCommercial: "",
    licenseDerivative: "",
    licenseNotify: "",
    licenseSpecialTerms: [],
    markerThemeId: "default",
    showMarkerLegend: false,
    disableCopy: false,
    currentTags: [],
    targetAudience: "",
    contentRating: "",
    synopsis: "",
    outline: "",
    roleSetting: "",
    backgroundInfo: "",
    performanceInstruction: "",
    openingIntro: "",
    chapterSettings: "",
    activityName: "",
    activityBannerUrl: "",
    activityContent: "",
    activityDemoLinks: [],
    activityWorkUrl: "",
    contact: "",
    contactFields: [],
    copyright: "",
    customFields: [],
  };
}

// ---------------------------------------------------------------------------
// fromApiToDraft — primary hydration path
// ---------------------------------------------------------------------------

export interface FromApiOptions {
  disableAuthorAutofill?: boolean;
  disablePersonaAutofill?: boolean;
  existingCustomFields?: CustomField[];
  existingDraftTouched?: boolean;
}

export function fromApiToDraft(
  api: BaseScriptApi,
  opts: FromApiOptions = {}
): ScriptMetadataDraft {
  const draft = emptyDraft();

  // --- Structured API fields ---
  draft.title = api.title || "";
  draft.status = String(api.status || (api.isPublic ? "Public" : "Private"));
  draft.coverUrl = String(api.coverUrl || "");
  draft.coverCrop = (api as { coverCrop?: { cx?: number; cy?: number; zoom?: number } | null }).coverCrop ?? null;
  draft.draftDate = String(api.draftDate || "");
  // disableAuthorAutofill suppresses ALL author population (structured + legacy)
  if (!opts.disableAuthorAutofill) {
    draft.author = String(api.author && typeof api.author === "string" ? api.author : "");
  }
  draft.markerThemeId = String(api.markerThemeId || "default");
  draft.disableCopy = Boolean(api.disableCopy);
  draft.currentTags = Array.isArray(api.tags) ? (api.tags as TagLike[]) : [];
  draft.licenseCommercial = String(api.licenseCommercial || "");
  draft.licenseDerivative = String(api.licenseDerivative || "");
  draft.licenseNotify = String(api.licenseNotify || "");
  draft.seriesId = api.seriesId ?? null;
  draft.seriesOrder = api.seriesOrder ?? "";
  draft.seriesName = String(api.series?.name || "");
  draft.organizationId = api.organizationId ?? null;

  // persona / identity
  if (api.personaId) {
    draft.personaId = api.personaId;
    draft.organizationId = api.organizationId ?? null;
  } else if (!opts.disablePersonaAutofill) {
    const preferred = typeof localStorage !== "undefined"
      ? localStorage.getItem("preferredPersonaId")
      : null;
    draft.personaId = preferred ?? "";
  }

  // --- Tags → audience / rating ---
  const tagNames = draft.currentTags.map((t) => String(t.name || "").toLowerCase());
  if (tagNames.includes("男性向")) draft.targetAudience = "男性向";
  else if (tagNames.includes("女性向")) draft.targetAudience = "女性向";
  else if (tagNames.includes("全性向")) draft.targetAudience = "全性向";
  if (tagNames.some((n) => ["r-18", "r18", "18+", "成人向"].includes(n))) {
    draft.contentRating = "成人向";
  } else if (tagNames.some((n) => ["一般", "一般內容", "全年齡向"].includes(n))) {
    draft.contentRating = "全年齡向";
  }

  // --- customMetadata legacy read ---
  const rawEntries = customMetadataEntriesToRawEntries(api.customMetadata || []);
  const meta = customMetadataEntriesToMeta(api.customMetadata || []);

  // title fallback from custom
  draft.title = draft.title || String(meta.title || "");

  // author from custom (legacy fallback)
  if (!opts.disableAuthorAutofill) {
    const legacyAuthor = String(meta.author || meta.authors || "");
    draft.author = draft.author || legacyAuthor;
    const rawMode = String(meta.authordisplaymode || meta.authorDisplayMode || "").trim().toLowerCase();
    draft.authorDisplayMode =
      rawMode === "override" || rawMode === "badge"
        ? rawMode
        : draft.author ? "override" : "badge";
  }

  // license from custom (legacy fallback — superseded by structured fields)
  const basicLicense = parseBasicLicenseFromMeta(meta);
  draft.licenseCommercial = draft.licenseCommercial || String(basicLicense.commercialUse || "");
  draft.licenseDerivative = draft.licenseDerivative || String(basicLicense.derivativeUse || "");
  draft.licenseNotify = draft.licenseNotify || String(basicLicense.notifyOnModify || "");
  const rawSpecialTerms = meta.licensespecialterms ?? meta.licenseSpecialTerms;
  const legacySpecialTerms: string[] = Array.isArray(rawSpecialTerms)
    ? (rawSpecialTerms as unknown[]).map((v) => String(v))
    : [];
  draft.licenseSpecialTerms = legacySpecialTerms;

  // series from custom (legacy fallback)
  draft.seriesName = draft.seriesName || String(meta.series || meta.seriesname || "");
  if (!draft.seriesId) {
    const legacyOrder = meta.seriesorder ?? meta.seriesOrder;
    if (legacyOrder !== undefined) draft.seriesOrder = String(legacyOrder);
  }

  // marker legend from custom
  if (meta.marker_legend !== undefined) draft.showMarkerLegend = String(meta.marker_legend) === "true";
  else if (meta.show_legend !== undefined) draft.showMarkerLegend = String(meta.show_legend) === "true";

  // copyright
  draft.copyright = String(meta.copyright || "");

  // content-only custom fields
  draft.synopsis = String(meta.synopsis || meta.summary || meta.description || meta.notes || "");
  draft.outline = String(meta.outline || "");
  draft.roleSetting = String(meta.rolesetting || "");
  draft.backgroundInfo = String(meta.backgroundinfo || "");
  draft.performanceInstruction = String(meta.performanceinstruction || "");
  draft.openingIntro = String(meta.openingintro || meta.setting || meta.settingintro || "");
  draft.chapterSettings = String(meta.chaptersettings || "");
  draft.activityName = String(meta.activityname || meta.eventname || "");
  draft.activityBannerUrl = String(meta.activitybanner || meta.eventbanner || "");
  draft.activityContent = String(meta.activitycontent || meta.eventcontent || "");
  draft.activityWorkUrl = String(meta.activityworkurl || meta.eventworklink || "");

  const parsedDemoLinks = parseActivityDemoLinks(meta.activitydemolinks || meta.eventdemolinks);
  if (parsedDemoLinks.length > 0) {
    draft.activityDemoLinks = parsedDemoLinks;
  } else {
    const legacyUrl = String(meta.activitydemourl || meta.eventdemolink || "").trim();
    draft.activityDemoLinks = legacyUrl
      ? [{ id: "demo-1", name: "", url: legacyUrl, cast: "", description: "" }]
      : [];
  }

  const rawContact = String(meta.contact || "");
  draft.contact = rawContact;

  // custom fields (user-defined) — don't overwrite if user already edited
  if (!opts.existingDraftTouched && (opts.existingCustomFields || []).length === 0) {
    draft.customFields = buildCustomFieldsFromRawEntries(rawEntries);
  } else {
    draft.customFields = opts.existingCustomFields || [];
  }

  return draft;
}

// ---------------------------------------------------------------------------
// fromDraftToPayload — save path
// ---------------------------------------------------------------------------

export interface FromDraftOptions {
  preserveAuthor?: boolean;
  existingAuthorEntries?: Array<{ key: string; value: string }>;
}

export function fromDraftToPayload(
  draft: ScriptMetadataDraft,
  opts: FromDraftOptions = {}
): ScriptUpdatePayload & { author?: string } {

  const effectiveAuthorDisplayMode = draft.authorDisplayMode === "override" ? "override" : "badge";
  const effectiveAuthor = String(draft.author || "");
  const persistedAuthor = effectiveAuthorDisplayMode === "override" ? effectiveAuthor : "";
  const shouldPreserve = opts.preserveAuthor === true;

  let customMetadata = buildCustomMetadataEntries(
    {
      title: draft.title,
      author: draft.author,
      authorDisplayMode: draft.authorDisplayMode,
      date: draft.draftDate,
      synopsis: draft.synopsis,
      outline: draft.outline,
      roleSetting: draft.roleSetting,
      backgroundInfo: draft.backgroundInfo,
      performanceInstruction: draft.performanceInstruction,
      openingIntro: draft.openingIntro,
      chapterSettings: draft.chapterSettings,
      activityName: draft.activityName,
      activityBannerUrl: draft.activityBannerUrl,
      activityContent: draft.activityContent,
      activityDemoLinks: draft.activityDemoLinks,
      activityWorkUrl: draft.activityWorkUrl,
      contact: draft.contact,
      contactFields: draft.contactFields,
      seriesName: draft.seriesName,
      seriesId: draft.seriesId,
      seriesOrder: draft.seriesOrder,
      coverUrl: draft.coverUrl,
      status: draft.status,
      licenseCommercial: draft.licenseCommercial,
      licenseDerivative: draft.licenseDerivative,
      licenseNotify: draft.licenseNotify,
      licenseSpecialTerms: draft.licenseSpecialTerms,
      copyright: draft.copyright,
      identity: draft.personaId ? `persona:${draft.personaId}` : "",
      selectedOrgId: draft.organizationId,
      currentTags: draft.currentTags,
      customFields: draft.customFields,
    },
    {
      preserveAuthor: shouldPreserve,
      existingAuthorEntries: opts.existingAuthorEntries,
    }
  );

  if (draft.showMarkerLegend) {
    customMetadata = normalizeCustomMetadataEntries([
      ...customMetadata,
      { key: "marker_legend", value: "true" },
    ]);
  }

  if (shouldPreserve && opts.existingAuthorEntries) {
    customMetadata = applyPreservedAuthorEntries(customMetadata, opts.existingAuthorEntries);
  }

  const payload: ScriptUpdatePayload & { author?: string } = {
    title: draft.title,
    coverUrl: draft.coverUrl,
    coverCrop: draft.coverCrop ?? null,
    status: draft.status,
    customMetadata,
    draftDate: draft.draftDate,
    personaId: draft.personaId || null,
    organizationId: draft.organizationId || null,
    licenseCommercial: draft.licenseCommercial || "",
    licenseDerivative: draft.licenseDerivative || "",
    licenseNotify: draft.licenseNotify || "",
    markerThemeId: draft.markerThemeId,
    disableCopy: draft.disableCopy,
    seriesId: draft.seriesId || null,
    seriesOrder:
      Number.isFinite(Number(draft.seriesOrder)) && Number(draft.seriesOrder) >= 0
        ? Math.floor(Number(draft.seriesOrder))
        : null,
  };

  if (!shouldPreserve) {
    payload.author = persistedAuthor;
  }

  return payload;
}
