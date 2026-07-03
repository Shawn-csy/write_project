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
const SuperAdminPage = lazyWithRefreshRetry(
  () => import("../../pages/SuperAdminPage"),
  "settings-transfer"
);

function TabFallback(): React.JSX.Element {
  const { t } = useI18n();
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      {t("common.loading", "載入中...")}
    </div>
  );
}

interface SettingsPanelProps {
  onClose: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

type SettingsTabKey = "display" | "transfer" | "media" | "markers" | "profile";

function SettingsPanel({ onClose, activeTab, onTabChange }: SettingsPanelProps): React.JSX.Element {
  const { currentUser, profile } = useAuth();
  const { t } = useI18n();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [internalTab, setInternalTab] = useState<SettingsTabKey>("display");

  const currentTab = (activeTab as SettingsTabKey | undefined) || internalTab;
  const setTab: (tab: SettingsTabKey) => void = (nextTab) => {
    if (onTabChange) onTabChange(nextTab);
    else setInternalTab(nextTab);
  };

  const isAdmin = Boolean(profile?.isAdmin);
  const allTabs: Array<{ key: SettingsTabKey; label: string; authRequired?: boolean; adminOnly?: boolean }> = [
    { key: "display", label: t("settings.display") },
    { key: "transfer", label: t("settings.transfer"), authRequired: true, adminOnly: true },
    { key: "media", label: t("settings.media"), authRequired: true },
    { key: "markers", label: t("settings.markers"), authRequired: true },
    { key: "profile", label: t("settings.profile"), authRequired: true },
  ];

  const tabs = allTabs.filter(
    (tab) =>
      (!tab.authRequired || currentUser) &&
      (!tab.adminOnly || isAdmin)
  );

  React.useEffect(() => {
    if (!tabs.some((tab) => tab.key === currentTab) && tabs[0]) {
      setTab(tabs[0].key);
    }
  }, [tabs, currentTab, setTab]);

  return (
    <div className="w-full h-full overflow-hidden border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm flex flex-col">
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-md shrink-0">
            <button
                onClick={onClose}
                className="p-2 -ml-2 rounded-full hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                title={t("common.close")}
            >
                <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold tracking-tight flex-1">{t("settings.title")}</h2>
            <LanguageSwitcher />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col sm:flex-row">
          {/* Mobile: horizontal category bar */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-border/50 bg-background/60 px-3 py-1.5 scrollbar-hide shrink-0 sm:hidden">
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                  currentTab === item.key
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Desktop: left sidebar nav */}
          <nav className="hidden sm:flex w-48 shrink-0 flex-col gap-0.5 border-r border-border/50 bg-background/40 p-3 overflow-y-auto">
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  currentTab === item.key
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
                : "overflow-y-auto p-4 sm:p-6 scrollbar-hide"
            )}
            ref={scrollContainerRef}
          >
            <Suspense fallback={<TabFallback />}>
              {currentTab === "transfer" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground/90">{t("settings.transfer")}</h3>
                  </div>
                  <div className="rounded-lg border bg-background/50">
                    <SuperAdminPage />
                  </div>
                </div>
              )}

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
