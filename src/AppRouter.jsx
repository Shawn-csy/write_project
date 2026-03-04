import React from "react";
import { Routes } from "react-router-dom";

import { useI18n } from "./contexts/I18nContext";
import { useCrossModeReadGuide } from "./hooks/useCrossModeReadGuide";
import { ReadGuideOverlay } from "./components/reader/ReadGuideOverlay";
import { PublicRoutes } from "./routes/PublicRoutes";
import { WorkspaceRoutes } from "./routes/WorkspaceRoutes";

export function AppRouter({
  scriptManager,
  nav,
  navProps,
  searchTerm,
  setSearchTerm,
  showStats,
  setShowStats,
  scrollProgress,
  headerTitle,
  canShare,
  isPublicReader,
  showReaderHeader,
  readerDownloadOptions,
  handleShareUrl,
  shareCopied,
  handleReturnHome,
  handleCloudTitleUpdate,
  accentStyle,
  fileLabelMode,
  setFileLabelMode,
  activeFile,
  activeCloudScript,
  fileTagsMap,
}) {
  const { t } = useI18n();

  const { cloudScriptMode } = scriptManager;
  const {
    isCloudReadMode,
    guideStep,
    readGuideDialogOpen,
    readGuideTitle,
    readGuideDesc,
    readGuideSpotlightRect,
    startCrossModeGuide,
    exitGuideToRead,
    nextReadGuideStep,
    handleReaderEdit,
  } = useCrossModeReadGuide({ activeCloudScript, cloudScriptMode, isPublicReader, t });

  return (
    <Routes>
      <PublicRoutes scriptManager={scriptManager} navProps={navProps} />
      <WorkspaceRoutes
        scriptManager={scriptManager}
        nav={nav}
        navProps={navProps}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showStats={showStats}
        setShowStats={setShowStats}
        scrollProgress={scrollProgress}
        headerTitle={headerTitle}
        canShare={canShare}
        isPublicReader={isPublicReader}
        showReaderHeader={showReaderHeader}
        readerDownloadOptions={readerDownloadOptions}
        handleShareUrl={handleShareUrl}
        shareCopied={shareCopied}
        handleReturnHome={handleReturnHome}
        handleCloudTitleUpdate={handleCloudTitleUpdate}
        accentStyle={accentStyle}
        fileLabelMode={fileLabelMode}
        setFileLabelMode={setFileLabelMode}
        activeFile={activeFile}
        activeCloudScript={activeCloudScript}
        fileTagsMap={fileTagsMap}
        isCloudReadMode={isCloudReadMode}
        startCrossModeGuide={startCrossModeGuide}
        handleReaderEdit={handleReaderEdit}
        guideOverlay={
          <ReadGuideOverlay
            open={readGuideDialogOpen}
            spotlightRect={readGuideSpotlightRect}
            title={readGuideTitle}
            description={readGuideDesc}
            onExit={exitGuideToRead}
            onNext={nextReadGuideStep}
            exitLabel={t("readerActions.crossGuideExit")}
            nextLabel={guideStep === "readFinish" ? t("readerActions.crossGuideDone") : t("readerActions.crossGuideNext")}
          />
        }
      />
    </Routes>
  );
}

export default AppRouter;
