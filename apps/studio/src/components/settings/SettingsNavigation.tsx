import React from "react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../contexts/I18nContext";
import { useAuth } from "../../contexts/AuthContext";

export type SettingsTabKey = "display" | "media" | "markers" | "profile";

interface SettingsNavigationProps {
  activeTab: SettingsTabKey;
  onTabChange: (tab: SettingsTabKey) => void;
}

/** Shared settings navigation for the settings panel and full-page marker editor. */
export function SettingsNavigation({ activeTab, onTabChange }: SettingsNavigationProps): React.JSX.Element {
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const allTabs: Array<{ key: SettingsTabKey; label: string; authRequired?: boolean }> = [
    { key: "display", label: t("settings.display") },
    { key: "media", label: t("settings.media"), authRequired: true },
    { key: "markers", label: t("settings.markers"), authRequired: true },
    { key: "profile", label: t("settings.profile"), authRequired: true },
  ];
  const tabs = allTabs.filter((tab) => !tab.authRequired || currentUser);

  const tabClass = (selected: boolean) => cn(
    "whitespace-nowrap text-sm transition-colors",
    selected ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  );

  return (
    <>
      <nav className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-3 py-2 scrollbar-hide sm:hidden" role="tablist" aria-label={t("settings.title")}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              "h-10 whitespace-nowrap rounded-full px-4 text-sm transition-colors",
              activeTab === tab.key
                ? "bg-foreground font-semibold text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <nav className="hidden w-56 shrink-0 flex-col gap-0.5 overflow-y-auto px-4 py-6 sm:flex lg:pl-10" aria-label={t("settings.title")}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            aria-current={activeTab === tab.key ? "page" : undefined}
            className={cn("w-full rounded-md px-3 py-2 text-left", tabClass(activeTab === tab.key))}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </>
  );
}
