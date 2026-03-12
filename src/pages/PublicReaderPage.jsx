import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PublicReaderLayout } from "../components/reader/PublicReaderLayout";
import { getPublicBundle, getPublicScript, getPublicThemes, getPublicTermsConfig, acceptPublicTerms } from "../lib/api/public";
import { deriveSimpleLicenseTags, parseBasicLicenseFromMeta } from "../lib/licenseRights";
import { normalizeSeriesName, parseSeriesOrder } from "../lib/series";
import ScriptViewer from "../components/renderer/ScriptViewer";
import { useScriptViewerDefaults } from "../hooks/useScriptViewerDefaults";
import { useI18n } from "../contexts/I18nContext";
import { normalizeMarkerConfigsSchema } from "../lib/markerThemeCodec.js";
import { defaultMarkerConfigs } from "../constants/defaultMarkerRules.js";
import { parseActivityDemoLinks } from "../lib/activityDemoLinks";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Checkbox } from "../components/ui/checkbox";
import { Button } from "../components/ui/button";
import { customMetadataEntriesToMeta, customMetadataEntriesToRawEntries } from "../lib/customMetadata";

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
    { id: "chaptersettings", title: "章節", keys: ["chaptersettings"] },
].map((rule) => ({
    ...rule,
    keys: rule.keys.map(normalizePrefaceKey),
}));

const TERMS_VISITOR_ID_KEY = "public_terms_visitor_id";
const TERMS_ACCEPTED_PREFIX = "public_terms_accepted_v";

const getOrCreateTermsVisitorId = () => {
  try {
    const existing = localStorage.getItem(TERMS_VISITOR_ID_KEY);
    if (existing) return existing;
    const generated =
      (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
      `visitor_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    localStorage.setItem(TERMS_VISITOR_ID_KEY, generated);
    return generated;
  } catch {
    return "";
  }
};

const hasAcceptedTermsVersion = (version) => {
  if (!version) return false;
  try {
    return Boolean(localStorage.getItem(`${TERMS_ACCEPTED_PREFIX}${version}`));
  } catch {
    return false;
  }
};

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
  const [termsConfig, setTermsConfig] = useState(null);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [termsReadToBottom, setTermsReadToBottom] = useState(false);
  const [termsRequireScroll, setTermsRequireScroll] = useState(false);
  const [acceptedChecks, setAcceptedChecks] = useState({});
  const [isSubmittingTerms, setIsSubmittingTerms] = useState(false);

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
                const meta = customMetadataEntriesToMeta(script.customMetadata || []);
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
                        id: person.id,
                        displayName: person.displayName || person.name || "Unknown",
                        avatarUrl: person.avatar || person.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${person.displayName || person.name || "U"}`
                    } : (authorOverride ? {
                        id: "header-author-fallback",
                        displayName: authorOverride,
                        avatarUrl: "",
                    } : null));
                const resolvedOrganization = useOverrideAuthor
                    ? null
                    : (organization ? {
                        id: organization.id,
                        name: organization.name || organization.displayName,
                        logoUrl: organization.logoUrl || organization.avatar || organization.avatarUrl
                    } : null);

                const basicLicenseFromMeta = parseBasicLicenseFromMeta(meta);
                const basicLicense = {
                    commercialUse: basicLicenseFromMeta.commercialUse || String(script.licenseCommercial || "").toLowerCase(),
                    derivativeUse: basicLicenseFromMeta.derivativeUse || String(script.licenseDerivative || "").toLowerCase(),
                    notifyOnModify: basicLicenseFromMeta.notifyOnModify || String(script.licenseNotify || "").toLowerCase(),
                };

                setMockMeta({
                    coverUrl: script.coverUrl || null,
                    author: resolvedAuthor,
                    organization: resolvedOrganization,
                    tags: script.tags ? script.tags.map(t => t.name) : [],
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
                        const sameSeries = (bundle?.scripts || [])
                            .filter((item) => item?.id && item.id !== script.id)
                            .map((item) => {
                                const parsedMeta = customMetadataEntriesToMeta(item.customMetadata || []);
                                const itemSeriesName = normalizeSeriesName(parsedMeta?.series || parsedMeta?.seriesname);
                                if (itemSeriesName.toLowerCase() !== seriesName.toLowerCase()) return null;
                                return {
                                    id: item.id,
                                    title: item.title || t("publicGallery.unknown"),
                                    coverUrl: item.coverUrl || null,
                                    seriesOrder: parseSeriesOrder(item?.seriesOrder ?? parsedMeta?.seriesorder),
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

  useEffect(() => {
    let cancelled = false;
    const loadTermsConfig = async () => {
      try {
        const config = await getPublicTermsConfig();
        if (cancelled) return;
        const normalized = config || null;
        setTermsConfig(normalized);
        const version = normalized?.version;
        if (!version || hasAcceptedTermsVersion(version)) return;
        const requiredChecks = Array.isArray(normalized?.requiredChecks) ? normalized.requiredChecks : [];
        const initialChecks = {};
        requiredChecks.forEach((item) => {
          if (item?.id) initialChecks[item.id] = false;
        });
        setAcceptedChecks(initialChecks);
        setTermsReadToBottom(false);
        setTermsDialogOpen(true);
      } catch (error) {
        console.error("Failed to load public terms config", error);
      }
    };
    loadTermsConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!termsDialogOpen) return;
    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      const node = document.getElementById("reader-terms-scroll");
      if (!node) {
        requestAnimationFrame(check);
        return;
      }
      const scrollable = node.scrollHeight > node.clientHeight + 1;
      setTermsRequireScroll(scrollable);
      if (!scrollable) setTermsReadToBottom(true);
    };
    requestAnimationFrame(check);
    return () => {
      cancelled = true;
    };
  }, [termsDialogOpen, termsConfig]);

  const handleTermsScroll = (event) => {
    const target = event.currentTarget;
    if (!target) return;
    const buffer = 16;
    const scrollable = target.scrollHeight > target.clientHeight + 1;
    setTermsRequireScroll(scrollable);
    if (!scrollable) {
      setTermsReadToBottom(true);
      return;
    }
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - buffer;
    if (reachedBottom) setTermsReadToBottom(true);
  };

  const toggleRequiredCheck = (checkId, checked) => {
    setAcceptedChecks((prev) => ({ ...prev, [checkId]: Boolean(checked) }));
  };

  const canConfirmTerms = (() => {
    if (termsRequireScroll && !termsReadToBottom) return false;
    const requiredChecks = Array.isArray(termsConfig?.requiredChecks) ? termsConfig.requiredChecks : [];
    if (requiredChecks.length === 0) return true;
    return requiredChecks.every((item) => Boolean(acceptedChecks[item.id]));
  })();
  const missingRequiredCheckCount = (() => {
    const requiredChecks = Array.isArray(termsConfig?.requiredChecks) ? termsConfig.requiredChecks : [];
    return requiredChecks.filter((item) => !acceptedChecks[item.id]).length;
  })();

  const confirmTermsConsent = async () => {
    if (!id || !termsConfig?.version || !canConfirmTerms || isSubmittingTerms) return;
    setIsSubmittingTerms(true);
    try {
      const visitorId = getOrCreateTermsVisitorId();
      const agreedCheckIds = (termsConfig.requiredChecks || [])
        .filter((item) => item?.id && acceptedChecks[item.id])
        .map((item) => item.id);
      await acceptPublicTerms({
        termsVersion: termsConfig.version,
        scriptId: id,
        visitorId,
        locale: navigator.language || "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        userAgent: navigator.userAgent || "",
        platform: navigator.platform || "",
        screen: {
          width: window.screen?.width || 0,
          height: window.screen?.height || 0,
          colorDepth: window.screen?.colorDepth || 0,
          pixelRatio: window.devicePixelRatio || 1,
        },
        viewport: {
          width: window.innerWidth || 0,
          height: window.innerHeight || 0,
        },
        pagePath: window.location.pathname + window.location.search,
        referrer: document.referrer || "",
        acceptedChecks: agreedCheckIds,
      });
      localStorage.setItem(`${TERMS_ACCEPTED_PREFIX}${termsConfig.version}`, String(Date.now()));
      setTermsDialogOpen(false);
    } catch (error) {
      console.error("Failed to submit terms consent", error);
    } finally {
      setIsSubmittingTerms(false);
    }
  };

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
        hiddenMarkerIds={scriptManager.hiddenMarkerIds}
        onToggleMarker={scriptManager.toggleMarkerVisibility}
        renderedHtml=""
        
        // onExport={() => {}} // Optional
        scriptSurfaceProps={surfaceProps}
        viewerProps={mergedViewerProps}
    />
    <Dialog
      open={termsDialogOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmittingTerms) {
          setTermsDialogOpen(false);
          navigate("/");
        }
      }}
    >
      <DialogContent
        className="w-[94vw] max-w-2xl p-0 overflow-hidden border"
        style={{
          backgroundColor: "var(--license-overlay-bg)",
          borderColor: "var(--license-overlay-border)",
          color: "var(--license-overlay-fg)",
        }}
      >
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-left">{termsConfig?.title || "授權條款與使用聲明"}</DialogTitle>
          <DialogDescription className="text-left">
            {termsConfig?.intro || "請先閱讀並同意以下條款，完成後才能進入劇本閱讀頁。"}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-2">
          <div
            id="reader-terms-scroll"
            onScroll={handleTermsScroll}
            className="max-h-[46vh] overflow-y-auto touch-pan-y rounded-md border p-4 text-sm leading-6"
            style={{
              backgroundColor: "var(--license-term-bg)",
              borderColor: "var(--license-term-border)",
              color: "var(--license-term-fg)",
            }}
          >
            {(termsConfig?.sections || []).map((section) => (
              <section key={section.id || section.title} className="mb-4 last:mb-0">
                <h4 className="font-semibold text-foreground">{section.title}</h4>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{section.body}</p>
              </section>
            ))}
            {(termsConfig?.sections || []).length === 0 && (
              <p className="text-muted-foreground">條款內容尚未設定。</p>
            )}
          </div>
          <p
            className="mt-2 text-xs"
            style={{
              color:
                termsReadToBottom || !termsRequireScroll
                  ? "var(--license-selected-fg)"
                  : "hsl(var(--muted-foreground))",
            }}
          >
            {termsRequireScroll
              ? (termsReadToBottom ? "已讀到最下方，可進行確認。" : "請先將條款內容滑到最下方。")
              : "確認已閱條款後，可勾選確認。"}
          </p>
        </div>
        <div className="px-5 pb-2 space-y-2">
          {missingRequiredCheckCount > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              尚有 {missingRequiredCheckCount} 項必須同意。
            </div>
          )}
          {(termsConfig?.requiredChecks || []).map((item) => (
            <label
              key={item.id}
              className={`flex items-start gap-2 rounded-md border px-2 py-2 text-sm ${
                acceptedChecks[item.id]
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-amber-500/40 bg-amber-500/10"
              }`}
            >
              <Checkbox
                className="mt-0.5"
                checked={Boolean(acceptedChecks[item.id])}
                onCheckedChange={(checked) => toggleRequiredCheck(item.id, checked)}
                disabled={(termsRequireScroll && !termsReadToBottom) || isSubmittingTerms}
              />
              <span className={acceptedChecks[item.id] ? "text-foreground/90" : "text-amber-800 dark:text-amber-300"}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
        <DialogFooter className="px-5 pb-5 pt-2">
          <Button variant="outline" onClick={() => navigate("/")} disabled={isSubmittingTerms}>
            返回公開台本
          </Button>
          <Button onClick={confirmTermsConsent} disabled={!canConfirmTerms || isSubmittingTerms}>
            {isSubmittingTerms ? "送出中..." : "同意並進入"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
