/**
 * Script Metadata Adapter
 *
 * Single mapping layer between API shape ↔ draft state ↔ save payload.
 * All hydration and save logic should flow through these pure functions.
 *
 * See docs/refactor/metadata-boundary.md for the boundary rules.
 */

import { customMetadataEntriesToMeta, customMetadataEntriesToRawEntries, normalizeCustomMetadataEntries } from "./customMetadata";
import { parseActivityDemoLinks, serializeActivityDemoLinks } from "./activityDemoLinks";
import { buildCustomFieldsFromRawEntries } from "../hooks/dashboard/scriptMetadataUtils";
import { buildCustomMetadataEntries } from "./scriptMetadataPayload";
import type { BaseScriptApi, ScriptUpdatePayload } from "../types/api";
import type { ContactField, CustomField, LicenseSpecialTerm, TagLike } from "../hooks/dashboard/types";
import type { CoverDesign } from "../types/coverDesign";

// ---------------------------------------------------------------------------
// Draft type — the single source of truth for in-memory editing state
// ---------------------------------------------------------------------------

export interface ScriptMetadataDraft {
  // Structured API fields
  title: string;
  status: string;
  coverUrl: string;
  coverCrop: { cx?: number; cy?: number; zoom?: number } | null;
  coverDesign: CoverDesign | null;
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

  // structured API content fields (PR-E1+ / E6)
  synopsis: string;
  outline: string;
  activityName: string;
  activityBannerUrl: string;
  activityContent: string;
  activityWorkUrl: string;
  activityDemoLinks: unknown[];
  // customMetadata-backed content fields (no structured API field)
  roleSetting: string;
  backgroundInfo: string;
  performanceInstruction: string;
  openingIntro: string;
  chapterSettings: string;
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
    coverDesign: null,
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

function parseStringListJson(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
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
  draft.coverDesign = (api as BaseScriptApi).coverDesign ?? null;
  draft.draftDate = String(api.draftDate || "");
  // disableAuthorAutofill suppresses ALL author population.
  if (!opts.disableAuthorAutofill) {
    const canonicalAuthorDisplayMode = String(api.authorDisplayMode || "").trim().toLowerCase();
    const normalizedAuthorDisplayMode =
      canonicalAuthorDisplayMode === "override" || canonicalAuthorDisplayMode === "badge"
        ? canonicalAuthorDisplayMode
        : "badge";
    const canonicalOverrideName = String(api.authorOverrideName || "").trim();
    draft.authorDisplayMode = normalizedAuthorDisplayMode;
    draft.author = normalizedAuthorDisplayMode === "override"
      ? canonicalOverrideName
      : String(api.author && typeof api.author === "string" ? api.author : "");
  }
  draft.markerThemeId = String(api.markerThemeId || "default");
  draft.disableCopy = Boolean(api.disableCopy);
  draft.currentTags = Array.isArray(api.tags) ? (api.tags as TagLike[]) : [];
  draft.licenseCommercial = String(api.licenseCommercial || "");
  draft.licenseDerivative = String(api.licenseDerivative || "");
  draft.licenseNotify = String(api.licenseNotify || "");
  draft.licenseSpecialTerms = parseStringListJson(api.licenseSpecialTerms);
  draft.targetAudience = String(api.targetAudience || "");
  draft.contentRating = String(api.contentRating || "");
  draft.seriesId = api.seriesId ?? null;
  draft.seriesOrder = api.seriesOrder ?? "";
  draft.seriesName = String(api.series?.name || "");
  draft.organizationId = api.organizationId ?? null;
  // Structured content fields (PR-E1+ / E6) — read directly; no custom fallback
  draft.synopsis = String(api.synopsis || "");
  draft.outline = String(api.outline || "");
  draft.activityName = String(api.activityName || "");
  draft.activityBannerUrl = String(api.activityBannerUrl || "");
  draft.activityContent = String(api.activityContent || "");
  draft.activityWorkUrl = String(api.activityWorkUrl || "");
  // activityDemoLinks: structured field is a JSON string; parse it, fall back to empty
  if (api.activityDemoLinks) {
    const parsed = parseActivityDemoLinks(api.activityDemoLinks);
    draft.activityDemoLinks = parsed.length > 0 ? parsed : [];
  }

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

  // --- customMetadata read: user-defined/editor-only fields only ---
  const rawEntries = customMetadataEntriesToRawEntries(api.customMetadata || []);
  const meta = customMetadataEntriesToMeta(api.customMetadata || []);

  // marker legend from custom
  if (meta.marker_legend !== undefined) draft.showMarkerLegend = String(meta.marker_legend) === "true";
  else if (meta.show_legend !== undefined) draft.showMarkerLegend = String(meta.show_legend) === "true";

  // copyright
  draft.copyright = String(meta.copyright || "");

  // content-only custom fields — structured fields (synopsis/outline/activityName/activityBannerUrl
  // activityContent/activityWorkUrl/activityDemoLinks) read directly from API above; no custom fallback (E5-1, E6).
  draft.roleSetting = String(meta.rolesetting || "");
  draft.backgroundInfo = String(meta.backgroundinfo || "");
  draft.performanceInstruction = String(meta.performanceinstruction || "");
  draft.openingIntro = String(meta.openingintro || meta.setting || meta.settingintro || "");
  draft.chapterSettings = String(meta.chaptersettings || "");

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
}

export function fromDraftToPayload(
  draft: ScriptMetadataDraft,
  opts: FromDraftOptions = {}
): ScriptUpdatePayload & { author?: string } {

  const effectiveAuthorDisplayMode = draft.authorDisplayMode === "override" ? "override" : "badge";
  const effectiveAuthor = String(draft.author || "");
  const persistedAuthor = effectiveAuthorDisplayMode === "override" ? effectiveAuthor : "";
  const shouldPreserve = opts.preserveAuthor === true;

  const normalizedLicenseSpecialTerms = (draft.licenseSpecialTerms || [])
    .map((term) => String(term || "").trim())
    .filter(Boolean);

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
    }
  );

  if (draft.showMarkerLegend) {
    customMetadata = normalizeCustomMetadataEntries([
      ...customMetadata,
      { key: "marker_legend", value: "true" },
    ]);
  }

  const payload: ScriptUpdatePayload & { author?: string } = {
    title: draft.title,
    coverUrl: draft.coverUrl,
    coverCrop: draft.coverCrop ?? null,
    coverDesign: draft.coverDesign ?? null,
    status: draft.status,
    customMetadata,
    draftDate: draft.draftDate,
    personaId: draft.personaId || null,
    organizationId: draft.organizationId || null,
    licenseCommercial: draft.licenseCommercial || "",
    licenseDerivative: draft.licenseDerivative || "",
    licenseNotify: draft.licenseNotify || "",
    licenseSpecialTerms: normalizedLicenseSpecialTerms.length > 0
      ? JSON.stringify(normalizedLicenseSpecialTerms)
      : null,
    targetAudience: draft.targetAudience || null,
    contentRating: draft.contentRating || null,
    markerThemeId: draft.markerThemeId,
    disableCopy: draft.disableCopy,
    seriesId: draft.seriesId || null,
    seriesOrder:
      Number.isFinite(Number(draft.seriesOrder)) && Number(draft.seriesOrder) >= 0
        ? Math.floor(Number(draft.seriesOrder))
        : null,
    synopsis: draft.synopsis || null,
    outline: draft.outline || null,
    activityName: draft.activityName || null,
    activityBannerUrl: draft.activityBannerUrl || null,
    activityContent: draft.activityContent || null,
    activityWorkUrl: draft.activityWorkUrl || null,
    activityDemoLinks: serializeActivityDemoLinks(draft.activityDemoLinks) || null,
  };

  if (!shouldPreserve) {
    payload.author = persistedAuthor;
    payload.authorDisplayMode = effectiveAuthorDisplayMode;
    payload.authorOverrideName = persistedAuthor || null;
  }

  return payload;
}
