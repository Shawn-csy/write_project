import React from "react";
import { ArrowLeft } from "lucide-react";

export default function BackButton({
  onClick,
  className,
  iconClassName,
  title = "回上一頁",
  ariaLabel = "回上一頁"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className={className}
    >
      <ArrowLeft className={iconClassName} />
    </button>
  );
}
