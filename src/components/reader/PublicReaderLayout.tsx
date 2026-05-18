import React, { useMemo } from "react";
import { SimplifiedReaderHeader } from "./SimplifiedReaderHeader";
import { PublicScriptInfoOverlay } from "./PublicScriptInfoOverlay";
import { PublicMarkerLegend } from "./PublicMarkerLegend";
import { ActivitySection } from "./ActivitySection";
import { RelatedSeriesSection } from "./RelatedSeriesSection";
import ScriptSurface from "../editor/ScriptSurface";
import { SpotlightGuideOverlay } from "../common/SpotlightGuideOverlay";
import { usePublicReaderLayoutState } from "../../hooks/public/usePublicReaderLayoutState";
import type { PublicReaderScriptData, ViewerProps } from "../../hooks/public/usePublicReaderLayoutState";

interface RelatedSeriesScriptItem {
  id: string;
  title: string;
  coverUrl?: string | null;
  seriesOrder?: string | number | null;
}

interface PublicReaderLayoutProps {
  script?: PublicReaderScriptData | null;
  isLoading?: boolean;
  relatedSeriesScripts?: RelatedSeriesScriptItem[];
  onOpenRelatedScript?: (scriptId: string) => void;
  onOpenSeries?: (seriesName: string) => void;
  onBack?: () => void;
  onShare?: () => void;
  viewerProps?: ViewerProps;
  scriptSurfaceProps?: { scrollRef?: React.RefObject<HTMLElement | null>; [key: string]: unknown };
  renderedHtml?: string;
  validMarkerConfigs?: Array<{ id: string; label?: string }>;
  hiddenMarkerIds?: string[];
  onToggleMarker?: (markerId: string) => void;
}

export function PublicReaderLayout({
  script,
  isLoading,
  relatedSeriesScripts = [],
  onOpenRelatedScript,
  onOpenSeries,
  onBack,
  onShare,
  viewerProps,
  scriptSurfaceProps,
  renderedHtml = "",
  validMarkerConfigs = [],
  hiddenMarkerIds = [],
  onToggleMarker,
}: PublicReaderLayoutProps) {
  const s = usePublicReaderLayoutState({
    script,
    isLoading,
    viewerProps,
    scriptSurfaceProps,
    renderedHtml,
    exportMarkerConfigs: validMarkerConfigs as Array<Record<string, unknown>>,
  });

  const contactRender = useMemo(() => s.contactLines.length > 0 ? (
    <div className="space-y-1.5">
      {s.contactLines.map((line, idx) => (
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
  ) : null, [s.contactLines]);

  const metaItems = useMemo(() => [
    { label: s.t("publicScriptInfo.contact"), render: contactRender },
    script?.showMarkerLegend && validMarkerConfigs?.length > 0
      ? {
          label: s.t("publicReader.markerLegend"),
          render: (
            <PublicMarkerLegend
              markerConfigs={validMarkerConfigs}
              className="grid-cols-1 gap-y-1 md:grid-cols-1"
            />
          ),
        }
      : null,
  ].filter((item) => Boolean(item && item.render)),
  [s.t, contactRender, script?.showMarkerLegend, validMarkerConfigs]);

  const safeScrollRef = scriptSurfaceProps?.scrollRef as React.RefObject<HTMLDivElement | null> | undefined;

  return (
    <div className={`relative w-full h-[100dvh] overflow-hidden flex flex-col bg-background ${s.hideWhitespace ? 'hide-whitespace' : ''} ${s.protectionClass}`}>
      {/* Background Layer */}
      <div
        className="absolute inset-0 z-0 opacity-30 dark:opacity-20 pointer-events-none"
        style={s.backgroundStyle}
      >
        <div className="absolute inset-0 backdrop-blur-[60px] bg-background/50" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Header */}
      <SimplifiedReaderHeader
        title={s.title}
        showTitle={s.titleVisible}
        onBack={onBack || (() => {})}
        onShare={onShare}
        onOpenGuide={s.handleStartGuide}
        downloadOptions={s.downloadOptions}
        sceneList={viewerProps?.sceneList || viewerProps?.scenes || []}
        currentSceneId={viewerProps?.activeSceneId}
        onSelectScene={typeof viewerProps?.scrollToScene === "function" ? viewerProps.scrollToScene : () => {}}
        tocOpen={s.tocOpen}
        onTocOpenChange={s.setTocOpen}
        metaItems={metaItems.filter(Boolean) as Array<{ label: string; value?: React.ReactNode; render?: React.ReactNode }>}
        markerConfigs={validMarkerConfigs}
        hiddenMarkerIds={hiddenMarkerIds}
        onToggleMarker={onToggleMarker || (() => {})}
        className="bg-transparent hover:bg-background/80 transition-colors"
      />

      {/* Main Scrollable Area */}
      <div data-guide-id="public-guide-script" className="relative z-10 flex-1 min-h-0 h-full">
        <ScriptSurface
          {...scriptSurfaceProps}
          scrollRef={safeScrollRef}
          text={s.rawScript || ""}
          isLoading={isLoading}
          viewerProps={s.mergedViewerProps}
          headerNode={
            !isLoading && script && (
              <>
                <div data-guide-id="public-guide-info">
                  <PublicScriptInfoOverlay
                    title={s.title}
                    synopsis={s.synopsis}
                    coverUrl={s.coverUrl || ""}
                    author={s.author}
                    organization={s.organization}
                    commercialUse={s.commercialUse}
                    derivativeUse={s.derivativeUse}
                    notifyOnModify={s.notifyOnModify}
                    licenseSpecialTerms={s.normalizedLicenseSpecialTerms}
                    prefaceItems={(s.prefaceItems || []) as Array<{ id?: string; title?: string; value?: string }>}
                    demoLinks={s.normalizedDemoLinks}
                  />
                </div>
                {s.normalizedActivity && (
                  <ActivitySection
                    name={s.normalizedActivity.name}
                    bannerUrl={s.normalizedActivity.bannerUrl}
                    content={s.normalizedActivity.content}
                    workUrl={s.normalizedActivity.workUrl}
                  />
                )}
                {Array.isArray(relatedSeriesScripts) && relatedSeriesScripts.length > 0 && (
                  <RelatedSeriesSection
                    seriesName={s.seriesName}
                    relatedSeriesScripts={relatedSeriesScripts}
                    onOpenRelatedScript={onOpenRelatedScript}
                    onOpenSeries={onOpenSeries}
                  />
                )}
              </>
            )
          }
          outerClassName="h-full min-h-0 relative z-10"
          scrollClassName="h-full min-h-0 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-y-contain scrollbar-hide perspective-1000"
          contentClassName="max-w-4xl mx-auto px-5 sm:px-8 pb-32 pt-16 min-h-[100dvh]"
        />
      </div>

      <SpotlightGuideOverlay
        open={s.showGuide}
        zIndex={260}
        spotlightRect={s.guideSpotlightRect}
        currentStep={s.guideIndex + 1}
        totalSteps={s.guideSteps.length}
        title={s.currentGuide?.title || ""}
        description={s.currentGuide?.description || ""}
        onSkip={s.finishGuide}
        skipLabel={s.t("publicReader.guideSkip")}
        onPrev={s.handleGuidePrev}
        prevLabel={s.t("publicReader.guidePrev")}
        prevDisabled={s.guideIndex === 0}
        onNext={s.handleGuideNext}
        nextLabel={s.guideIndex === s.guideSteps.length - 1 ? s.t("publicReader.guideDone") : s.t("publicReader.guideNext")}
      />
    </div>
  );
}
