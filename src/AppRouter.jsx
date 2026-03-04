import React from "react";
import { Routes, useNavigate } from "react-router-dom";

import { useI18n } from "./contexts/I18nContext";
import { useCrossModeReadGuide } from "./hooks/useCrossModeReadGuide";
import { ReadGuideOverlay } from "./components/reader/ReadGuideOverlay";
import { renderPublicRoutes } from "./routes/PublicRoutes";
import { renderWorkspaceRoutes } from "./routes/WorkspaceRoutes";

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
  const navigate = useNavigate();

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
      {renderPublicRoutes({ scriptManager, navProps })}
      {renderWorkspaceRoutes({
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
        isCloudReadMode,
        startCrossModeGuide,
        handleReaderEdit,
        navigate,
        guideOverlay: (
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
        ),
      })}
    </Routes>
  );
}

export default AppRouter;
