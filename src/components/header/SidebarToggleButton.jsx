import React from "react";
import { PanelLeftOpen } from "lucide-react";

export default function SidebarToggleButton({
  onOpen,
  className,
  iconClassName,
  title = "展開列表",
  ariaLabel = "展開列表"
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.currentTarget.blur();
        onOpen?.();
      }}
      aria-label={ariaLabel}
      title={title}
      className={className}
    >
      <PanelLeftOpen className={iconClassName} />
    </button>
  );
}
