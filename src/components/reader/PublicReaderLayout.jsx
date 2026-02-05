import React, { useEffect } from "react";
import { SimplifiedReaderHeader } from "./SimplifiedReaderHeader";
import { PublicScriptInfoOverlay } from "./PublicScriptInfoOverlay";
import { PublicMarkerLegend } from "./PublicMarkerLegend";
import ScriptSurface from "../editor/ScriptSurface";
import { extractMetadata } from "../../lib/metadataParser";
import { useSettings } from "../../contexts/SettingsContext";

export function PublicReaderLayout({
  script, // { content, title, ...meta }
  isLoading,
  onBack,
  onShare,
  viewerProps,      // passed to ScriptSurface
  scriptSurfaceProps, // passed to ScriptSurface (scrollRef, etc)
  // Marker Props
  validMarkerConfigs = [],
  hiddenMarkerIds = [],
  onToggleMarker
}) {
  const { 
    title, 
    author, 
    organization,
    tags, 
    synopsis, 
    description,
    date,
    contact,
    source,
    credit,
    authors,
    customFields,
    coverUrl, 
    content: rawScript,
    disableCopy
  } = script || {};
  const normalizedTags = (tags || [])
    .map((tag) => (typeof tag === "string" ? tag : tag?.name))
    .filter(Boolean);

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

  const meta = React.useMemo(() => rawScript ? extractMetadata(rawScript) : {}, [rawScript]);
  const headerAuthor = meta.author;

  const handleExport = () => {
    window.print();
  };

  const { hideWhitespace } = useSettings();

  // Content protection CSS class
  const protectionClass = disableCopy ? 'select-none' : '';

  return (
    <div className={`relative w-full h-screen overflow-hidden flex flex-col bg-background ${hideWhitespace ? 'hide-whitespace' : ''} ${protectionClass}`}>
      
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
        onExport={handleExport}
        // Removed generic onSettings, now using integrated components
        
        // TOC Props
        sceneList={viewerProps?.sceneList || viewerProps?.scenes || []} // Provide fallback
        currentSceneId={viewerProps?.activeSceneId} // We need to ensure we track this
        onSelectScene={viewerProps?.scrollToScene} // The viewer prop usually expects an ID
        
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
                       author={author}
                       organization={organization}
                       headerAuthor={headerAuthor}
                       tags={normalizedTags}
                       synopsis={synopsis}
                       description={description}
                       date={date}
                       contact={contact}
                       source={source}
                       credit={credit}
                       authors={authors}
                       customFields={customFields}
                       coverUrl={coverUrl}
                       license={script.license}
                       licenseUrl={script.licenseUrl}
                       licenseTerms={script.licenseTerms}
                       copyright={script.copyright}
                   />
                   {script.showMarkerLegend && validMarkerConfigs?.length > 0 && (
                       <div className="w-full max-w-4xl mx-auto px-6 pb-12 flex flex-col items-center space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
                            <div className="w-full max-w-2xl">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 opacity-80 pl-1 text-center">
                                    標記說明 (Legend)
                                </h4>
                                <PublicMarkerLegend 
                                    markerConfigs={validMarkerConfigs} 
                                    className="rounded-xl border border-white/10 bg-background/60 backdrop-blur-md px-4 py-3 shadow-sm"
                                />
                            </div>
                        </div>
                   )}
                   </>
               )
           }
           // Make the scroll container transparent so background shows through initially
           outerClassName="flex-1 min-h-0 relative z-10"
           scrollClassName="h-full overflow-y-auto overflow-x-hidden scrollbar-hide perspective-1000"
           contentClassName="max-w-4xl mx-auto px-5 sm:px-8 pb-32 pt-16 min-h-screen" 
        />
    </div>
  );
}

