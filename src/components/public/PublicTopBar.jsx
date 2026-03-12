import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft, Settings2, X } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useI18n } from "../../contexts/I18nContext";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { TOPBAR_INNER_CLASS, TOPBAR_OUTER_CLASS } from "../layout/topbarLayout";
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
}) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const resolvedTitle = title || t("publicTopbar.title");
  const [appearanceOpen, setAppearanceOpen] = React.useState(false);

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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAppearanceOpen(true)}
            title={t("publicTopbar.appearanceSettings", "外觀與閱讀")}
            aria-label={t("publicTopbar.appearanceSettings", "外觀與閱讀")}
          >
            <Settings2 className="w-4 h-4" />
          </Button>
          <LanguageSwitcher
            compact
            buttonClassName="bg-background/70 backdrop-blur"
            ariaLabel={t("settings.language")}
          />
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
