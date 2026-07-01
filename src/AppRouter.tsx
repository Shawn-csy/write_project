import React from "react";
import { Routes, useNavigate } from "react-router-dom";
import { useI18n } from "./contexts/I18nContext";
import { useCrossModeReadGuide } from "./hooks/useCrossModeReadGuide";
import { renderWorkspaceRoutes } from "./routes/WorkspaceRoutes";
import type { ScriptManager } from "./hooks/useScriptManager.types";
import type { Nav, NavProps } from "./types/nav";
import type { DownloadOption } from "./types/routes";

import { ReadGuideOverlay } from "./components/reader/ReadGuideOverlay";

interface AppRouterProps {
  scriptManager: ScriptManager;
  nav: Nav;
  navProps: NavProps;
  showStats: boolean;
  setShowStats: (v: boolean) => void;
  scrollProgress: number;
  headerTitle: string;
  canShare: boolean;
  isPublicReader: boolean;
  showReaderHeader: boolean;
  readerDownloadOptions: DownloadOption[];
  handleShareUrl: (e?: Event | React.MouseEvent) => void;
  shareCopied: boolean;
  handleReturnHome: () => void;
  handleCloudTitleUpdate: (title: string) => Promise<void>;
  handleCloudMarkerThemeUpdate: (themeId: string) => Promise<boolean>;
  accentStyle: { label?: string; [key: string]: string | undefined };
  activeCloudScript: ScriptManager["activeCloudScript"];
}

export function AppRouter({
  scriptManager,
  nav,
  navProps,
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
  handleCloudMarkerThemeUpdate,
  accentStyle,
  activeCloudScript,
}: AppRouterProps) {
  const { t } = useI18n() as { t: (key: string, fallback?: string) => string };
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
      {renderWorkspaceRoutes({
        scriptManager,
        nav,
        navProps,
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
        handleCloudMarkerThemeUpdate,
        accentStyle,
        activeCloudScript,
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
