import React, { Suspense, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../contexts/I18nContext";
import { lazyWithRefreshRetry } from "../../lib/lazyWithRefreshRetry";
import { SettingsWorkspaceLayout } from "../settings/SettingsWorkspaceLayout";
import type { SettingsTabKey } from "../settings/SettingsNavigation";

const AppearanceSettings = lazyWithRefreshRetry(async () => {
  const mod = await import("../settings/AppearanceSettings");
  return { default: mod.AppearanceSettings };
}, "settings-appearance");
const ProfileSettings = lazyWithRefreshRetry(async () => {
  const mod = await import("../settings/ProfileSettings");
  return { default: mod.ProfileSettings };
}, "settings-profile");
const MarkerSettings = lazyWithRefreshRetry(async () => {
  const mod = await import("../settings/MarkerSettings");
  return { default: mod.MarkerSettings };
}, "settings-markers");
const MediaLibrarySettings = lazyWithRefreshRetry(async () => {
  const mod = await import("../settings/MediaLibrarySettings");
  return { default: mod.MediaLibrarySettings };
}, "settings-media");
function TabFallback(): React.JSX.Element {
  const { t } = useI18n();
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      {t("common.loading", "載入中...")}
    </div>
  );
}

interface SettingsPanelProps {
  /** Omit on the standalone /settings page, which has no close action. */
  onClose?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  /** Leading control for the page header (e.g. the mobile navigation button). */
  headerLeading?: React.ReactNode;
}

function SettingsPanel({ onClose, activeTab, onTabChange, headerLeading }: SettingsPanelProps): React.JSX.Element {
  const { t } = useI18n();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [internalTab, setInternalTab] = useState<SettingsTabKey>("display");

  const currentTab = (activeTab as SettingsTabKey | undefined) || internalTab;
  const setTab: (tab: SettingsTabKey) => void = (nextTab) => {
    if (onTabChange) onTabChange(nextTab);
    else setInternalTab(nextTab);
  };

  const tabs: SettingsTabKey[] = ["display", "media", "markers", "profile"];

  React.useEffect(() => {
    if (!tabs.includes(currentTab) && tabs[0]) {
      setTab(tabs[0]);
    }
  }, [tabs, currentTab, setTab]);

  return (
    <SettingsWorkspaceLayout
      activeTab={currentTab}
      onTabChange={setTab}
      onClose={onClose}
      headerLeading={headerLeading}
      contentRef={scrollContainerRef}
      contentClassName={cn(
        currentTab === "markers"
          ? "h-full"
          : "overflow-y-auto px-4 py-6 sm:px-6 lg:pr-10",
      )}
    >
      <Suspense fallback={<TabFallback />}>
        {currentTab === "display" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AppearanceSettings sectionRef={scrollContainerRef} />
          </div>
        )}

        {currentTab === "markers" && <MarkerSettings />}

        {currentTab === "media" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <MediaLibrarySettings />
          </div>
        )}

        {currentTab === "profile" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ProfileSettings />
          </div>
        )}
      </Suspense>
    </SettingsWorkspaceLayout>
  );
}

export default SettingsPanel;
