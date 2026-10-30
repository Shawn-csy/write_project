import React from "react";
import { Routes, useNavigate } from "react-router-dom";
import { renderWorkspaceRoutes } from "./routes/WorkspaceRoutes";
import type { ScriptManager } from "./hooks/useScriptManager.types";
import type { Nav, NavProps } from "./types/nav";
import type { DownloadOption } from "./types/routes";


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
  const navigate = useNavigate();

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
        handleReaderEdit: () => {
          if (activeCloudScript) navigate(`/edit/${activeCloudScript.id}?mode=edit`);
        },
        navigate,
      })}
    </Routes>
  );
}

export default AppRouter;
