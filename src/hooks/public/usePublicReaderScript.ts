import { useEffect, useState } from "react";
import { getPublicBundle, getPublicScript, getPublicThemes } from "../../lib/api/public";
import { deriveSimpleLicenseTags, parseBasicLicenseFromMeta } from "../../lib/licenseRights";
import { normalizeSeriesName, parseSeriesOrder } from "../../lib/series";
import { normalizeMarkerConfigsSchema } from "../../lib/markerThemeCodec";
import { defaultMarkerConfigs } from "../../constants/defaultMarkerRules";
import { customMetadataEntriesToMeta, customMetadataEntriesToRawEntries } from "../../lib/customMetadata";
import { buildPrefaceItemsFromMeta, buildPublicReaderProjection } from "../../lib/publicReaderProjection";
import { useI18n } from "../../contexts/I18nContext";
import type { ScriptManager } from "../../hooks/useScriptManager.types";
import type { BaseScriptApi } from "../../types/api";

interface Author {
  id: string;
  displayName: string;
  avatarUrl: string;
  avatarCrop?: { cx?: number; cy?: number; zoom?: number } | null;
}

interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
  logoCrop?: { cx?: number; cy?: number; zoom?: number } | null;
}

export interface MockMeta {
  coverUrl: string | null;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  author: Author | null;
  organization: Organization | null;
  tags: string[];
  synopsis: string;
  description: string;
  date: string;
  contact: unknown;
  source: string;
  credit: string;
  authors: string;
  headerAuthor: string;
  license: string;
  targetAudience: string;
  contentRating: string;
  commercialUse: string;
  derivativeUse: string;
  notifyOnModify: string;
  licenseSpecialTerms: unknown[];
  licenseTags: string[];
  seriesName: string;
  seriesOrder: number | null;
  prefaceItems: { id: string; title: string; value: string }[];
  activity: {
    name: string;
    bannerUrl: string;
    bannerCrop?: { cx?: number; cy?: number; zoom?: number } | null;
    content: string;
    demoUrl: string;
    demoLinks: unknown[];
    workUrl: string;
  };
  customFields: { key: string; value: string }[];
  showMarkerLegend: boolean;
}

const AUDIENCE_TAGS = new Set(["男性向", "女性向", "全性向"]);
const RATING_TAGS = new Set(["一般", "R-18", "r18", "一般內容", "全年齡向", "成人向", "18+"]);

const pickTagByGroup = (tags: string[], group: Set<string>) =>
  tags.find((tag) => group.has(String(tag || "").trim()));

// Helper for robust list parsing (handles double-encoded JSON strings)
const ensureList = (val: unknown): unknown[] => {
    if (!val) return [];
    let parsed = val;
    if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch { return [parsed]; }
    }
    if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch { return [parsed]; }
    }
    if (Array.isArray(parsed)) {
        return parsed.flatMap(item => {
            if (typeof item === "string" && item.trim().startsWith("[") && item.trim().endsWith("]")) {
                try { const inner = JSON.parse(item); if (Array.isArray(inner)) return inner; } catch {}
            }
            return item;
        });
    }
    return [];
};

const RESERVED_META_KEYS = new Set([
    "title", "credit", "author", "authors", "source",
    "draftdate", "date", "contact", "copyright",
    "notes", "description", "synopsis", "summary",
    "tag", "tags",
    "outline",
    "rolesetting", "backgroundinfo", "performanceinstruction", "openingintro", "chaptersettings",
    "activityname", "activitybanner", "activitycontent", "activitydemourl", "activityworkurl",
    "activitydemolinks",
    "eventname", "eventbanner", "eventcontent", "eventdemolink", "eventworklink",
    "eventdemolinks",
    "setting", "settingintro", "background", "backgroundintro",
    "authordisplaymode",
    "cover", "coverurl", "marker_legend", "show_legend",
    "license", "licenseurl", "licenseterms", "licensetags",
    "licensespecialterms", "licensecommercial", "licensederivative", "licensenotify",
    "series", "seriesname", "seriesorder",
]);

interface Props {
  id: string | undefined;
  scriptManager: ScriptManager;
}

export function usePublicReaderScript({ id, scriptManager }: Props) {
  const { t } = useI18n();
  const {
    setActivePublicScriptId, setRawScript, setTitleName,
    setActiveCloudScript, setCloudScriptMode,
  } = scriptManager;

  const [isLoading, setIsLoading] = useState(false);
  const [mockMeta, setMockMeta] = useState<MockMeta | null>(null);
  const [relatedSeriesScripts, setRelatedSeriesScripts] = useState<
    { id: string; title: string; coverUrl: string | null; coverCrop?: { cx?: number; cy?: number; zoom?: number } | null; seriesOrder: number | null }[]
  >([]);
  const [publicMarkerConfigs, setPublicMarkerConfigs] = useState(
    normalizeMarkerConfigsSchema(defaultMarkerConfigs)
  );

  // Reset marker configs on id change
  useEffect(() => {
    setPublicMarkerConfigs(normalizeMarkerConfigsSchema(defaultMarkerConfigs));
    if (scriptManager.setScopedMarkerConfigs) {
      scriptManager.setScopedMarkerConfigs(null);
    } else if (scriptManager.setOverrideMarkerConfigs) {
      scriptManager.setOverrideMarkerConfigs(null);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const loadScript = async () => {
      setIsLoading(true);
      setActivePublicScriptId(id);

      try {
        const script = await getPublicScript(id);
        if (script) {
          setTitleName(script.title || "Untitled");
          setActiveCloudScript(script);
          setCloudScriptMode("read");

          const organization = script.organization;
          const person = script.persona || script.owner;

          const rawEntries = customMetadataEntriesToRawEntries(script.customMetadata || []);
          const meta = customMetadataEntriesToMeta(script.customMetadata || []) as Record<string, string>;
          setRawScript(script.content || "");

          const seriesName = normalizeSeriesName(script.series?.name || meta.series || meta.seriesname);
          const seriesOrder = parseSeriesOrder(script.seriesOrder ?? meta.seriesorder);

          const customFields = rawEntries
            .map(({ key, value }) => ({ key, value }))
            .filter((entry) => !RESERVED_META_KEYS.has(entry.key.toLowerCase().replace(/\s/g, "")));

          let contactValue: unknown = meta.contact || "";
          try { contactValue = JSON.parse(String(contactValue)); } catch {}

          const authorOverride = String(meta.author || "").trim();
          const rawAuthorDisplayMode = String(meta.authordisplaymode || meta.authorDisplayMode || "").trim().toLowerCase();
          const useOverrideAuthor = rawAuthorDisplayMode === "override" && Boolean(authorOverride);
          const resolvedAuthor = useOverrideAuthor
            ? { id: "override-author", displayName: authorOverride, avatarUrl: "" }
            : (person ? {
                id: person.id || "unknown",
                displayName: String(person.displayName || person.name || "Unknown"),
                avatarUrl: String(person.avatar || person.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${person.displayName || person.name || "U"}`),
                avatarCrop: (person as { avatarCrop?: { cx?: number; cy?: number; zoom?: number } | null }).avatarCrop || null,
              } : (authorOverride ? {
                id: "header-author-fallback",
                displayName: authorOverride,
                avatarUrl: "",
                avatarCrop: null,
              } : null));

          const resolvedOrganization = useOverrideAuthor
            ? null
            : (organization ? {
                id: organization.id,
                name: String(organization.name || organization.displayName || ""),
                logoUrl: organization.logoUrl || organization.avatar || organization.avatarUrl
                  ? String(organization.logoUrl || organization.avatar || organization.avatarUrl)
                  : undefined,
                logoCrop: (organization as { logoCrop?: { cx?: number; cy?: number; zoom?: number } | null }).logoCrop || null,
              } : null);

          const normalizedTags = Array.isArray(script.tags)
            ? script.tags.map((tag) => (typeof tag === "string" ? tag : String(tag?.name || ""))).filter(Boolean)
            : [];
          const basicLicenseFromMeta = parseBasicLicenseFromMeta(meta);
          const personaLicense = parseBasicLicenseFromMeta({
            licensecommercial: script.persona?.defaultLicenseCommercial || "",
            licensederivative: script.persona?.defaultLicenseDerivative || "",
            licensenotify: script.persona?.defaultLicenseNotify || "",
          });
          const basicLicense = {
            commercialUse: basicLicenseFromMeta.commercialUse || String(script.licenseCommercial || "").toLowerCase() || personaLicense.commercialUse,
            derivativeUse: basicLicenseFromMeta.derivativeUse || String(script.licenseDerivative || "").toLowerCase() || personaLicense.derivativeUse,
            notifyOnModify: basicLicenseFromMeta.notifyOnModify || String(script.licenseNotify || "").toLowerCase() || personaLicense.notifyOnModify,
          };

          const publicProjection = buildPublicReaderProjection({
            title: script.title || "Untitled",
            synopsis: String(script.synopsis || ""),
            coverUrl: script.coverUrl || null,
            coverCrop: (script as { coverCrop?: { cx?: number; cy?: number; zoom?: number } | null }).coverCrop || null,
            author: resolvedAuthor,
            organization: resolvedOrganization,
            tags: normalizedTags,
            targetAudience: pickTagByGroup(normalizedTags, AUDIENCE_TAGS) || "",
            contentRating: pickTagByGroup(normalizedTags, RATING_TAGS) || "",
            customFields,
            prefaceItems: buildPrefaceItemsFromMeta(meta),
            contact: contactValue,
            license: meta.license || "",
            commercialUse: basicLicense.commercialUse,
            derivativeUse: basicLicense.derivativeUse,
            notifyOnModify: basicLicense.notifyOnModify,
            licenseSpecialTerms: ensureList(meta.licensespecialterms || meta.licenseSpecialTerms),
            activity: {
              name: String(script.activityName || "").trim(),
              bannerUrl: String(script.activityBannerUrl || "").trim(),
              bannerCrop: null,
              content: String(meta.activitycontent || meta.eventcontent || "").trim(),
              demoUrl: String(meta.activitydemourl || meta.eventdemolink || "").trim(),
              demoLinks: ensureList(meta.activitydemolinks || meta.eventdemolinks),
              workUrl: String(meta.activityworkurl || meta.eventworklink || "").trim(),
            },
            showMarkerLegend: String(meta.marker_legend) === "true" || String(meta.show_legend) === "true",
            content: script.content || "",
          });

          setMockMeta({
            coverUrl: publicProjection.coverUrl || null,
            coverCrop: publicProjection.coverCrop || null,
            author: publicProjection.author
              ? {
                  id: String(publicProjection.author.id || "unknown"),
                  displayName: String(publicProjection.author.displayName || "Unknown"),
                  avatarUrl: String(publicProjection.author.avatarUrl || ""),
                  avatarCrop: publicProjection.author.avatarCrop || null,
                }
              : null,
            organization: publicProjection.organization
              ? {
                  id: String(publicProjection.organization.id || "unknown-org"),
                  name: String(publicProjection.organization.name || ""),
                  logoUrl: publicProjection.organization.logoUrl,
                  logoCrop: publicProjection.organization.logoCrop || null,
                }
              : null,
            tags: publicProjection.tags,
            synopsis: publicProjection.synopsis,
            description: meta.description || meta.notes || "",
            date: script.draftDate || meta.date || meta.draftdate || "",
            contact: publicProjection.contact,
            source: meta.source || "",
            credit: meta.credit || "",
            authors: meta.authors || "",
            headerAuthor: meta.author || "",
            license: publicProjection.license,
            targetAudience: publicProjection.targetAudience,
            contentRating: publicProjection.contentRating,
            commercialUse: publicProjection.commercialUse,
            derivativeUse: publicProjection.derivativeUse,
            notifyOnModify: publicProjection.notifyOnModify,
            licenseSpecialTerms: publicProjection.licenseSpecialTerms,
            licenseTags: deriveSimpleLicenseTags(basicLicense),
            seriesName,
            seriesOrder,
            prefaceItems: publicProjection.prefaceItems,
            activity: publicProjection.activity,
            customFields: publicProjection.customFields,
            showMarkerLegend: publicProjection.showMarkerLegend,
          });

          if (seriesName) {
            try {
              const bundle = await getPublicBundle();
              type SeriesItem = { id: string; title: string; coverUrl: string | null; coverCrop?: { cx?: number; cy?: number; zoom?: number } | null; seriesOrder: number | null };
              const sameSeries = (bundle?.scripts || [])
                .filter((item): item is BaseScriptApi => Boolean(item?.id) && item.id !== script.id)
                .map((i): SeriesItem | null => {
                  const parsedMeta = customMetadataEntriesToMeta(i.customMetadata || []) as Record<string, string>;
                  const itemSeriesName = normalizeSeriesName(parsedMeta?.series || parsedMeta?.seriesname);
                  if (itemSeriesName.toLowerCase() !== seriesName.toLowerCase()) return null;
                  return {
                    id: i.id,
                    title: i.title || t("publicGallery.unknown"),
                    coverUrl: i.coverUrl || null,
                    coverCrop: (i as { coverCrop?: { cx?: number; cy?: number; zoom?: number } | null }).coverCrop || null,
                    seriesOrder: parseSeriesOrder(i.seriesOrder ?? parsedMeta?.seriesorder),
                  };
                })
                .filter((item: SeriesItem | null): item is SeriesItem => item !== null)
                .sort((a: SeriesItem, b: SeriesItem) => {
                  const aOrder = a.seriesOrder ?? Number.MAX_SAFE_INTEGER;
                  const bOrder = b.seriesOrder ?? Number.MAX_SAFE_INTEGER;
                  if (aOrder !== bOrder) return aOrder - bOrder;
                  return String(a.title || "").localeCompare(String(b.title || ""));
                });
              setRelatedSeriesScripts(sameSeries);
            } catch (error) {
              console.warn("Failed to load same-series scripts", error);
              setRelatedSeriesScripts([]);
            }
          } else {
            setRelatedSeriesScripts([]);
          }

          // Resolve marker configs: prefer embedded theme, fallback to remote, then default
          let resolvedPublicConfigs = normalizeMarkerConfigsSchema(defaultMarkerConfigs);
          if (script.markerTheme?.configs) {
            try {
              const embedded = normalizeMarkerConfigsSchema(script.markerTheme.configs);
              if (embedded.length > 0) resolvedPublicConfigs = embedded;
            } catch (e) {
              console.error("Failed to apply embedded theme", e);
            }
          } else if (script.markerThemeId && script.markerThemeId !== "default") {
            try {
              const themes = await getPublicThemes();
              const matched = themes.find((theme) => String((theme as { id?: unknown })?.id || "") === script.markerThemeId);
              if (matched?.configs) {
                const normalized = normalizeMarkerConfigsSchema(matched.configs);
                if (normalized.length > 0) resolvedPublicConfigs = normalized;
              }
            } catch (e) {
              console.error("Failed to load theme", e);
            }
          }

          if (scriptManager.setScopedMarkerConfigs) {
            scriptManager.setScopedMarkerConfigs(resolvedPublicConfigs);
          } else if (scriptManager.setOverrideMarkerConfigs) {
            scriptManager.setOverrideMarkerConfigs(resolvedPublicConfigs);
          }
          setPublicMarkerConfigs(resolvedPublicConfigs);
        } else {
          console.error("Script not found");
        }
      } catch (error) {
        console.warn("Failed to load public script, falling back to mock:", error);
        if (id === "mock-script-id") {
          setRawScript(`Title: The Infinite Horizon
Credit: Written by
Author: Alex Chen
Draft Date: 2024-02-02

EXT. SPACE STATION - DAY

The station rotates slowly against the backdrop of the nebula.

INT. CONTROL ROOM

COMMANDER SHEPARD looks out the viewport.

SHEPARD
(into comms)
Status report.

EXT. PLANET SURFACE - NIGHT

The away team moves through the dense jungle.

INT. ANCIENT RUINS

They discover a glowing artifact.
`);
          setTitleName("The Infinite Horizon");
          setActiveCloudScript({ id: "mock-script-id", title: "The Infinite Horizon", markerThemeId: "default" });
          setCloudScriptMode("read");
          setMockMeta({
            coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
            author: { id: "user-1", displayName: "Alex Chen", avatarUrl: "https://github.com/shadcn.png" },
            organization: null,
            tags: ["Sci-Fi", "Thriller"],
            synopsis: "Two astronauts on a distant moon discover a time-bending anomaly.",
            description: "", date: "", contact: "", source: "", credit: "", authors: "",
            headerAuthor: "", license: "", targetAudience: "", contentRating: "", commercialUse: "", derivativeUse: "", notifyOnModify: "",
            licenseSpecialTerms: [], licenseTags: [], seriesName: "", seriesOrder: null,
            prefaceItems: [], activity: { name: "", bannerUrl: "", content: "", demoUrl: "", demoLinks: [], workUrl: "" },
            customFields: [], showMarkerLegend: false,
          });
          setRelatedSeriesScripts([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadScript();
  }, [id, setActivePublicScriptId, setRawScript, setTitleName, setCloudScriptMode]);

  return { isLoading, mockMeta, relatedSeriesScripts, publicMarkerConfigs };
}
