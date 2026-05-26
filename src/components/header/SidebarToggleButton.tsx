import React from "react";
import { PanelLeftOpen } from "lucide-react";
import { useI18n } from "../../contexts/I18nContext";

interface SidebarToggleButtonProps {
  onOpen?: () => void;
  className?: string;
  iconClassName?: string;
  title?: string;
  ariaLabel?: string;
}

export default function SidebarToggleButton({
  onOpen,
  className,
  iconClassName,
  title,
  ariaLabel
}: SidebarToggleButtonProps): React.JSX.Element {
  const { t } = useI18n();
  const resolvedTitle = title || t("common.openList");
  const resolvedAriaLabel = ariaLabel || t("common.openList");

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.currentTarget.blur();
        onOpen?.();
      }}
      aria-label={resolvedAriaLabel}
      title={resolvedTitle}
      className={className}
    >
      <PanelLeftOpen className={iconClassName} />
    </button>
  );
}
