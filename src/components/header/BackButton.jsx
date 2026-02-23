import React from "react";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "../../contexts/I18nContext";

export default function BackButton({
  onClick,
  className,
  iconClassName,
  title,
  ariaLabel
}) {
  const { t } = useI18n();
  const resolvedTitle = title || t("common.back");
  const resolvedAriaLabel = ariaLabel || t("common.back");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={resolvedAriaLabel}
      title={resolvedTitle}
      className={className}
    >
      <ArrowLeft className={iconClassName} />
    </button>
  );
}
