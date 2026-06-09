import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ReaderMarkerVisibility, MarkerConfigLike } from "./useReaderMarkerVisibility";

// Default check indicator — inline SVG avoids a hard dependency on any icon
// library (lucide, heroicons, etc. differ across host apps). Hosts can override
// via the checkIcon prop.
const DEFAULT_CHECK_ICON = (
  <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden>
    <path
      d="M1 3l2 2 4-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface MarkerVisibilityMenuProps {
  markerConfigs: MarkerConfigLike[];
  visibility: ReaderMarkerVisibility;
  /** Render prop for the trigger button. Receives the count label string. */
  trigger?: (label: string) => React.ReactNode;
  /** Icon rendered inside the check indicator when a marker is visible.
   *  Default: inline SVG checkmark. Pass a Lucide <Check> or similar to match host icon system. */
  checkIcon?: React.ReactNode;
  align?: "start" | "center" | "end";
  /** i18n: heading label. Default: "標記顯示" */
  headingLabel?: string;
  /** i18n: aria-label / title. Default: "顯示/隱藏標記" */
  ariaLabel?: string;
}

// forwardRef required: DropdownMenu.Trigger with asChild forwards ref to the child
// for focus restore and keyboard navigation to work correctly.
const DefaultTrigger = React.forwardRef<HTMLButtonElement, { label: string }>(
  function DefaultTrigger({ label, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className="text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        title={label}
        {...props}
      >
        {label}
      </button>
    );
  }
);

export function MarkerVisibilityMenu({
  markerConfigs,
  visibility,
  trigger,
  checkIcon = DEFAULT_CHECK_ICON,
  align = "end",
  headingLabel = "標記顯示",
  ariaLabel = "顯示/隱藏標記",
}: MarkerVisibilityMenuProps) {
  if (markerConfigs.length === 0) return null;

  const countLabel = `標記 (${visibility.visibleCount}/${visibility.totalCount})`;
  const triggerNode = trigger ? trigger(countLabel) : <DefaultTrigger label={countLabel} />;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild aria-label={ariaLabel}>
        {triggerNode}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          className="z-50 min-w-[10rem] rounded-md border border-border bg-background shadow-md py-1"
        >
          <DropdownMenu.Label className="px-2 py-1 text-xs font-medium text-muted-foreground">
            {headingLabel}
          </DropdownMenu.Label>
          {markerConfigs.map((config) => {
            const isVisible = !visibility.isHidden(config.id);
            return (
              <DropdownMenu.Item
                key={config.id}
                onSelect={(e) => {
                  e.preventDefault();
                  visibility.toggleMarker(config.id);
                }}
                className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer select-none outline-none hover:bg-muted focus:bg-muted"
              >
                <span
                  className={`inline-flex w-3.5 h-3.5 shrink-0 items-center justify-center rounded-sm border ${
                    isVisible
                      ? "bg-foreground border-foreground text-background"
                      : "border-input"
                  }`}
                >
                  {isVisible && checkIcon}
                </span>
                <span className={isVisible ? "" : "opacity-50"}>
                  {config.label || config.id}
                </span>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
