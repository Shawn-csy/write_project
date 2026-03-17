import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft, Settings2, X } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useI18n } from "../../contexts/I18nContext";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { TOPBAR_INNER_CLASS, TOPBAR_OUTER_CLASS } from "../layout/topbarLayout";
import {
  STUDIO_TOPBAR_ACTIONS_CLASS,
  STUDIO_TOPBAR_ICON_BUTTON_CLASS,
  STUDIO_TOPBAR_INNER_CLASS,
  STUDIO_TOPBAR_ROW_CLASS,
  STUDIO_TOPBAR_SURFACE_CLASS,
  STUDIO_TOPBAR_TITLE_WRAP_CLASS,
} from "../layout/studioTopbarTokens";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../ui/dialog";
import { AppearanceSettings } from "../settings/AppearanceSettings";

export function PublicTopBar({
  title,
  showBack = false,
  onBack,
  tabs = [],
  activeTab,
  onTabChange,
  actions,
  fullBleed = false,
}) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const resolvedTitle = title || t("publicTopbar.title");
  const [appearanceOpen, setAppearanceOpen] = React.useState(false);

  return (
    <header className={`${TOPBAR_OUTER_CLASS} ${STUDIO_TOPBAR_SURFACE_CLASS}`}>
      <div
        className={`${
          fullBleed ? "w-full px-3 sm:px-4 lg:px-5" : `${TOPBAR_INNER_CLASS} ${STUDIO_TOPBAR_INNER_CLASS}`
        }`}
      >
        <div className={STUDIO_TOPBAR_ROW_CLASS}>
          <div className={`flex min-w-0 items-center gap-4 ${STUDIO_TOPBAR_TITLE_WRAP_CLASS}`}>
            <div className="flex items-center gap-2 min-w-0">
              {showBack && (
                <Button variant="ghost" size="icon" onClick={onBack || (() => navigate(-1))} aria-label={t("publicTopbar.back")}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div
                className="flex min-w-0 items-center gap-2 font-serif font-semibold text-base text-primary cursor-pointer sm:text-lg"
                onClick={() => navigate("/")}
              >
                <BookOpen className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
                <span className="max-w-[42vw] truncate sm:max-w-none">{resolvedTitle}</span>
              </div>
            </div>

            {tabs.length > 0 && (
              <div className="hidden md:flex items-center gap-1 rounded-lg border border-border/60 bg-[hsl(var(--surface-2))]/55 p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={cn(
                      "h-9 rounded-md border px-3 text-sm transition-colors",
                      activeTab === tab.key
                        ? "border-primary/35 bg-primary/10 text-primary shadow-sm"
                        : "border-transparent bg-background/65 text-muted-foreground hover:border-border/70 hover:bg-muted/50 hover:text-foreground"
                    )}
                    onClick={() => onTabChange?.(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={STUDIO_TOPBAR_ACTIONS_CLASS}>
            <Button
              variant="outline"
              size="icon"
              className={STUDIO_TOPBAR_ICON_BUTTON_CLASS}
              onClick={() => setAppearanceOpen(true)}
              title={t("publicTopbar.appearanceSettings", "外觀與閱讀")}
              aria-label={t("publicTopbar.appearanceSettings", "外觀與閱讀")}
            >
              <Settings2 className="w-4 h-4" />
            </Button>
            <LanguageSwitcher
              compact
              buttonClassName={STUDIO_TOPBAR_ICON_BUTTON_CLASS}
              ariaLabel={t("settings.language")}
            />
            {actions}
          </div>
        </div>
      </div>

      {tabs.length > 0 && (
        <div className="md:hidden border-t">
          <div className={`${fullBleed ? "w-full px-3 sm:px-4 lg:px-5" : TOPBAR_INNER_CLASS} py-2`}>
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-[hsl(var(--surface-2))]/55 p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={cn(
                  "h-9 rounded-md border px-3 text-sm whitespace-nowrap transition-colors",
                  activeTab === tab.key
                    ? "border-primary/35 bg-primary/10 text-primary shadow-sm"
                    : "border-transparent bg-background/65 text-muted-foreground hover:border-border/70 hover:bg-muted/50 hover:text-foreground"
                )}
                onClick={() => onTabChange?.(tab.key)}
              >
                {tab.label}
              </button>
            ))}
            </div>
          </div>
        </div>
      )}

      <Dialog open={appearanceOpen} onOpenChange={setAppearanceOpen}>
        <DialogContent className="w-[min(96vw,980px)] max-w-none p-0 overflow-hidden [&>button]:hidden">
          <div className="flex h-[min(88vh,760px)] min-h-[420px] flex-col bg-background">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <DialogTitle className="text-sm font-semibold">
                {t("publicTopbar.appearanceSettings", "外觀與閱讀")}
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={t("common.close")}
                  title={t("common.close")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
              <AppearanceSettings />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
