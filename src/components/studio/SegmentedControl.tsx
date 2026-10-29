import React from "react";
import { cn } from "../../lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number | null;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: ReadonlyArray<SegmentedOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("inline-flex max-w-full flex-wrap gap-0.5 rounded-lg bg-muted p-[3px]", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-[13px] transition-colors sm:h-[30px]",
              active
                ? "bg-background font-semibold text-foreground shadow-[0_1px_2px_rgba(20,26,38,.08),0_0_0_1px_hsl(var(--border))]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span className="text-xs tabular-nums text-muted-foreground">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
