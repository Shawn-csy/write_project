import React from "react";
import { useI18n } from "../../contexts/I18nContext";
import { cn } from "../../lib/utils";
import { Globe } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function LanguageSwitcher({
  className,
  selectClassName,
  ariaLabel,
  compact = false,
  buttonClassName,
}) {
  const { t, lang, setLang } = useI18n();

  if (compact) {
    return (
      <div className={cn("inline-flex items-center", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", buttonClassName)}
              aria-label={ariaLabel || t("settings.language")}
              title={ariaLabel || t("settings.language")}
            >
              <Globe className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLang("zh-TW")} disabled={lang === "zh-TW"}>
              {t("settings.languageZh")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang("en")} disabled={lang === "en"}>
              {t("settings.languageEn")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang("ja")} disabled={lang === "ja"}>
              {t("settings.languageJa")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center", className)}>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className={cn(
          "h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground",
          selectClassName
        )}
        aria-label={ariaLabel || t("settings.language")}
      >
        <option value="zh-TW">{t("settings.languageZh")}</option>
        <option value="en">{t("settings.languageEn")}</option>
        <option value="ja">{t("settings.languageJa")}</option>
      </select>
    </div>
  );
}
