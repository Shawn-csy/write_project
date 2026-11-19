import React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../contexts/I18nContext";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { SettingsNavigation, type SettingsTabKey } from "./SettingsNavigation";

interface SettingsWorkspaceLayoutProps {
  children: React.ReactNode;
  activeTab: SettingsTabKey;
  onTabChange: (tab: SettingsTabKey) => void;
  onClose?: () => void;
  headerLeading?: React.ReactNode;
  contentClassName?: string;
  contentRef?: React.Ref<HTMLDivElement>;
}

/** Shared page chrome for all settings sections, including the full-width marker editor. */
export function SettingsWorkspaceLayout({
  children,
  activeTab,
  onTabChange,
  onClose,
  headerLeading,
  contentClassName,
  contentRef,
}: SettingsWorkspaceLayoutProps): React.JSX.Element {
  const { t } = useI18n();

  return (
    <div className="studio-density flex h-full w-full flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:px-6 lg:px-10 lg:py-5">
        {onClose ? (
          <button
            type="button"
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
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
        <SettingsNavigation activeTab={activeTab} onTabChange={onTabChange} />
        <div ref={contentRef} className={cn("min-h-0 min-w-0 flex-1", contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}
