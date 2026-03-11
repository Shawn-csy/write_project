import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { SimplifiedReaderHeader } from "./SimplifiedReaderHeader";
import { PublicScriptInfoOverlay } from "./PublicScriptInfoOverlay";
import { PublicMarkerLegend } from "./PublicMarkerLegend";
import ScriptSurface from "../editor/ScriptSurface";
import { useSettings } from "../../contexts/SettingsContext";
import { loadBasicScriptExport, loadXlsxScriptExport } from "../../lib/scriptExportLoader";
import { useI18n } from "../../contexts/I18nContext";
import { CoverPlaceholder } from "../ui/CoverPlaceholder";
import { SpotlightGuideOverlay } from "../common/SpotlightGuideOverlay";
import { normalizeActivityDemoLinks } from "../../lib/activityDemoLinks";

const PUBLIC_READER_GUIDE_STORAGE_KEY = "public-reader-guide-seen-v1";
const PUBLIC_READER_TOC_OPEN_STORAGE_KEY = "public-reader-toc-open-v1";

export function PublicReaderLayout({
  script, // { content, title, ...meta }
  isLoading,
  relatedSeriesScripts = [],
  onOpenRelatedScript,
  onOpenSeries,
  onBack,
  onShare,
  viewerProps,      // passed to ScriptSurface
  scriptSurfaceProps, // passed to ScriptSurface (scrollRef, etc)
  renderedHtml = "",
  // Marker Props
  validMarkerConfigs = [],
  hiddenMarkerIds = [],
  onToggleMarker
}) {
  const { t } = useI18n();
  const escapeHtml = useCallback((value = "") =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  , []);
  const {
    title, 
    author, 
    organization,
    synopsis, 
    commercialUse,
    derivativeUse,
    notifyOnModify,
    contact,
    seriesName,
    prefaceItems,
    activity,
    coverUrl, 
    content: rawScript,
    disableCopy
  } = script || {};

  const contactLines = useMemo(() => {
    const toPairsFromObject = (obj) =>
      Object.entries(obj || {})
        .map(([key, value]) => ({
          key: String(key || "").trim(),
          value: String(value ?? "").trim(),
        }))
        .filter((entry) => entry.key && entry.value);

    if (contact && typeof contact === "object" && !Array.isArray(contact)) {
      return toPairsFromObject(contact);
    }

    let raw = String(contact || "").trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return toPairsFromObject(parsed);
      }
      if (Array.isArray(parsed)) {
        const list = parsed
          .map((item) => String(item ?? "").trim())
          .filter(Boolean);
        return list.map((value) => ({ key: "", value }));
      }
      raw = String(parsed ?? "").trim();
    } catch {}

    return raw
      .split(/\r?\n|\/|\||；|;|，|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((value) => ({ key: "", value }));
  }, [contact]);

  const contactRender = contactLines.length > 0 ? (
    <div className="space-y-1.5">
      {contactLines.map((line, idx) => (
        <div key={`${line.key || "line"}-${idx}`} className="leading-5">
          {line.key ? (
            <>
              <span className="text-muted-foreground">{line.key}：</span>
              <span className="ml-1">{line.value}</span>
            </>
          ) : (
            <span>{line.value}</span>
          )}
        </div>
      ))}
    </div>
  ) : null;

  const metaItems = [
    { label: t("publicScriptInfo.contact"), render: contactRender },
    script?.showMarkerLegend && validMarkerConfigs?.length > 0
      ? {
          label: t("publicReader.markerLegend"),
          render: (
            <PublicMarkerLegend
              markerConfigs={validMarkerConfigs}
              className="grid-cols-1 gap-y-1 md:grid-cols-1"
            />
          ),
        }
      : null,
  ].filter((item) => item && (item.render || String(item.value || "").trim()));

  // Content Protection: Disable copy when disableCopy is true
  useEffect(() => {
    if (!disableCopy) return;

    const preventCopy = (e) => e.preventDefault();
    const preventContextMenu = (e) => e.preventDefault();
    const preventKeyboardShortcuts = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'a' || e.key === 's' || e.key === 'x') {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyboardShortcuts);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
    };
  }, [disableCopy]);

  // Background Style
  // If coverUrl exists, use it as a blurred background. 
  // Otherwise use a gradient or partial solid color.
  const backgroundStyle = coverUrl
    ? {
        backgroundImage: `url(${coverUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background: "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--muted)))",
      };

  const [exportRenderedHtml, setExportRenderedHtml] = useState("");
  const [exportRawHtml, setExportRawHtml] = useState("");
  const externalOnProcessedHtml = viewerProps?.onProcessedHtml;
  const externalOnRawHtml = viewerProps?.onRawHtml;
  const mergedViewerProps = useMemo(() => ({
    ...(viewerProps || {}),
    onProcessedHtml: (html) => {
      const next = html || "";
      setExportRenderedHtml(next);
      externalOnProcessedHtml?.(next);
    },
    onRawHtml: (html) => {
      const next = html || "";
      setExportRawHtml(next);
      externalOnRawHtml?.(next);
    },
  }), [viewerProps, externalOnProcessedHtml, externalOnRawHtml]);

  const licenseSummary = useMemo(() => {
    const normalize = (value) => String(value || "").trim().toLowerCase();
    const commercial = normalize(commercialUse);
    const derivative = normalize(derivativeUse);
    const notify = normalize(notifyOnModify);
    return [
      commercial
        ? `商業使用：${commercial === "allow" ? "可" : "不可"}`
        : "",
      derivative
        ? `改作許可：${derivative === "allow" ? "可" : derivative === "disallow" ? "不可" : "需同意"}`
        : "",
      notify
        ? `修改通知：${notify === "required" ? "需要" : "不需要"}`
        : "",
    ].filter(Boolean);
  }, [commercialUse, derivativeUse, notifyOnModify]);

  const exportBaseName = useMemo(() => {
    const safeTitle = String(title || "script").trim() || "script";
    const authorName =
      String(author?.displayName || author?.name || organization?.name || "unknown").trim() || "unknown";
    return `${safeTitle}_${authorName}`;
  }, [title, author?.displayName, author?.name, organization?.name]);

  const pdfHeaderHtml = useMemo(() => {
    const safeTitle = escapeHtml(title || "Script");
    const safeSynopsis = escapeHtml(synopsis || "");
    const safeCoverUrl = String(coverUrl || "").trim();
    const metaRows = [];
    if (organization?.name) metaRows.push(`組織：${escapeHtml(organization.name)}`);
    if (author?.displayName) metaRows.push(`作者：${escapeHtml(author.displayName)}`);
    contactLines.forEach((line) => {
      const text = line.key ? `${line.key}: ${line.value}` : line.value;
      if (String(text || "").trim()) metaRows.push(`聯絡：${escapeHtml(text)}`);
    });
    licenseSummary.forEach((item) => metaRows.push(escapeHtml(item)));
    return `
      <section style="margin-bottom:20px;">
        ${safeCoverUrl ? `
          <div style="margin-bottom:14px;">
            <img src="${escapeHtml(safeCoverUrl)}" alt="${safeTitle}" style="width:100%;max-height:360px;object-fit:cover;border-radius:10px;border:1px solid #d6d9e0;" />
          </div>
        ` : ""}
        <h1 style="margin:0 0 8px 0;font-size:28px;line-height:1.25;">${safeTitle}</h1>
        ${safeSynopsis ? `<p style="margin:0 0 12px 0;color:#4b5563;white-space:pre-wrap;">${safeSynopsis}</p>` : ""}
        ${metaRows.length > 0 ? `
          <div style="padding:10px 12px;border:1px solid #d6d9e0;border-radius:10px;background:#f8fafc;">
            ${metaRows.map((row) => `<div style="font-size:12px;line-height:1.6;color:#374151;">${row}</div>`).join("")}
          </div>
        ` : ""}
      </section>
    `.trim();
  }, [escapeHtml, title, synopsis, coverUrl, organization?.name, author?.displayName, contactLines, licenseSummary]);

  const downloadOptions = [
    {
      id: "pdf",
      label: t("publicReader.exportPdf"),
      icon: Printer,
      onClick: async () => {
        const { exportScriptAsPdf } = await loadBasicScriptExport();
        await exportScriptAsPdf(exportBaseName, {
          text: rawScript || "",
          renderedHtml: exportRenderedHtml || exportRawHtml || renderedHtml || "",
          headerHtml: pdfHeaderHtml,
        });
      },
      disabled: !rawScript && !title,
    },
    {
      id: "docx",
      label: t("publicReader.downloadDoc"),
      icon: FileText,
      onClick: async () => {
        const { exportScriptAsDocx } = await loadBasicScriptExport();
        await exportScriptAsDocx(exportBaseName, { text: rawScript || "", renderedHtml });
      },
      disabled: !rawScript,
    },
    {
      id: "xlsx",
      label: t("publicReader.downloadXlsx"),
      icon: FileSpreadsheet,
      onClick: async () => {
        const { exportScriptAsXlsx } = await loadXlsxScriptExport();
        await exportScriptAsXlsx(exportBaseName, { text: rawScript || "", renderedHtml });
      },
      disabled: !rawScript,
    },
  ];

  const { hideWhitespace } = useSettings();
  const [showGuide, setShowGuide] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);
  const [guideSpotlightRect, setGuideSpotlightRect] = useState(null);
  const [tocOpen, setTocOpen] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      return localStorage.getItem(PUBLIC_READER_TOC_OPEN_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const guideSteps = useMemo(() => ([
    {
      title: t("publicReader.guideTocPanelTitle", "左側導覽面板"),
      description: t("publicReader.guideTocPanelDesc", "這裡可快速跳場景、查看更多作品資訊。"),
      targetId: "public-guide-toc-panel",
    },
    {
      title: t("publicReader.guideHeaderTitle"),
      description: t("publicReader.guideHeaderDesc"),
      targetId: "public-guide-actions",
    },
    {
      title: t("publicReader.guideInfoTitle"),
      description: t("publicReader.guideInfoDesc"),
      targetId: "public-guide-info",
    },
    {
      title: t("publicReader.guideScriptTitle"),
      description: t("publicReader.guideScriptDesc"),
      targetId: "public-guide-script",
    },
  ]), [t]);
  const currentGuide = showGuide ? guideSteps[guideIndex] : null;

  const resolveGuideTarget = useCallback(() => {
    if (!currentGuide?.targetId) return null;
    return document.querySelector(`[data-guide-id="${currentGuide.targetId}"]`);
  }, [currentGuide]);

  const refreshGuideSpotlight = useCallback(() => {
    if (!showGuide) {
      setGuideSpotlightRect(null);
      return;
    }
    const node = resolveGuideTarget();
    if (!node) {
      setGuideSpotlightRect(null);
      return;
    }
    const rect = node.getBoundingClientRect();
    const pad = 10;
    setGuideSpotlightRect({
      top: Math.max(8, rect.top - pad),
      left: Math.max(8, rect.left - pad),
      width: Math.max(80, rect.width + pad * 2),
      height: Math.max(52, rect.height + pad * 2),
    });
  }, [resolveGuideTarget, showGuide]);

  const jumpGuide = useCallback((index) => {
    if (index < 0 || index >= guideSteps.length) return;
    setGuideIndex(index);
    setShowGuide(true);
  }, [guideSteps.length]);

  const finishGuide = useCallback(() => {
    setShowGuide(false);
    setGuideIndex(0);
    setGuideSpotlightRect(null);
    setTocOpen(false);
    try {
      localStorage.setItem(PUBLIC_READER_GUIDE_STORAGE_KEY, "1");
    } catch (err) {
      console.error("Failed to persist public reader guide state", err);
    }
  }, []);

  const handleGuideNext = useCallback(() => {
    if (guideIndex >= guideSteps.length - 1) {
      finishGuide();
      return;
    }
    jumpGuide(guideIndex + 1);
  }, [finishGuide, guideIndex, guideSteps.length, jumpGuide]);

  const handleGuidePrev = useCallback(() => {
    if (guideIndex <= 0) return;
    jumpGuide(guideIndex - 1);
  }, [guideIndex, jumpGuide]);

  const handleStartGuide = useCallback(() => {
    setTocOpen(false);
    jumpGuide(0);
  }, [jumpGuide]);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(PUBLIC_READER_GUIDE_STORAGE_KEY) === "1";
      if (!seen) {
        jumpGuide(0);
        localStorage.setItem(PUBLIC_READER_GUIDE_STORAGE_KEY, "1");
      }
    } catch (err) {
      console.error("Failed to read public reader guide state", err);
    }
  }, [jumpGuide]);

  useEffect(() => {
    if (!showGuide) return;
    const targetId = currentGuide?.targetId || "";
    if (targetId === "public-guide-toc-panel") {
      setTocOpen(true);
    } else if (targetId) {
      setTocOpen(false);
    }
  }, [showGuide, currentGuide]);

  useEffect(() => {
    if (!showGuide) return;
    const raf = window.requestAnimationFrame(refreshGuideSpotlight);
    window.addEventListener("resize", refreshGuideSpotlight);
    window.addEventListener("scroll", refreshGuideSpotlight, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", refreshGuideSpotlight);
      window.removeEventListener("scroll", refreshGuideSpotlight, true);
    };
  }, [showGuide, guideIndex, tocOpen, refreshGuideSpotlight]);

  useEffect(() => {
    try {
      localStorage.setItem(PUBLIC_READER_TOC_OPEN_STORAGE_KEY, tocOpen ? "1" : "0");
    } catch (err) {
      console.error("Failed to persist reader toc state", err);
    }
  }, [tocOpen]);

  // Content protection CSS class
  const protectionClass = disableCopy ? 'select-none' : '';
  const normalizedActivity = useMemo(() => {
    const base = activity || {};
    const name = String(base?.name || "").trim();
    const bannerUrl = String(base?.bannerUrl || "").trim();
    const content = String(base?.content || "").trim();
    const workUrl = String(base?.workUrl || "").trim();
    if (!name && !bannerUrl && !content && !workUrl) return null;
    return { name, bannerUrl, content, workUrl };
  }, [activity]);

  const normalizedDemoLinks = useMemo(() => {
    const base = activity || {};
    const demoUrl = String(base?.demoUrl || "").trim();
    const links = normalizeActivityDemoLinks(base?.demoLinks || []).filter((item) => item.url);
    if (links.length === 0 && demoUrl) {
      links.push({ id: "demo-legacy", name: "試聽範例", url: demoUrl, cast: "", description: "" });
    }
    return links;
  }, [activity]);

  return (
    <div className={`relative w-full h-[100dvh] overflow-hidden flex flex-col bg-background ${hideWhitespace ? 'hide-whitespace' : ''} ${protectionClass}`}>
      
      {/* 1. Fixed Background Layer */}
      <div 
        className="absolute inset-0 z-0 opacity-30 dark:opacity-20 pointer-events-none"
        style={backgroundStyle}
      >
        {/* Blur Overlay */}
        <div className="absolute inset-0 backdrop-blur-[60px] bg-background/50" />
        {/* Gradient Fade to Bottom (to merge with script paper) */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* 2. Simplified Header (Fixed) */}
      {/* 2. Simplified Header (Fixed) */}
      <SimplifiedReaderHeader 
        title={title}
        showTitle={false} // Maybe show on scroll? Future enhancement.
        onBack={onBack}
        onShare={onShare}
        onOpenGuide={handleStartGuide}
        downloadOptions={downloadOptions}
        sceneList={viewerProps?.sceneList || viewerProps?.scenes || []}
        currentSceneId={viewerProps?.activeSceneId}
        onSelectScene={viewerProps?.scrollToScene}
        tocOpen={tocOpen}
        onTocOpenChange={setTocOpen}
        metaItems={metaItems}
        
        // Marker Props
        markerConfigs={validMarkerConfigs}
        hiddenMarkerIds={hiddenMarkerIds}
        onToggleMarker={onToggleMarker}

        className="bg-transparent hover:bg-background/80 transition-colors"
      />

      {/* 3. Main Scrollable Area (Wrapper for Overlay + Script) */}
      {/* We reuse ScriptSurface but we need to inject the InfoOverlay BEFORE the script content.
          ScriptSurface accepts a `headerNode` prop (we planned to add this).
          OR we can just wrap everything here if ScriptSurface allows custom children?
          Checking ScriptSurface... it renders `Scroll -> Content -> ScriptViewer`.
          It doesn't currently accept a "Header Node" inside the scroll view.
          
          Strategy:
          I will modify ScriptSurface to accept `children` or `headerNode`.
          Let's verify ScriptSurface implementation again.
       */}
        <div data-guide-id="public-guide-script" className="relative z-10 flex-1 min-h-0 h-full">
        <ScriptSurface
           {...scriptSurfaceProps}
           text={rawScript}
           isLoading={isLoading}
           viewerProps={mergedViewerProps}
           // We need to inject the overlay here. 
           // I'll assume I update ScriptSurface to accept a `headerNode` prop that renders inside the scroll container.
           headerNode={
               !isLoading && script && (
                   <>
                   <div data-guide-id="public-guide-info">
                     <PublicScriptInfoOverlay 
                         title={title}
                         synopsis={synopsis}
                         coverUrl={coverUrl}
                         author={author}
                         organization={organization}
                         commercialUse={commercialUse}
                         derivativeUse={derivativeUse}
                         notifyOnModify={notifyOnModify}
                         prefaceItems={prefaceItems}
                         demoLinks={normalizedDemoLinks}
                     />
                   </div>
                   {normalizedActivity && (
                     <section className="mx-auto mb-8 w-full max-w-4xl px-6 text-left">
                       <div className="rounded-xl border border-border/70 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
                         <div className="text-xs font-semibold text-muted-foreground">活動宣傳</div>
                         {normalizedActivity.name && (
                           <h3 className="mt-1 text-lg font-semibold text-foreground">{normalizedActivity.name}</h3>
                         )}
                         {normalizedActivity.bannerUrl && (
                           <div className="mt-3 overflow-hidden rounded-md border border-border/70 bg-muted/20">
                             <img
                               src={normalizedActivity.bannerUrl}
                               alt={normalizedActivity.name || "activity banner"}
                               className="max-h-64 w-full object-cover"
                               loading="lazy"
                             />
                           </div>
                         )}
                         {normalizedActivity.content && (
                           <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                             {normalizedActivity.content}
                           </p>
                         )}
                         {normalizedActivity.workUrl && (
                           <div className="mt-3">
                             <a
                               href={normalizedActivity.workUrl}
                               target="_blank"
                               rel="noreferrer"
                               className="inline-flex items-center rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted"
                             >
                               成品連結
                             </a>
                           </div>
                         )}
                       </div>
                     </section>
                   )}
                   {Array.isArray(relatedSeriesScripts) && relatedSeriesScripts.length > 0 && (
                       <section className="w-full max-w-4xl mx-auto px-6 pb-8">
                           <div className="mb-3 flex items-center justify-between">
                               <h3 className="text-sm font-semibold text-foreground">
                                   {seriesName ? `${seriesName} · ${t("publicReader.relatedSeries", "同系列作品")}` : t("publicReader.relatedSeries", "同系列作品")}
                               </h3>
                               <div className="flex items-center gap-3">
                                   <span className="text-xs text-muted-foreground">
                                       {relatedSeriesScripts.length} {t("publicReader.worksUnit", "部")}
                                   </span>
                                   {seriesName && (
                                       <button
                                           type="button"
                                           className="text-xs text-primary hover:underline"
                                           onClick={() => onOpenSeries?.(seriesName)}
                                       >
                                           {t("publicReader.viewSeriesAll", "查看系列全部")}
                                       </button>
                                   )}
                               </div>
                           </div>
                           <div className="flex gap-3 overflow-x-auto pb-1">
                               {relatedSeriesScripts.map((item) => (
                                   <button
                                       key={item.id}
                                       type="button"
                                       className="group w-[132px] shrink-0 text-left"
                                       onClick={() => onOpenRelatedScript?.(item.id)}
                                   >
                                       <div className="aspect-[2/3] overflow-hidden rounded-md border border-border/60 bg-muted/30">
                                           {item.coverUrl ? (
                                               <img
                                                   src={item.coverUrl}
                                                   alt={item.title}
                                                   className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                                                   loading="lazy"
                                               />
                                           ) : (
                                               <CoverPlaceholder title={item.title} compact />
                                           )}
                                       </div>
                                       <div className="mt-1 space-y-0.5">
                                           <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                               {Number(item.seriesOrder) === 0
                                                   ? t("publicReader.seriesSetting", "設定/背景")
                                                   : Number.isFinite(Number(item.seriesOrder))
                                                       ? `第 ${item.seriesOrder} 作`
                                                       : t("publicReader.extraEpisode", "番外")}
                                           </p>
                                           <p className="line-clamp-2 text-xs font-medium text-foreground group-hover:text-primary">
                                               {item.title}
                                           </p>
                                       </div>
                                   </button>
                               ))}
                           </div>
                       </section>
                   )}
                   </>
               )
           }
           // Make the scroll container transparent so background shows through initially
           outerClassName="h-full min-h-0 relative z-10"
           scrollClassName="h-full min-h-0 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-y-contain scrollbar-hide perspective-1000"
           contentClassName="max-w-4xl mx-auto px-5 sm:px-8 pb-32 pt-16 min-h-[100dvh]" 
        />
        </div>
      <SpotlightGuideOverlay
        open={showGuide}
        zIndex={260}
        spotlightRect={guideSpotlightRect}
        currentStep={guideIndex + 1}
        totalSteps={guideSteps.length}
        title={currentGuide?.title || ""}
        description={currentGuide?.description || ""}
        onSkip={finishGuide}
        skipLabel={t("publicReader.guideSkip")}
        onPrev={handleGuidePrev}
        prevLabel={t("publicReader.guidePrev")}
        prevDisabled={guideIndex === 0}
        onNext={handleGuideNext}
        nextLabel={guideIndex === guideSteps.length - 1 ? t("publicReader.guideDone") : t("publicReader.guideNext")}
      />
    </div>
  );
}
