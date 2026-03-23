import { useMemo } from "react";
import { deriveSimpleLicenseTags, parseBasicLicenseFromMeta } from "../../lib/licenseRights";
import { normalizeSeriesName, parseSeriesOrder } from "../../lib/series";
import { customMetadataEntriesToMeta } from "../../lib/customMetadata";

const SEGMENT_KEYS = {
  all: "all",
  allAges: "all-ages",
  adult: "adult",
  male: "male",
  female: "female",
};

const SEGMENT_TAGS = {
  [SEGMENT_KEYS.allAges]: ["全年齡向", "一般", "一般內容"],
  [SEGMENT_KEYS.adult]: ["成人向", "R-18", "r18", "18+"],
  [SEGMENT_KEYS.male]: ["男性向"],
  [SEGMENT_KEYS.female]: ["女性向"],
};

export const RESERVED_SEGMENT_TAGS = new Set(
  Object.values(SEGMENT_TAGS).flat().map((tag) => String(tag).toLowerCase())
);

/**
 * usePublicGalleryFiltering
 *
 * 負責對 scripts / authors / orgs 做 metadata enrichment 與篩選計算。
 * 把這些 useMemo 從 PublicGalleryPage 主體中抽出，讓頁面組件更清爽。
 */
export function usePublicGalleryFiltering({
  scripts,
  authors,
  orgs,
  searchNeedle,
  selectedTags,
  selectedAuthorTags,
  selectedOrgTags,
  segmentFilter,
  usageFilter,
  featuredLaneMode,
}) {
  // 1. Enrich scripts with computed metadata fields
  const scriptsWithMeta = useMemo(() => {
    return (scripts || []).map((script) => {
      const meta = customMetadataEntriesToMeta(script.customMetadata || []);
      const authorOverride = String(meta.author || "").trim();
      const rawAuthorDisplayMode = String(meta.authordisplaymode || meta.authorDisplayMode || "").trim().toLowerCase();
      const useOverrideAuthor = rawAuthorDisplayMode === "override" && Boolean(authorOverride);
      const basicLicenseFromMeta = parseBasicLicenseFromMeta(meta);
      const basicLicense = {
        commercialUse: basicLicenseFromMeta.commercialUse || String(script.licenseCommercial || "").toLowerCase(),
        derivativeUse: basicLicenseFromMeta.derivativeUse || String(script.licenseDerivative || "").toLowerCase(),
        notifyOnModify: basicLicenseFromMeta.notifyOnModify || String(script.licenseNotify || "").toLowerCase(),
      };
      const license = meta.license || meta.licenseName || "";
      const seriesName = normalizeSeriesName(script.series?.name || meta.series || meta.seriesname);
      const seriesOrder = parseSeriesOrder(script.seriesOrder ?? meta.seriesorder ?? meta.episode);

      let terms = meta.licensespecialterms || meta.licenseSpecialTerms || "";
      let licenseTagsFromMeta = meta.licensetags || meta.licenseTags || [];
      if (typeof terms === "string") {
        try { const p = JSON.parse(terms); if (Array.isArray(p)) terms = p; } catch {}
      }
      if (typeof licenseTagsFromMeta === "string") {
        try {
          const p = JSON.parse(licenseTagsFromMeta);
          if (Array.isArray(p)) licenseTagsFromMeta = p;
        } catch {
          licenseTagsFromMeta = String(licenseTagsFromMeta).split(/,|，/).map((t) => t.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(licenseTagsFromMeta)) licenseTagsFromMeta = [];

      const termsText = Array.isArray(terms) ? terms.join(" ") : String(terms || "");
      const licenseTags = Array.from(new Set([...deriveSimpleLicenseTags(basicLicense), ...licenseTagsFromMeta]));
      const mergedTags = Array.from(new Set([...(script.tags || []), ...licenseTags]));
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
        seriesName,
        seriesOrder,
        _searchTitle: String(script.title || "").toLowerCase(),
        _searchAuthor: String(resolvedAuthor?.displayName || "").toLowerCase(),
        _searchLicenseText: [license, ...licenseTags].filter(Boolean).join(" ").toLowerCase(),
        _searchLicenseTermsText: termsText.toLowerCase(),
        _tagSetLower: new Set(mergedTags.map((tag) => String(tag).toLowerCase())),
      };
    });
  }, [scripts]);

  // 2. Filter scripts
  const filteredScripts = useMemo(() => {
    return scriptsWithMeta
      .filter((script) => {
        const matchesSearch =
          searchNeedle === "" ||
          script._searchTitle.includes(searchNeedle) ||
          script._searchAuthor.includes(searchNeedle) ||
          script._searchLicenseText.includes(searchNeedle) ||
          script._searchLicenseTermsText.includes(searchNeedle);
        const matchesTag = selectedTags.length > 0
          ? (script.tags || []).some((tag) => selectedTags.includes(tag))
          : true;
        const matchesSegment = segmentFilter === SEGMENT_KEYS.all
          ? true
          : (SEGMENT_TAGS[segmentFilter] || []).some((tag) => script._tagSetLower.has(String(tag).toLowerCase()));
        const matchesUsage =
          usageFilter === "all" ? true :
          usageFilter === "commercial" ? script._allowCommercial === true : true;
        return matchesSearch && matchesTag && matchesSegment && matchesUsage;
      })
      .sort((a, b) => (b.lastModified || b.updatedAt || 0) - (a.lastModified || a.updatedAt || 0));
  }, [scriptsWithMeta, searchNeedle, selectedTags, segmentFilter, usageFilter]);

  // 3. Featured lanes
  const topViewedScripts = useMemo(
    () => [...filteredScripts].sort((a, b) => (b.views || 0) - (a.views || 0)),
    [filteredScripts]
  );
  const latestScripts = filteredScripts;
  const topViewedScriptsPreview = useMemo(() => topViewedScripts.slice(0, 15), [topViewedScripts]);
  const latestScriptsPreview = useMemo(() => latestScripts.slice(0, 15), [latestScripts]);
  const featuredLaneScripts = useMemo(() => {
    if (featuredLaneMode === "top") return topViewedScripts;
    if (featuredLaneMode === "latest") return latestScripts;
    return filteredScripts;
  }, [featuredLaneMode, topViewedScripts, latestScripts, filteredScripts]);

  // 4. Series grouping
  const featuredSeries = useMemo(() => {
    const buckets = new Map();
    for (const script of scriptsWithMeta || []) {
      const name = normalizeSeriesName(script.seriesName || script._seriesName);
      if (!name) continue;
      const key = name.toLowerCase();
      if (!buckets.has(key)) buckets.set(key, { name, scripts: [], totalViews: 0 });
      const bucket = buckets.get(key);
      bucket.scripts.push(script);
      bucket.totalViews += script.views || 0;
    }
    return Array.from(buckets.values())
      .map((bucket) => {
        const sorted = [...bucket.scripts].sort((a, b) => {
          const aOrder = a.seriesOrder ?? a._seriesOrder ?? Number.MAX_SAFE_INTEGER;
          const bOrder = b.seriesOrder ?? b._seriesOrder ?? Number.MAX_SAFE_INTEGER;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (b.lastModified || b.updatedAt || 0) - (a.lastModified || a.updatedAt || 0);
        });
        return {
          name: bucket.name,
          totalViews: bucket.totalViews,
          count: bucket.scripts.length,
          lead: sorted[0] || null,
          coverUrl:
            sorted.find((item) => String(item?.series?.coverUrl || "").trim())?.series?.coverUrl ||
            sorted.find((item) => String(item?.coverUrl || "").trim())?.coverUrl ||
            "",
          scripts: sorted,
        };
      })
      .filter((series) => series.lead)
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 10);
  }, [scriptsWithMeta]);

  // 5. Tag lists
  const allTags = Array.from(
    new Set(
      scriptsWithMeta.flatMap((s) => s.tags || []).filter((tag) => !RESERVED_SEGMENT_TAGS.has(String(tag).toLowerCase()))
    )
  );
  const licenseTagShortcuts = Array.from(new Set(scriptsWithMeta.flatMap((s) => s._derivedLicenseTags || [])));

  // 6. Filter authors / orgs
  const filteredAuthors = useMemo(() => {
    return authors.filter((a) => {
      const matchesSearch = String(a.displayName || "").toLowerCase().includes(searchNeedle);
      const matchesTag = selectedAuthorTags.length > 0
        ? (a.tags || []).some((tag) => selectedAuthorTags.includes(tag))
        : true;
      return matchesSearch && matchesTag;
    });
  }, [authors, searchNeedle, selectedAuthorTags]);

  const filteredOrgs = useMemo(() => {
    return orgs.filter((o) => {
      const matchesSearch = String(o.name || "").toLowerCase().includes(searchNeedle);
      const matchesTag = selectedOrgTags.length > 0
        ? (o.tags || []).some((tag) => selectedOrgTags.includes(tag))
        : true;
      return matchesSearch && matchesTag;
    });
  }, [orgs, searchNeedle, selectedOrgTags]);

  const authorTags = useMemo(() => Array.from(new Set(authors.flatMap((a) => a.tags || []))), [authors]);
  const orgTags = useMemo(() => Array.from(new Set(orgs.flatMap((o) => o.tags || []))), [orgs]);

  return {
    scriptsWithMeta,
    filteredScripts,
    topViewedScripts,
    latestScripts,
    topViewedScriptsPreview,
    latestScriptsPreview,
    featuredLaneScripts,
    featuredSeries,
    allTags,
    licenseTagShortcuts,
    filteredAuthors,
    filteredOrgs,
    authorTags,
    orgTags,
  };
}
