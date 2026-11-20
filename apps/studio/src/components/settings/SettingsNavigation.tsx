import React from "react";
import { List, Trigger } from "@radix-ui/react-tabs";
import { useI18n } from "../../contexts/I18nContext";
import { useAuth } from "../../contexts/AuthContext";

export type SettingsTabKey = "display" | "media" | "markers" | "profile";

/** Shared settings navigation for the settings panel and full-page marker editor. */
export function SettingsNavigation(): React.JSX.Element {
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const allTabs: Array<{ key: SettingsTabKey; label: string; authRequired?: boolean }> = [
    { key: "display", label: t("settings.display") },
    { key: "media", label: t("settings.media"), authRequired: true },
    { key: "markers", label: t("settings.markers"), authRequired: true },
    { key: "profile", label: t("settings.profile"), authRequired: true },
  ];
  const tabs = allTabs.filter((tab) => !tab.authRequired || currentUser);

  return (
    <List aria-label={t("settings.title")} className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-3 py-2 scrollbar-hide">
      {tabs.map(tab => (
        <Trigger
          key={tab.key}
          value={tab.key}
          className="h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:font-semibold data-[state=active]:text-background"
        >
          {tab.label}
        </Trigger>
      ))}
    </List>
  );
}
