import React from "react";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "../../contexts/I18nContext";

interface BackButtonProps {
  onClick?: () => void;
  className?: string;
  iconClassName?: string;
  title?: string;
  ariaLabel?: string;
}

export default function BackButton({
  onClick,
  className,
  iconClassName,
  title,
  ariaLabel
}: BackButtonProps): React.JSX.Element {
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
