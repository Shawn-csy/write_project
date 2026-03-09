import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft, Sun, Moon } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useSettings } from "../../contexts/SettingsContext";
import { useI18n } from "../../contexts/I18nContext";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { TOPBAR_INNER_CLASS, TOPBAR_OUTER_CLASS } from "../layout/topbarLayout";

export function PublicTopBar({
  title,
  showBack = false,
  onBack,
  tabs = [],
  activeTab,
  onTabChange,
  actions,
}) {
  const navigate = useNavigate();
  const { isDark, setTheme } = useSettings();
  const { t } = useI18n();
  const resolvedTitle = title || t("publicTopbar.title");

  return (
    <header className={TOPBAR_OUTER_CLASS}>
      <div className={`${TOPBAR_INNER_CLASS} h-16 flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <Button variant="ghost" size="icon" onClick={onBack || (() => navigate(-1))} aria-label={t("publicTopbar.back")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div
            className="flex items-center gap-2 font-serif font-semibold text-lg text-primary cursor-pointer"
            onClick={() => navigate("/")}
          >
            <BookOpen className="w-6 h-6" />
            <span className="truncate">{resolvedTitle}</span>
          </div>
        </div>

        {tabs.length > 0 && (
          <div className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full transition-colors",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                onClick={() => onTabChange?.(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <LanguageSwitcher
            compact
            buttonClassName="bg-background/70 backdrop-blur"
            ariaLabel={t("settings.language")}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title={isDark ? t("publicTopbar.switchLight") : t("publicTopbar.switchDark")}
            aria-label={isDark ? t("publicTopbar.switchLight") : t("publicTopbar.switchDark")}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          {actions}
        </div>
      </div>

      {tabs.length > 0 && (
        <div className="md:hidden border-t">
          <div className={`${TOPBAR_INNER_CLASS} py-2 flex items-center gap-2 overflow-x-auto`}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                onClick={() => onTabChange?.(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
