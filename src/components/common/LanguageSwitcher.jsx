import React from "react";
import { useI18n } from "../../contexts/I18nContext";
import { cn } from "../../lib/utils";

export function LanguageSwitcher({
  className,
  selectClassName,
  ariaLabel,
}) {
  const { t, lang, setLang } = useI18n();

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

