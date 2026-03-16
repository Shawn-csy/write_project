import React from "react";
import { ArrowLeft, Share2, HelpCircle } from "lucide-react";
import { Button } from "../ui/button";
import { ReaderAppearanceMenu } from "./ReaderAppearanceMenu";
import { ReaderTOC } from "./ReaderTOC";
import { MarkerVisibilitySelect } from "../ui/MarkerVisibilitySelect";
import { DownloadMenu } from "../common/DownloadMenu";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { useI18n } from "../../contexts/I18nContext";

export function SimplifiedReaderHeader({
  onBack,
  title,
  showTitle = false,
  onShare,
  onOpenGuide,
  downloadOptions = [],
  // TOC props
  sceneList,
  currentSceneId,
  onSelectScene,
  tocOpen,
  onTocOpenChange,
  metaItems = [],
  // Marker Props
  markerConfigs = [],
  hiddenMarkerIds = [],
  onToggleMarker,
  className = "",
}) {
  const { t } = useI18n();

  return (
    <header
      data-guide-id="public-guide-header"
      className={`fixed top-0 left-0 right-0 h-14 md:h-16 px-4 z-50 flex items-center justify-between transition-all duration-300 ${className}`}
    >
      {/* Left: Back */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Button
          data-guide-id="public-guide-back"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full bg-background/20 hover:bg-background/40 text-foreground backdrop-blur-md shrink-0"
          title={t("common.back")}
          aria-label={t("common.back")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <ReaderTOC
          sceneList={sceneList}
          currentSceneId={currentSceneId}
          onSelectScene={onSelectScene}
          metaItems={metaItems}
          open={tocOpen}
          onOpenChange={onTocOpenChange}
          triggerGuideId="public-guide-toc-trigger"
          panelGuideId="public-guide-toc-panel"
          hideHeaderTrigger
        />

        <div className={`h-6 w-px bg-white/20 mx-1 transition-opacity duration-300 ${showTitle ? "opacity-100" : "opacity-0"}`} />
        
        <h1 
            className={`font-serif text-lg md:text-xl font-medium truncate transition-opacity duration-300 ${
                showTitle ? "opacity-100" : "opacity-0"
            }`}
        >
            {title}
        </h1>
      </div>

      {/* Right: Actions */}
      <div data-guide-id="public-guide-actions" className="flex items-center gap-2 shrink-0">
        {onOpenGuide ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenGuide}
            className="rounded-full bg-background/20 hover:bg-background/40 text-foreground backdrop-blur-md"
            title={t("publicReader.guide")}
            aria-label={t("publicReader.guide")}
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
        ) : null}
        <LanguageSwitcher
          selectClassName="bg-background/20 hover:bg-background/40 text-foreground backdrop-blur-md border-0"
        />
        
        {/* Marker Visibility Select (Desktop) */}
         <div className="hidden sm:block w-[84px]">
          <MarkerVisibilitySelect
            markerConfigs={markerConfigs}
            hiddenMarkerIds={hiddenMarkerIds}
            onToggleMarker={onToggleMarker}
            compact
            iconOnly
            triggerClassName="h-8 px-2 text-xs w-full rounded-md bg-background/20 hover:bg-background/40 text-foreground backdrop-blur-md border-0 transition-all font-medium"
            contentAlign="end"
            titlePrefix={t("editorHeader.markerPrefix")}
          />
         </div>

        {/* Appearance Settings */}
        <ReaderAppearanceMenu />

        <DownloadMenu
          options={downloadOptions}
          title={t("common.download")}
          triggerClassName="rounded-full bg-background/20 hover:bg-background/40 text-foreground backdrop-blur-md hidden sm:inline-flex"
        />
        
        {onShare && (
             <Button
                variant="ghost"
                size="icon"
                onClick={onShare}
                className="rounded-full bg-background/20 hover:bg-background/40 text-foreground backdrop-blur-md"
                title={t("readerActions.share")}
              >
                <Share2 className="w-4 h-4" />
              </Button>
        )}
      </div>
    </header>
  );
}
