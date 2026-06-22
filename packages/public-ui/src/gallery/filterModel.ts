/**
 * Gallery filter model — pure functions, no React, no router, no i18n.
 * Used by both Vite (via usePublicGalleryFiltering) and Next.js GalleryClient.
 */
import type { CoverDesign } from "../cover/types";
import type { MediaCropLike } from "@write/media-crop";

// ─── Segment constants ──────────────────────────────────────────────────────

export const SEGMENT_KEYS = {
  all: "all",
  allAges: "all-ages",
  adult: "adult",
  male: "male",
  female: "female",
} as const;

export type SegmentKey = (typeof SEGMENT_KEYS)[keyof typeof SEGMENT_KEYS] | string;
export type UsageFilter = "all" | "commercial";

export const SEGMENT_TAGS: Record<string, string[]> = {
  [SEGMENT_KEYS.allAges]: ["全年齡向", "一般", "一般內容"],
  [SEGMENT_KEYS.adult]: ["成人向", "R-18", "r18", "18+"],
  [SEGMENT_KEYS.male]: ["男性向"],
  [SEGMENT_KEYS.female]: ["女性向"],
};

export const RESERVED_SEGMENT_TAGS = new Set(
  Object.values(SEGMENT_TAGS)
    .flat()
    .map((tag) => String(tag).toLowerCase())
);

// ─── License helpers ─────────────────────────────────────────────────────────

function normalizeChoice(value: unknown): string {
  return String(value || "").toLowerCase().trim();
}

function normalizeCommercialChoice(value: unknown): string {
  const raw = normalizeChoice(value);
  if (!raw) return "";
  if (["allow", "yes", "true", "可商用", "允許", "commercial"].includes(raw)) return "allow";
  if (["disallow", "no", "false", "不可商用", "禁止", "non-commercial", "noncommercial"].includes(raw)) return "disallow";
  return "";
}

function normalizeDerivativeChoice(value: unknown): string {
  const raw = normalizeChoice(value);
  if (!raw) return "";
  if (["allow", "yes", "true", "可改作", "允許", "derivative"].includes(raw)) return "allow";
  if (["disallow", "no", "false", "不可改作", "禁止", "nd", "no-derivatives"].includes(raw)) return "disallow";
  if (["limited", "limited-allow", "限定改作", "限縮改作", "有條件改作"].includes(raw)) return "limited";
  return "";
}

function normalizeNotifyChoice(value: unknown): string {
  const raw = normalizeChoice(value);
  if (!raw) return "";
  if (["true", "yes", "required", "需要", "需告知", "must-notify"].includes(raw)) return "required";
  if (["false", "no", "optional", "不需要", "無需告知", "no-notify"].includes(raw)) return "not_required";
  return "";
}

export function deriveSimpleLicenseTags({
  commercialUse = "",
  derivativeUse = "",
  notifyOnModify = "",
}: {
  commercialUse?: string;
  derivativeUse?: string;
  notifyOnModify?: string;
} = {}): string[] {
  const commercial = normalizeCommercialChoice(commercialUse);
  const derivative = normalizeDerivativeChoice(derivativeUse);
  const notify = normalizeNotifyChoice(notifyOnModify);
  const tags: string[] = [];
  if (commercial === "allow") tags.push("授權:可商用");
  if (commercial === "disallow") tags.push("授權:不可商用");
  if (derivative === "allow") tags.push("授權:可改作");
  if (derivative === "disallow") tags.push("授權:不可改作");
  if (derivative === "limited") tags.push("授權:限定改作");
  if (notify === "required") tags.push("授權:修改需告知");
  if (notify === "not_required") tags.push("授權:修改免告知");
  return tags;
}

// ─── Custom metadata helpers ─────────────────────────────────────────────────

function normKey(key: unknown): string {
  return String(key || "").trim().toLowerCase().replace(/\s+/g, "");
}

function customMetadataEntriesToMeta(entries: unknown[]): Record<string, string> {
  if (!Array.isArray(entries)) return {};
  const meta: Record<string, string> = {};
  for (const entry of entries as Array<Record<string, unknown>>) {
    const key = String(entry?.key || "").trim();
    if (!key) continue;
    meta[normKey(key)] = String(entry?.value ?? "");
  }
  return meta;
}

function parseBasicLicenseFromMeta(meta: Record<string, unknown> = {}): {
  commercialUse: string;
  derivativeUse: string;
  notifyOnModify: string;
} {
  return {
    commercialUse: normalizeCommercialChoice(meta.licensecommercial ?? meta.licenseCommercial),
    derivativeUse: normalizeDerivativeChoice(meta.licensederivative ?? meta.licenseDerivative),
    notifyOnModify: normalizeNotifyChoice(meta.licensenotify ?? meta.licenseNotify),
  };
}

// ─── Series helpers ──────────────────────────────────────────────────────────

export function normalizeSeriesName(value: unknown): string {
  return String(value || "").trim();
}

export function parseSeriesOrder(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function parseStringArrayLike(input: unknown, fallbackSplitByComma = true): string[] {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }
  const raw = String(input || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // fallthrough
  }
  if (!fallbackSplitByComma) return [raw];
  return raw.split(/,|，/).map((item) => item.trim()).filter(Boolean);
}

// ─── Timestamp helper ────────────────────────────────────────────────────────

function toTimestamp(v: number | string | undefined | null): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Date.parse(String(v));
  return Number.isFinite(n) ? n : 0;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TagLike {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

export interface AuthorLike {
  id?: string;
  displayName?: string;
  avatarUrl?: string;
  avatar?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface OrgLike {
  id?: string;
  name?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface PersonaLike {
  defaultLicenseCommercial?: string;
  defaultLicenseDerivative?: string;
  defaultLicenseNotify?: string;
  [key: string]: unknown;
}

export interface GalleryScriptInput {
  id: string;
  title?: string;
  /** Short public description from script info. Used for gallery card summaries. */
  synopsis?: string | null;
  /** Full outline from advanced metadata. Used for hover detail previews. */
  outline?: string | null;
  customMetadata?: Array<{ key?: string; value?: string; type?: string }>;
  persona?: Partial<PersonaLike> | null;
  author?: AuthorLike | string | null;
  series?: { name?: string; coverUrl?: string } | null;
  seriesName?: string;
  seriesOrder?: number | null;
  episode?: number | string;
  licenseCommercial?: string;
  licenseDerivative?: string;
  licenseNotify?: string;
  coverUrl?: string;
  tags?: Array<string | TagLike>;
  views?: number;
  lastModified?: number;
  updatedAt?: number | string;
  coverDesign?: CoverDesign | null;
  coverCrop?: MediaCropLike | null;
  [key: string]: unknown;
}

export interface EnrichedGalleryScript extends GalleryScriptInput {
  author: AuthorLike | string | null;
  tags: string[];
  _licenseText: string;
  _licenseTermsText: string;
  _derivedLicenseTags: string[];
  _allowCommercial: boolean;
  _disableAuthorLink: boolean;
  _seriesName: string;
  _seriesOrder: number | null;
  _cardSummary: string;
  _hoverOutline: string;
  _searchTitle: string;
  _searchAuthor: string;
  _searchLicenseText: string;
  _searchLicenseTermsText: string;
  _tagSetLower: Set<string>;
}

export interface FeaturedSeries {
  name: string;
  totalViews: number;
  count: number;
  lead: EnrichedGalleryScript | null;
  coverUrl: string;
  scripts: EnrichedGalleryScript[];
}

// ─── enrichScript ─────────────────────────────────────────────────────────────

export function enrichScript(script: GalleryScriptInput): EnrichedGalleryScript {
  const meta = customMetadataEntriesToMeta(script.customMetadata || []);
  const authorOverride = String(meta.author || "").trim();
  const rawAuthorDisplayMode = String(meta.authordisplaymode || meta.authorDisplayMode || "")
    .trim()
    .toLowerCase();
  const useOverrideAuthor = rawAuthorDisplayMode === "override" && Boolean(authorOverride);

  const basicLicenseFromMeta = parseBasicLicenseFromMeta(meta);
  const personaLicense = parseBasicLicenseFromMeta({
    licensecommercial: script.persona?.defaultLicenseCommercial || "",
    licensederivative: script.persona?.defaultLicenseDerivative || "",
    licensenotify: script.persona?.defaultLicenseNotify || "",
  });
  const basicLicense = {
    commercialUse:
      basicLicenseFromMeta.commercialUse ||
      normalizeCommercialChoice(script.licenseCommercial) ||
      personaLicense.commercialUse,
    derivativeUse:
      basicLicenseFromMeta.derivativeUse ||
      normalizeDerivativeChoice(script.licenseDerivative) ||
      personaLicense.derivativeUse,
    notifyOnModify:
      basicLicenseFromMeta.notifyOnModify ||
      normalizeNotifyChoice(script.licenseNotify) ||
      personaLicense.notifyOnModify,
  };

  const license = meta.license || meta.licenseName || "";
  const seriesName = normalizeSeriesName(script.series?.name || meta.series || meta.seriesname);
  const seriesOrder = parseSeriesOrder(script.seriesOrder ?? meta.seriesorder ?? meta.episode);
  const cardSummary = String(
    script.synopsis || meta.synopsis || meta.summary || meta.description || meta.notes || meta["摘要"] || ""
  ).trim();
  const hoverOutline = String(
    script.outline || meta.outline || meta["大綱"] || ""
  ).trim();

  const terms = parseStringArrayLike(
    meta.licensespecialterms || meta.licenseSpecialTerms || "",
    false
  );
  const normalizedLicenseTags = parseStringArrayLike(
    meta.licensetags || meta.licenseTags || [],
    true
  );
  const termsText = terms.join(" ");
  const licenseTags = Array.from(
    new Set([...deriveSimpleLicenseTags(basicLicense), ...normalizedLicenseTags])
  );

  const mergedTags = Array.from(
    new Set(
      ([...(script.tags || []), ...licenseTags] as Array<string | TagLike>)
        .map((tag) => (typeof tag === "string" ? tag : String(tag?.name || "")))
        .filter(Boolean)
    )
  );

  const resolvedAuthor = useOverrideAuthor
    ? { displayName: authorOverride, avatarUrl: "" }
    : (script.author || null);

  return {
    ...script,
    author: resolvedAuthor,
    tags: mergedTags,
    _licenseText: [license, ...licenseTags].filter(Boolean).join(" "),
    _licenseTermsText: termsText,
    _derivedLicenseTags: licenseTags,
    _allowCommercial: basicLicense.commercialUse === "allow",
    _disableAuthorLink: useOverrideAuthor,
    _seriesName: seriesName,
    _seriesOrder: seriesOrder,
    _cardSummary: cardSummary,
    _hoverOutline: hoverOutline,
    seriesName,
    seriesOrder,
    _searchTitle: String(script.title || "").toLowerCase(),
    _searchAuthor: (
      typeof resolvedAuthor === "string"
        ? resolvedAuthor
        : String(resolvedAuthor?.displayName || "")
    ).toLowerCase(),
    _searchLicenseText: [license, ...licenseTags].filter(Boolean).join(" ").toLowerCase(),
    _searchLicenseTermsText: termsText.toLowerCase(),
    _tagSetLower: new Set(mergedTags.map((tag) => String(tag).toLowerCase())),
  };
}

// ─── filterGalleryScripts ─────────────────────────────────────────────────────

export interface GalleryFilterOptions {
  searchNeedle: string;
  selectedTags: string[];
  segmentFilter: string;
  usageFilter: string;
}

export function filterGalleryScripts(
  scripts: EnrichedGalleryScript[],
  opts: GalleryFilterOptions
): EnrichedGalleryScript[] {
  const { searchNeedle, selectedTags, segmentFilter, usageFilter } = opts;
  return scripts
    .filter((script) => {
      const matchesSearch =
        searchNeedle === "" ||
        script._searchTitle.includes(searchNeedle) ||
        script._searchAuthor.includes(searchNeedle) ||
        script._searchLicenseText.includes(searchNeedle) ||
        script._searchLicenseTermsText.includes(searchNeedle);
      const matchesTag =
        selectedTags.length > 0
          ? script.tags.some((tag) => selectedTags.includes(tag))
          : true;
      const matchesSegment =
        segmentFilter === SEGMENT_KEYS.all
          ? true
          : (SEGMENT_TAGS[segmentFilter] || []).some((tag) =>
              script._tagSetLower.has(String(tag).toLowerCase())
            );
      const matchesUsage =
        usageFilter === "all"
          ? true
          : usageFilter === "commercial"
          ? script._allowCommercial === true
          : true;
      return matchesSearch && matchesTag && matchesSegment && matchesUsage;
    })
    .sort(
      (a, b) =>
        (b.lastModified ?? toTimestamp(b.updatedAt)) - (a.lastModified ?? toTimestamp(a.updatedAt))
    );
}

// ─── buildFeaturedSeries ──────────────────────────────────────────────────────

export function buildFeaturedSeries(
  scripts: EnrichedGalleryScript[],
  maxCount = 10
): FeaturedSeries[] {
  const buckets = new Map<
    string,
    { name: string; scripts: EnrichedGalleryScript[]; totalViews: number }
  >();
  for (const script of scripts) {
    const name = normalizeSeriesName(script.seriesName || script._seriesName);
    if (!name) continue;
    const key = name.toLowerCase();
    if (!buckets.has(key)) buckets.set(key, { name, scripts: [], totalViews: 0 });
    const bucket = buckets.get(key)!;
    bucket.scripts.push(script);
    bucket.totalViews += script.views || 0;
  }
  return Array.from(buckets.values())
    .map((bucket) => {
      const sorted = [...bucket.scripts].sort((a, b) => {
        const aOrder = (a.seriesOrder ?? a._seriesOrder) ?? Number.MAX_SAFE_INTEGER;
        const bOrder = (b.seriesOrder ?? b._seriesOrder) ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return (aOrder as number) - (bOrder as number);
        return (b.lastModified ?? toTimestamp(b.updatedAt)) - (a.lastModified ?? toTimestamp(a.updatedAt));
      });
      const coverUrl =
        sorted.find((item) =>
          String((item?.series as { coverUrl?: string } | null)?.coverUrl || "").trim()
        )?.series?.coverUrl as string | undefined ||
        sorted.find((item) => String(item?.coverUrl || "").trim())?.coverUrl ||
        "";
      return {
        name: bucket.name,
        totalViews: bucket.totalViews,
        count: bucket.scripts.length,
        lead: sorted[0] || null,
        coverUrl: String(coverUrl || ""),
        scripts: sorted,
      };
    })
    .filter((series) => series.lead !== null)
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, maxCount);
}

// ─── deriveTags ───────────────────────────────────────────────────────────────

export interface DerivedTagSets {
  allTags: string[];
  licenseTagShortcuts: string[];
}

/**
 * Returns true for any tag that belongs in the "授權篩選" facet.
 * Covers both enrichScript-derived tags (授權:*) and any raw tags
 * that a script author manually wrote with the same prefix.
 */
export function isLicenseShortcutTag(tag: string): boolean {
  return tag.startsWith("授權:");
}

export function deriveTags(scripts: EnrichedGalleryScript[]): DerivedTagSets {
  const allTagsSet = new Set<string>();
  const licenseTagSet = new Set<string>();
  for (const script of scripts) {
    for (const tag of script.tags) {
      const t = String(tag || "");
      if (!t || RESERVED_SEGMENT_TAGS.has(t.toLowerCase())) continue;
      if (isLicenseShortcutTag(t)) {
        licenseTagSet.add(t);
      } else {
        allTagsSet.add(t);
      }
    }
    // Also capture derived license tags that may not yet be in script.tags
    for (const lt of script._derivedLicenseTags) {
      const t = String(lt || "");
      if (t) licenseTagSet.add(t);
    }
  }
  return {
    allTags: Array.from(allTagsSet),
    licenseTagShortcuts: Array.from(licenseTagSet),
  };
}
