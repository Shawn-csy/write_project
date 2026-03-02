import React, { useEffect } from "react";
import { FileCode2, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { SimplifiedReaderHeader } from "./SimplifiedReaderHeader";
import { PublicScriptInfoOverlay } from "./PublicScriptInfoOverlay";
import { PublicMarkerLegend } from "./PublicMarkerLegend";
import ScriptSurface from "../editor/ScriptSurface";
import { useSettings } from "../../contexts/SettingsContext";
import {
  exportScriptAsCsv,
  exportScriptAsDocx,
  exportScriptAsFountain,
  exportScriptAsXlsx,
} from "../../lib/scriptExport";
import { useI18n } from "../../contexts/I18nContext";

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
  const { 
    title, 
    author, 
    organization,
    synopsis, 
    contact,
    seriesName,
    prefaceItems,
    coverUrl, 
    content: rawScript,
    disableCopy
  } = script || {};

  const contactValue = typeof contact === "object"
    ? Object.entries(contact || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join(" / ")
    : (contact || "");
  const metaItems = [
    { label: t("publicScriptInfo.contact"), value: contactValue },
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

  const downloadOptions = [
    {
      id: "pdf",
      label: t("publicReader.exportPdf"),
      icon: Printer,
      onClick: () => window.print(),
      disabled: !rawScript && !title,
    },
    {
      id: "fountain",
      label: t("publicReader.downloadFountain"),
      icon: FileCode2,
      onClick: () => exportScriptAsFountain(title || "script", rawScript || ""),
      disabled: !rawScript,
    },
    {
      id: "docx",
      label: t("publicReader.downloadDoc"),
      icon: FileText,
      onClick: () => exportScriptAsDocx(title || "script", { text: rawScript || "", renderedHtml }),
      disabled: !rawScript,
    },
    {
      id: "xlsx",
      label: t("publicReader.downloadXlsx"),
      icon: FileSpreadsheet,
      onClick: () => exportScriptAsXlsx(title || "script", { text: rawScript || "", renderedHtml }),
      disabled: !rawScript,
    },
    {
      id: "csv",
      label: t("publicReader.downloadCsv"),
      icon: FileSpreadsheet,
      onClick: () => exportScriptAsCsv(title || "script", { text: rawScript || "", renderedHtml }),
      disabled: !rawScript,
    },
  ];

  const { hideWhitespace } = useSettings();

  // Content protection CSS class
  const protectionClass = disableCopy ? 'select-none' : '';

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
        downloadOptions={downloadOptions}
        // Removed generic onSettings, now using integrated components
        
        // TOC Props
        sceneList={viewerProps?.sceneList || viewerProps?.scenes || []} // Provide fallback
        currentSceneId={viewerProps?.activeSceneId} // We need to ensure we track this
        onSelectScene={viewerProps?.scrollToScene} // The viewer prop usually expects an ID
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
        <ScriptSurface
           {...scriptSurfaceProps}
           text={rawScript}
           isLoading={isLoading}
           viewerProps={viewerProps}
           // We need to inject the overlay here. 
           // I'll assume I update ScriptSurface to accept a `headerNode` prop that renders inside the scroll container.
           headerNode={
               !isLoading && script && (
                   <>
                   <PublicScriptInfoOverlay 
                       title={title}
                       synopsis={synopsis}
                       coverUrl={coverUrl}
                       author={author}
                       organization={organization}
                       prefaceItems={prefaceItems}
                   />
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
                                               <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
                                                   {item.title}
                                               </div>
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
           outerClassName="flex-1 min-h-0 relative z-10"
           scrollClassName="h-full overflow-y-auto overflow-x-hidden scrollbar-hide perspective-1000"
           contentClassName="max-w-4xl mx-auto px-5 sm:px-8 pb-32 pt-16 min-h-[100dvh]" 
        />
    </div>
  );
}
