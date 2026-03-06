import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PublicReaderLayout } from "../components/reader/PublicReaderLayout";
import { getPublicBundle, getPublicScript, getPublicThemes } from "../lib/api/public";
import { extractMetadataWithRaw } from "../lib/metadataParser";
import { deriveSimpleLicenseTags, parseBasicLicenseFromMeta } from "../lib/licenseRights";
import { normalizeSeriesName, parseSeriesOrder } from "../lib/series";
import ScriptViewer from "../components/renderer/ScriptViewer";
import { useScriptViewerDefaults } from "../hooks/useScriptViewerDefaults";
import { useI18n } from "../contexts/I18nContext";
import { normalizeMarkerConfigsSchema } from "../lib/markerThemeCodec.js";
import { defaultMarkerConfigs } from "../constants/defaultMarkerRules.js";
import { parseScreenplay } from "../lib/screenplayAST.js";

// Helper for robust list parsing (handles double-encoded JSON strings)
const ensureList = (val) => {
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
    { id: "environmentinfo", title: "環境", keys: ["environmentinfo", "環境"] },
    { id: "situationinfo", title: "狀況", keys: ["situationinfo", "狀況"] },
].map((rule) => ({
    ...rule,
    keys: rule.keys.map(normalizePrefaceKey),
}));

const buildPrefaceItems = (meta = {}) => {
    const valueByKey = new Map();
    Object.entries(meta || {}).forEach(([key, value]) => {
        const normalizedKey = normalizePrefaceKey(key);
        const normalizedValue = String(value || "").trim();
        if (!normalizedKey || !normalizedValue || valueByKey.has(normalizedKey)) return;
        valueByKey.set(normalizedKey, normalizedValue);
    });

    const items = [];
    const seen = new Set();
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

export default function PublicReaderPage({ scriptManager, navProps }) {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
      // Existing destructured props...
      setActivePublicScriptId, setRawScript, setTitleName, setActiveFile,
      isLoading, setIsLoading, setActiveCloudScript, activeCloudScript,
      // Props required for ScriptSurface/Viewer
      rawScript, filterCharacter, focusMode, focusEffect, focusContentMode,
      highlightCharacters, highlightSfx, setCharacterList, setTitleHtml, setTitleNote, setTitleSummary, setHasTitle, setSceneList,
      scrollSceneId, fontSize, bodyFontSize, dialogueFontSize, accentConfig, contentScrollRef, setScrollProgress, setCloudScriptMode
  } = scriptManager;

  const [mockMeta, setMockMeta] = useState(null);
  const [relatedSeriesScripts, setRelatedSeriesScripts] = useState([]);
  const [publicMarkerConfigs, setPublicMarkerConfigs] = useState(
    normalizeMarkerConfigsSchema(defaultMarkerConfigs)
  );

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
                
                const { meta, rawEntries } = extractMetadataWithRaw(script.content || "");
                setRawScript(script.content || "");
                const reserved = new Set([
                    "title", "credit", "author", "authors", "source",
                    "draftdate", "date", "contact", "copyright",
                    "notes", "description", "synopsis", "summary",
                    "outline",
                    "rolesetting", "backgroundinfo", "performanceinstruction", "openingintro", "environmentinfo", "situationinfo",
                    "activityname", "activitybanner", "activitycontent", "activitydemourl", "activityworkurl",
                    "eventname", "eventbanner", "eventcontent", "eventdemolink", "eventworklink",
                    "setting", "settingintro", "background", "backgroundintro",
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
                
                setMockMeta({
                    coverUrl: script.coverUrl || null,
                    author: person ? {
                        id: person.id,
                        displayName: person.displayName || person.name || "Unknown",
                        avatarUrl: person.avatar || person.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${person.displayName || person.name || "U"}`
                    } : null,
                    organization: organization ? {
                        id: organization.id,
                        name: organization.name || organization.displayName,
                        logoUrl: organization.logoUrl || organization.avatar || organization.avatarUrl
                    } : null,
                    tags: script.tags ? script.tags.map(t => t.name) : [],
                    synopsis: meta.synopsis || meta.summary || "",
                    description: meta.description || meta.notes || "",
                    date: meta.date || meta.draftdate || "",
                    contact: contactValue,
                    source: meta.source || "",
                    credit: meta.credit || "",
                    authors: meta.authors || "",
                    headerAuthor: meta.author || "",
                    license: meta.license || "",
                    ...parseBasicLicenseFromMeta(meta),
                    licenseSpecialTerms: ensureList(meta.licensespecialterms || meta.licenseSpecialTerms),
                    licenseTags: deriveSimpleLicenseTags(parseBasicLicenseFromMeta(meta)),
                    seriesName,
                    seriesOrder,
                    prefaceItems: buildPrefaceItems(meta),
                    activity: {
                        name: String(meta.activityname || meta.eventname || "").trim(),
                        bannerUrl: String(meta.activitybanner || meta.eventbanner || "").trim(),
                        content: String(meta.activitycontent || meta.eventcontent || "").trim(),
                        demoUrl: String(meta.activitydemourl || meta.eventdemolink || "").trim(),
                        workUrl: String(meta.activityworkurl || meta.eventworklink || "").trim(),
                    },
                    customFields,
                    showMarkerLegend: String(meta.marker_legend) === 'true' || String(meta.show_legend) === 'true'
                });

                if (seriesName) {
                    try {
                        const bundle = await getPublicBundle();
                        const sameSeries = (bundle?.scripts || [])
                            .filter((item) => item?.id && item.id !== script.id)
                            .map((item) => {
                                let parsed = { meta: {} };
                                try {
                                    parsed = extractMetadataWithRaw(item.content || "");
                                } catch {
                                    parsed = { meta: {} };
                                }
                                const itemSeriesName = normalizeSeriesName(parsed.meta?.series || parsed.meta?.seriesname);
                                if (itemSeriesName.toLowerCase() !== seriesName.toLowerCase()) return null;
                                return {
                                    id: item.id,
                                    title: item.title || t("publicGallery.unknown"),
                                    coverUrl: item.coverUrl || null,
                                    seriesOrder: parseSeriesOrder(parsed?.meta?.seriesorder),
                                };
                            })
                            .filter(Boolean)
                            .sort((a, b) => {
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
                        const matched = themes.find((t) => t.id === script.markerThemeId);
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
                 setActiveFile({ 
                    id: "mock-script-id", 
                    name: "The Infinite Horizon", 
                    type: 'script',
                    isPublic: true 
                 });
                 setActiveCloudScript({ 
                     id: "mock-script-id", 
                     title: "The Infinite Horizon",
                     markerThemeId: "default" 
                 });
                 setCloudScriptMode("read");
	                 setMockMeta({
                    coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
                    author: { id: "user-1", displayName: "Alex Chen", avatarUrl: "https://github.com/shadcn.png" },
                    tags: ["Sci-Fi", "Thriller"],
	                    synopsis: "Two astronauts on a distant moon discover a time-bending anomaly."
	                });
                    setRelatedSeriesScripts([]);
	            }
        } finally {
            setIsLoading(false);
        }
    };

    loadScript();
  }, [id, setIsLoading, setActivePublicScriptId, setRawScript, setTitleName, setActiveFile, setCloudScriptMode]);

  // Hook for viewer defaults (font, theme css injection)
  const viewerDefaults = useScriptViewerDefaults({
    theme: activeCloudScript?.markerThemeId, // Ideally this hook handles theme logic
    fontSize,
    bodyFontSize,
    dialogueFontSize,
    accentColor: accentConfig?.accent || "#3b82f6",
    markerConfigs: publicMarkerConfigs, // Public reader uses resolved script-scoped configs directly
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

      const data = {
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
          data.author = {
              "@type": "Person",
              name: authorName,
          };
      }
      if (orgName) {
          data.publisher = {
              "@type": "Organization",
              name: orgName,
          };
      }
      if (fullScriptData?.coverUrl) {
          data.image = fullScriptData.coverUrl;
      }

      return data;
  }, [fullScriptData]);

  const surfaceProps = useMemo(() => ({
      scrollRef: navProps?.contentScrollRef,
      onScrollProgress: setScrollProgress,
  }), [navProps?.contentScrollRef, setScrollProgress]);

  const mergedViewerProps = useMemo(() => ({
      ...viewerDefaults,
      filterCharacter,
      focusMode,
      focusEffect,
      focusContentMode,
      highlightCharacters,
      highlightSfx,
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
      filterCharacter,
      focusMode,
      focusEffect,
      focusContentMode,
      highlightCharacters,
      highlightSfx,
      setCharacterList,
      setTitleHtml,
      setTitleNote,
      setTitleSummary,
      setHasTitle,
      setSceneList,
      scrollSceneId,
      scriptManager.hiddenMarkerIds,
  ]);

  useEffect(() => {
    const sceneRules = (Array.isArray(publicMarkerConfigs) ? publicMarkerConfigs : []).filter((cfg) =>
      cfg?.parseAs === "scene_heading" || String(cfg?.id || "").toLowerCase().includes("chapter")
    );
    const parsed = (() => {
      try {
        return parseScreenplay(rawScript || "", publicMarkerConfigs || [])?.scenes || [];
      } catch (error) {
        console.error("[MarkerDebug] parseScreenplay failed", error);
        return [];
      }
    })();

    console.log("[MarkerDebug] effective public marker configs", {
      totalConfigs: Array.isArray(publicMarkerConfigs) ? publicMarkerConfigs.length : 0,
      sceneRules: sceneRules.map((cfg) => ({
        id: cfg?.id,
        matchMode: cfg?.matchMode,
        parseAs: cfg?.parseAs,
        regex: cfg?.regex || null,
      })),
      parsedScenes: parsed.map((s) => ({ id: s.id, label: s.label })),
      rawScriptHead: (rawScript || "").split("\n").slice(0, 28),
    });
  }, [publicMarkerConfigs, rawScript]);

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
        relatedSeriesScripts={relatedSeriesScripts}
        onOpenRelatedScript={(scriptId) => navigate(`/read/${scriptId}`)}
        onOpenSeries={(name) => navigate(`/series/${encodeURIComponent(name)}`)}
        onBack={() => navigate("/")} // Return to library/home
        onShare={() => {
            if (navigator.share) {
                navigator.share({
                    title: fullScriptData.title,
                    text: fullScriptData.synopsis,
                    url: window.location.href
                });
            } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copied!");
            }
        }}
        // Marker Props for Header (same source as ScriptViewer)
        validMarkerConfigs={publicMarkerConfigs}
        hiddenMarkerIds={scriptManager.hiddenMarkerIds}
        onToggleMarker={scriptManager.toggleMarkerVisibility}
        renderedHtml=""
        
        // onExport={() => {}} // Optional
        scriptSurfaceProps={surfaceProps}
        viewerProps={mergedViewerProps}
    />
    </>
  );
}
