import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PublicReaderLayout } from "../components/reader/PublicReaderLayout";
import { getPublicBundle, getPublicScript, getPublicThemes } from "../lib/api/public";
import { deriveSimpleLicenseTags, parseBasicLicenseFromMeta } from "../lib/licenseRights";
import { normalizeSeriesName, parseSeriesOrder } from "../lib/series";
import { useScriptViewerDefaults } from "../hooks/useScriptViewerDefaults";
import { useI18n } from "../contexts/I18nContext";
import { normalizeMarkerConfigsSchema } from "../lib/markerThemeCodec";
import { defaultMarkerConfigs } from "../constants/defaultMarkerRules";
import { parseActivityDemoLinks } from "../lib/activityDemoLinks";
import { customMetadataEntriesToMeta, customMetadataEntriesToRawEntries } from "../lib/customMetadata";
import { usePublicTerms } from "../hooks/public/usePublicTerms";
import { TermsConsentDialog } from "../components/public/TermsConsentDialog";
import type { ScriptManager } from "../hooks/useScriptManager.types";
import type { NavProps } from "../types/nav";

interface Author {
  id: string;
  displayName: string;
  avatarUrl: string;
}

interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
}

interface MockMeta {
  coverUrl: string | null;
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
    content: string;
    demoUrl: string;
    demoLinks: unknown[];
    workUrl: string;
  };
  customFields: { key: string; value: string }[];
  showMarkerLegend: boolean;
}

// Helper for robust list parsing (handles double-encoded JSON strings)
const ensureList = (val: unknown): unknown[] => {
    if (!val) return [];
    let parsed = val;
    if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { return [parsed]; }
    }
    if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { return [parsed]; }
    }
    if (Array.isArray(parsed)) {
        return parsed.flatMap(item => {
            if (typeof item === 'string' && item.trim().startsWith('[') && item.trim().endsWith(']')) {
                try { const inner = JSON.parse(item); if (Array.isArray(inner)) return inner; } catch {}
            }
            return item;
        });
    }
    return [];
};

const normalizePrefaceKey = (key = "") =>
    String(key || "").trim().toLowerCase().replace(/\s+/g, "");

const PREFACE_RULES = [
    { id: "outline", title: "大綱", keys: ["outline", "大綱"] },
    { id: "rolesetting", title: "角色設定", keys: ["rolesetting", "角色設定"] },
    { id: "backgroundinfo", title: "背景資訊", keys: ["backgroundinfo", "背景資訊"] },
    { id: "performanceinstruction", title: "演繹指示", keys: ["performanceinstruction", "演繹指示"] },
    { id: "openingintro", title: "作品的開頭引言", keys: ["openingintro", "作品的開頭引言"] },
    { id: "chaptersettings", title: "章節", keys: ["chaptersettings"] },
].map((rule) => ({
    ...rule,
    keys: rule.keys.map(normalizePrefaceKey),
}));


const buildPrefaceItems = (meta: Record<string, string> = {}) => {
    const valueByKey = new Map<string, string>();
    Object.entries(meta || {}).forEach(([key, value]) => {
        const normalizedKey = normalizePrefaceKey(key);
        const normalizedValue = String(value || "").trim();
        if (!normalizedKey || !normalizedValue || valueByKey.has(normalizedKey)) return;
        valueByKey.set(normalizedKey, normalizedValue);
    });

    const items: { id: string; title: string; value: string }[] = [];
    const seen = new Set<string>();
    PREFACE_RULES.forEach((rule) => {
        const key = rule.keys.find((k) => valueByKey.has(k));
        if (!key) return;
        const value = valueByKey.get(key);
        const signature = `${rule.id}::${value}`;
        if (!value || seen.has(signature)) return;
        seen.add(signature);
        items.push({
            id: rule.id,
            title: rule.title,
            value,
        });
    });
    return items;
};

export default function PublicReaderPage({ scriptManager, navProps }: { scriptManager: ScriptManager; navProps: NavProps }) {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const {
      setActivePublicScriptId, setRawScript, setTitleName,
      setActiveCloudScript, activeCloudScript,
      rawScript, filterCharacter, focusMode,
      setCharacterList, setTitleHtml, setTitleNote, setTitleSummary, setHasTitle, setSceneList,
      scrollSceneId, setCloudScriptMode
  } = scriptManager;

  const [isLoading, setIsLoading] = useState(false);
  const [mockMeta, setMockMeta] = useState<MockMeta | null>(null);
  const [relatedSeriesScripts, setRelatedSeriesScripts] = useState<{ id: string; title: string; coverUrl: string | null; seriesOrder: number | null }[]>([]);
  const [publicMarkerConfigs, setPublicMarkerConfigs] = useState(
    normalizeMarkerConfigsSchema(defaultMarkerConfigs)
  );
  const {
    termsConfig,
    termsDialogOpen,
    setTermsDialogOpen,
    termsScrollRef,
    termsReadToBottom,
    termsRequireScroll,
    acceptedChecks,
    isSubmittingTerms,
    canConfirmTerms,
    missingRequiredCheckCount,
    handleTermsScroll,
    toggleRequiredCheck,
    confirmTermsConsent,
  } = (usePublicTerms as any)({ autoOpen: true, onAccepted: () => {} });

  useEffect(() => {
    // Reset override on mount/unmount or id change
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
            // Mock Delay
            // await new Promise(r => setTimeout(r, 800));

            const script = await getPublicScript(id);
            if (script) {
                setTitleName(script.title || "Untitled");
                // Removed setActiveFile as it caused a crash and might not be needed for public view context
                /* setActiveFile({ 
                    id: script.id, 
                    name: script.title,
                    type: 'script',
                    isPublic: true 
                }); */
                setActiveCloudScript(script); 
                setCloudScriptMode("read");

                // --- Real Extended Metadata ---
                // --- Real Extended Metadata ---
                const organization = script.organization;
                const person = script.persona || script.owner;
                
                const rawEntries = customMetadataEntriesToRawEntries(script.customMetadata || []);
                const meta = customMetadataEntriesToMeta(script.customMetadata || []) as Record<string, string>;
                setRawScript(script.content || "");
                const reserved = new Set([
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
                    "series", "seriesname", "seriesorder"
                ]);
                const seriesName = normalizeSeriesName(script.series?.name || meta.series || meta.seriesname);
                const seriesOrder = parseSeriesOrder(script.seriesOrder ?? meta.seriesorder);

                const customFields = rawEntries
                    .map(({ key, value }) => ({ key, value }))
                    .filter((entry) => {
                        const norm = entry.key.toLowerCase().replace(/\s/g, "");
                        return !reserved.has(norm);
                    });
                let contactValue = meta.contact || "";
                try {
                    const parsedContact = JSON.parse(contactValue);
                    contactValue = parsedContact;
                } catch {}
                
                const authorOverride = String(meta.author || "").trim();
                const rawAuthorDisplayMode = String(meta.authordisplaymode || meta.authorDisplayMode || "").trim().toLowerCase();
                const useOverrideAuthor = rawAuthorDisplayMode === "override" && Boolean(authorOverride);
                const resolvedAuthor = useOverrideAuthor
                    ? {
                        id: "override-author",
                        displayName: authorOverride,
                        avatarUrl: "",
                    }
                    : (person ? {
                        id: person.id || "unknown",
                        displayName: String(person.displayName || person.name || "Unknown"),
                        avatarUrl: String(person.avatar || person.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${person.displayName || person.name || "U"}`)
                    } : (authorOverride ? {
                        id: "header-author-fallback",
                        displayName: authorOverride,
                        avatarUrl: "",
                    } : null));
                const resolvedOrganization = useOverrideAuthor
                    ? null
                    : (organization ? {
                        id: organization.id,
                        name: String(organization.name || organization.displayName || ""),
                        logoUrl: organization.logoUrl || organization.avatar || organization.avatarUrl
                          ? String(organization.logoUrl || organization.avatar || organization.avatarUrl)
                          : undefined
                    } : null);

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

                setMockMeta({
                    coverUrl: script.coverUrl || null,
                    author: resolvedAuthor,
                    organization: resolvedOrganization,
                    tags: Array.isArray(script.tags)
                      ? script.tags
                          .map((tag) => (typeof tag === "string" ? tag : String(tag?.name || "")))
                          .filter((tag) => Boolean(tag))
                      : [],
                    synopsis: meta.synopsis || meta.summary || "",
                    description: meta.description || meta.notes || "",
                    date: script.draftDate || meta.date || meta.draftdate || "",
                    contact: contactValue,
                    source: meta.source || "",
                    credit: meta.credit || "",
                    authors: meta.authors || "",
                    headerAuthor: meta.author || "",
                    license: meta.license || "",
                    ...basicLicense,
                    licenseSpecialTerms: ensureList(meta.licensespecialterms || meta.licenseSpecialTerms),
                    licenseTags: deriveSimpleLicenseTags(basicLicense),
                    seriesName,
                    seriesOrder,
                    prefaceItems: buildPrefaceItems(meta),
                    activity: {
                        name: String(meta.activityname || meta.eventname || "").trim(),
                        bannerUrl: String(meta.activitybanner || meta.eventbanner || "").trim(),
                        content: String(meta.activitycontent || meta.eventcontent || "").trim(),
                        demoUrl: String(meta.activitydemourl || meta.eventdemolink || "").trim(),
                        demoLinks: parseActivityDemoLinks(meta.activitydemolinks || meta.eventdemolinks),
                        workUrl: String(meta.activityworkurl || meta.eventworklink || "").trim(),
                    },
                    customFields,
                    showMarkerLegend: String(meta.marker_legend) === 'true' || String(meta.show_legend) === 'true'
                });

                if (seriesName) {
                    try {
                        const bundle = await getPublicBundle();
                        type SeriesItem = { id: string; title: string; coverUrl: string | null; seriesOrder: number | null };
                        const sameSeries = (bundle?.scripts || [])
                            .filter((item: unknown) => (item as any)?.id && (item as any).id !== script.id)
                            .map((item: unknown): SeriesItem | null => {
                                const i = item as any;
                                const parsedMeta = customMetadataEntriesToMeta(i.customMetadata || []) as Record<string, string>;
                                const itemSeriesName = normalizeSeriesName(parsedMeta?.series || parsedMeta?.seriesname);
                                if (itemSeriesName.toLowerCase() !== seriesName.toLowerCase()) return null;
                                return {
                                    id: i.id,
                                    title: i.title || t("publicGallery.unknown"),
                                    coverUrl: i.coverUrl || null,
                                    seriesOrder: parseSeriesOrder(i?.seriesOrder ?? parsedMeta?.seriesorder),
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
                
                // Resolve marker configs for public reader:
                // always scope to script theme; fallback to default rules.
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
            // Mock Fallback for Verification/Dev
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
                 setActiveCloudScript({
                     id: "mock-script-id", 
                     title: "The Infinite Horizon",
                     markerThemeId: "default" 
                 });
                 setCloudScriptMode("read");
	                 setMockMeta({
                    coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
                    author: { id: "user-1", displayName: "Alex Chen", avatarUrl: "https://github.com/shadcn.png" },
                    organization: null,
                    tags: ["Sci-Fi", "Thriller"],
                    synopsis: "Two astronauts on a distant moon discover a time-bending anomaly.",
                    description: "", date: "", contact: "", source: "", credit: "", authors: "",
                    headerAuthor: "", license: "", commercialUse: "", derivativeUse: "", notifyOnModify: "",
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


  // Hook for viewer defaults (font, theme css injection)
  const viewerDefaults = useScriptViewerDefaults({
    theme: activeCloudScript?.markerThemeId,
    markerConfigs: publicMarkerConfigs,
  });

  const fullScriptData = useMemo(() => ({
      ...activeCloudScript,
      content: rawScript,
      title: scriptManager.titleName,
      ...mockMeta
  }), [activeCloudScript, rawScript, scriptManager.titleName, mockMeta]);

  const structuredData = useMemo(() => {
      if (!fullScriptData?.id || !fullScriptData?.title) return null;

      const url =
          typeof window !== "undefined"
              ? `${window.location.origin}/read/${fullScriptData.id}`
              : `/read/${fullScriptData.id}`;

      const authorName = fullScriptData?.author?.displayName || fullScriptData?.headerAuthor || "";
      const orgName = fullScriptData?.organization?.name || "";
      const description =
          fullScriptData?.synopsis ||
          fullScriptData?.description ||
          t("publicReaderPage.descriptionFallback");
      const dateRaw = fullScriptData?.updatedAt || fullScriptData?.lastModified || fullScriptData?.date || null;

      let dateModified;
      if (typeof dateRaw === "number" && Number.isFinite(dateRaw)) {
          try {
              dateModified = new Date(dateRaw).toISOString();
          } catch {
              dateModified = undefined;
          }
      } else if (typeof dateRaw === "string" && dateRaw.trim()) {
          const parsed = Date.parse(dateRaw);
          if (!Number.isNaN(parsed)) {
              dateModified = new Date(parsed).toISOString();
          }
      }

      const data: Record<string, unknown> = {
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: fullScriptData.title,
          headline: fullScriptData.title,
          url,
          inLanguage: "zh-Hant",
          description,
          genre: Array.isArray(fullScriptData?.tags) ? fullScriptData.tags : undefined,
          dateModified,
          isAccessibleForFree: true,
      };

      if (authorName) {
          data["author"] = { "@type": "Person", name: authorName };
      }
      if (orgName) {
          data["publisher"] = { "@type": "Organization", name: orgName };
      }
      if (fullScriptData?.coverUrl) {
          data["image"] = fullScriptData.coverUrl;
      }

      return data;
  }, [fullScriptData]);

  const surfaceProps = useMemo(() => ({
      scrollRef: navProps?.contentScrollRef,
  }), [navProps?.contentScrollRef]);

  const mergedViewerProps = useMemo(() => ({
      ...viewerDefaults,
      // Pass pre-parsed data so ScriptViewer skips its own parseScreenplay call.
      externalAst: scriptManager.ast,
      externalScenes: scriptManager.parsedScenes,
      externalTitleEntries: scriptManager.parsedTitleEntries,
      filterCharacter,
      focusMode,
      onCharacters: setCharacterList,
      onTitle: setTitleHtml,
      onTitleNote: setTitleNote,
      onSummary: setTitleSummary,
      onHasTitle: setHasTitle,
      onScenes: setSceneList,
      scrollToScene: scrollSceneId,
      hiddenMarkerIds: scriptManager.hiddenMarkerIds,
  }), [
      viewerDefaults,
      scriptManager.ast,
      scriptManager.parsedScenes,
      scriptManager.parsedTitleEntries,
      filterCharacter,
      focusMode,
      setCharacterList,
      setTitleHtml,
      setTitleNote,
      setTitleSummary,
      setHasTitle,
      setSceneList,
      scrollSceneId,
      scriptManager.hiddenMarkerIds,
  ]);

  return (
    <>
    {structuredData && (
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        {fullScriptData?.coverUrl && (
          <>
            <meta property="og:image" content={fullScriptData.coverUrl} />
            <meta name="twitter:image" content={fullScriptData.coverUrl} />
          </>
        )}
      </Helmet>
    )}
    <PublicReaderLayout
        script={fullScriptData}
        isLoading={isLoading}
        relatedSeriesScripts={relatedSeriesScripts as any}
        onOpenRelatedScript={(scriptId: string) => navigate(`/read/${scriptId}`)}
        onOpenSeries={(name: string) => navigate(`/series/${encodeURIComponent(name)}`)}
        onBack={() => navigate("/")} // Return to library/home
        onShare={async () => {
            const url = window.location.href;
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(url);
                    alert("已複製連結");
                    return;
                }
            } catch (error) {
                console.error("Failed to write share url to clipboard", error);
                alert("複製連結失敗，請稍後再試");
            }
            window.prompt("請複製目前網址", url);
        }}
        // Marker Props for Header (same source as ScriptViewer)
        validMarkerConfigs={publicMarkerConfigs}
        hiddenMarkerIds={scriptManager.hiddenMarkerIds as any}
        onToggleMarker={scriptManager.toggleMarkerVisibility}
        renderedHtml=""
        
        // onExport={() => {}} // Optional
        scriptSurfaceProps={surfaceProps}
        viewerProps={mergedViewerProps}
    />
    <TermsConsentDialog
      open={termsDialogOpen}
      onOpenChange={(open: boolean) => { if (!open && !isSubmittingTerms) { setTermsDialogOpen(false); navigate("/"); } }}
      termsConfig={termsConfig}
      termsScrollRef={termsScrollRef}
      termsReadToBottom={termsReadToBottom}
      termsRequireScroll={termsRequireScroll}
      acceptedChecks={acceptedChecks}
      isSubmittingTerms={isSubmittingTerms}
      canConfirmTerms={canConfirmTerms}
      missingRequiredCheckCount={missingRequiredCheckCount}
      handleTermsScroll={handleTermsScroll}
      toggleRequiredCheck={toggleRequiredCheck}
      onConfirm={() => confirmTermsConsent(id)}
      onCancel={() => navigate("/")}
      cancelLabel="返回公開台本"
      confirmLabel="同意並進入"
    />
    </>
  );
}
