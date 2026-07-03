import React from "react";
import { cn } from "../../lib/utils";

interface SettingRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Stack the control below the label instead of placing it to the right. For wide controls (sliders, grids). */
  stacked?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Settings row: label + description on the left, control on the right,
 * separated by dividers when placed inside a `divide-y` container.
 */
export function SettingRow({ label, description, stacked, className, children }: SettingRowProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "py-3.5 first:pt-0 last:pb-0",
        stacked
          ? "space-y-2.5"
          : "flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        className
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <div className={cn(!stacked && "sm:shrink-0")}>{children}</div>
    </div>
  );
}
