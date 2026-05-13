import type React from "react";
import type { NavigateFunction } from "react-router-dom";
import type { ScriptManager, CloudScript } from "../hooks/useScriptManager.types";
import type { Nav, NavProps } from "./nav";

export interface DownloadOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void | Promise<void>;
  disabled: boolean;
}

/** Props shared by AppRouter → WorkspaceRoutes render function */
export interface WorkspaceRoutesProps {
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
  handleShareUrl: (e?: React.MouseEvent) => void;
  shareCopied: boolean;
  handleReturnHome: () => void;
  handleCloudTitleUpdate: (title: string) => Promise<void>;
  handleCloudMarkerThemeUpdate: (themeId: string) => Promise<boolean>;
  accentStyle: string;
  activeCloudScript: CloudScript | null;
  isCloudReadMode: boolean;
  startCrossModeGuide: () => void;
  handleReaderEdit: () => void;
  guideOverlay: React.ReactNode;
  navigate: NavigateFunction;
}

/** Props for renderPublicRoutes */
export interface PublicRoutesProps {
  scriptManager: ScriptManager;
  navProps: NavProps;
}
