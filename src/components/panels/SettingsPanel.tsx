import React, { useRef, useState } from "react";
import { AppearanceSettings } from "../settings/AppearanceSettings";
import { ProfileSettings } from "../settings/ProfileSettings";
import { MarkerSettings } from "../settings/MarkerSettings";
import { MediaLibrarySettings } from "../settings/MediaLibrarySettings";
import SuperAdminPage from "../../pages/SuperAdminPage";
import { cn } from "../../lib/utils";
import { useI18n } from "../../contexts/I18nContext";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { MORANDI_STUDIO_TONE_VARS, SETTINGS_TAB_MORANDI_TONE } from "../../constants/morandiPanelTones";

import { X } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";

interface SettingsPanelProps {
  onClose: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

type SettingsTabKey = "display" | "transfer" | "media" | "markers" | "profile";
type ToneKey = keyof typeof MORANDI_STUDIO_TONE_VARS;
const resolveToneVars = (toneKey: string | undefined) =>
  MORANDI_STUDIO_TONE_VARS[(toneKey as ToneKey) || "works"] || MORANDI_STUDIO_TONE_VARS.works;

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
  const activeToneKey = SETTINGS_TAB_MORANDI_TONE[currentTab];
  const activeToneVars = resolveToneVars(activeToneKey);
  const activeTabLabel = tabs.find((item) => item.key === currentTab)?.label || tabs[0]?.label || "";

  React.useEffect(() => {
    if (!tabs.some((tab) => tab.key === currentTab) && tabs[0]) {
      setTab(tabs[0].key);
    }
  }, [tabs, currentTab, setTab]);

  return (
    <div className="w-full h-full overflow-hidden border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm flex flex-col">
        {/* Main Header with Close Button (Mobile Friendly) */}
        {/* Main Header with Close Button (Mobile Friendly) */}
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

        <div className={cn("flex-1 min-h-0", currentTab === "markers" ? "overflow-hidden" : "p-3 sm:p-4")}>
        <div className={cn("h-full gap-3 sm:gap-4", currentTab !== "markers" && "grid grid-cols-1 md:grid-cols-[240px_1fr]")}>
          {currentTab !== "markers" && <aside
            style={activeToneVars}
            className="rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-helper-bg)]/45 backdrop-blur-sm"
          >
            <div className="px-3 py-3 overflow-x-auto md:overflow-visible scrollbar-hide">
              <div className="flex md:flex-col items-center md:items-stretch gap-1 p-1 bg-muted/50 rounded-lg w-fit md:w-full whitespace-nowrap">
                {tabs.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    style={resolveToneVars(SETTINGS_TAB_MORANDI_TONE[item.key])}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 text-left border",
                      currentTab === item.key
                        ? "border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-trigger-bg)] text-[color:var(--morandi-tone-trigger-fg)] shadow-sm"
                        : "border-transparent text-muted-foreground hover:border-[color:var(--morandi-tone-panel-border)] hover:bg-[color:var(--morandi-tone-helper-bg)] hover:text-[color:var(--morandi-tone-helper-fg)]"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p
                style={activeToneVars}
                className="mt-2 rounded-md border-l-4 border-[color:var(--morandi-tone-helper-border)] bg-[color:var(--morandi-tone-helper-bg)] px-2 py-1.5 text-xs text-[color:var(--morandi-tone-helper-fg)]"
              >
                {activeTabLabel}
              </p>
            </div>
          </aside>}

          <div
            style={activeToneVars}
            className={cn(
              "min-h-0 overflow-y-auto scrollbar-hide",
              currentTab === "markers"
                ? "flex-1 h-full"
                : "flex-1 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-4 sm:p-6 space-y-6"
            )}
            ref={scrollContainerRef}
          >
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
              <div className="h-full flex flex-col min-h-0">
                {/* Slim tab bar — visible only in markers full-width mode */}
                <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/40 bg-background/60 shrink-0">
                  {tabs.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setTab(item.key)}
                      className={cn(
                        "px-3 py-1 rounded text-xs font-medium transition-colors",
                        currentTab === item.key
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MarkerSettings />
                </div>
              </div>
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
          </div>
        </div>
        </div>
    </div>
  );
}

export default SettingsPanel;
