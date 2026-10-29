import React, { Suspense, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../contexts/I18nContext";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { lazyWithRefreshRetry } from "../../lib/lazyWithRefreshRetry";

import { X } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";

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

type SettingsTabKey = "display" | "media" | "markers" | "profile";

function SettingsPanel({ onClose, activeTab, onTabChange, headerLeading }: SettingsPanelProps): React.JSX.Element {
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [internalTab, setInternalTab] = useState<SettingsTabKey>("display");

  const currentTab = (activeTab as SettingsTabKey | undefined) || internalTab;
  const setTab: (tab: SettingsTabKey) => void = (nextTab) => {
    if (onTabChange) onTabChange(nextTab);
    else setInternalTab(nextTab);
  };

  const allTabs: Array<{ key: SettingsTabKey; label: string; authRequired?: boolean }> = [
    { key: "display", label: t("settings.display") },
    { key: "media", label: t("settings.media"), authRequired: true },
    { key: "markers", label: t("settings.markers"), authRequired: true },
    { key: "profile", label: t("settings.profile"), authRequired: true },
  ];

  const tabs = allTabs.filter(
    (tab) => !tab.authRequired || currentUser
  );

  React.useEffect(() => {
    if (!tabs.some((tab) => tab.key === currentTab) && tabs[0]) {
      setTab(tabs[0].key);
    }
  }, [tabs, currentTab, setTab]);

  return (
    <div className="studio-density flex h-full w-full flex-col overflow-hidden bg-background">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:px-6 lg:px-10 lg:py-5">
            {onClose ? (
              <button
                  onClick={onClose}
                  className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  title={t("common.close")}
                  aria-label={t("common.close")}
              >
                  <X className="h-5 w-5" />
              </button>
            ) : headerLeading}
            <h1 className="flex-1 text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
            <LanguageSwitcher />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
          {/* Mobile: horizontal category bar */}
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-3 py-2 scrollbar-hide sm:hidden" role="tablist" aria-label={t("settings.title")}>
            {tabs.map((item) => (
              <button
                key={item.key}
                role="tab"
                aria-selected={currentTab === item.key}
                onClick={() => setTab(item.key)}
                className={cn(
                  "h-10 whitespace-nowrap rounded-full px-4 text-sm transition-colors",
                  currentTab === item.key
                    ? "bg-foreground font-semibold text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Desktop: left sidebar nav */}
          <nav className="hidden w-56 shrink-0 flex-col gap-0.5 overflow-y-auto px-4 py-6 sm:flex lg:pl-10" aria-label={t("settings.title")}>
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                aria-current={currentTab === item.key ? "page" : undefined}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                  currentTab === item.key
                    ? "bg-muted font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div
            className={cn(
              "flex-1 min-h-0",
              currentTab === "markers"
                ? "h-full"
                : "overflow-y-auto px-4 py-6 sm:px-6 lg:pr-10"
            )}
            ref={scrollContainerRef}
          >
            <Suspense fallback={<TabFallback />}>
              {currentTab === "display" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <AppearanceSettings sectionRef={scrollContainerRef} />
                </div>
              )}

              {currentTab === "markers" && (
                <MarkerSettings />
              )}

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
          </div>
        </div>
    </div>
  );
}

export default SettingsPanel;
