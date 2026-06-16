"use client";

/**
 * GalleryControlsBar — shared usage + viewMode controls.
 * Used by both the desktop inline bar (GalleryClient) and mobile sheet (GalleryMobileSheet).
 * Keeps button labels, values, and layout semantics in one place to prevent drift.
 */

const USAGE_OPTIONS = [
  { value: "all", label: "全部授權" },
  { value: "commercial", label: "可商用" },
] as const;

const VIEW_MODE_OPTIONS = [
  { value: "standard", label: "標準" },
  { value: "compact", label: "密集" },
] as const;

interface GalleryControlsBarProps {
  usage: string;
  onUsageChange: (v: string) => void;
  viewMode: "standard" | "compact";
  onViewModeChange: (v: "standard" | "compact") => void;
  /** "inline" = horizontal row for desktop bar; "stacked" = vertical sections for mobile sheet */
  layout: "inline" | "stacked";
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 rounded-full px-3 text-xs transition-colors font-medium ${
        active
          ? "bg-foreground text-background"
          : "border border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      {children}
    </button>
  );
}

export function GalleryControlsBar({
  usage,
  onUsageChange,
  viewMode,
  onViewModeChange,
  layout,
}: GalleryControlsBarProps) {
  if (layout === "stacked") {
    return (
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-foreground">使用權限</p>
          <div className="flex gap-1.5">
            {USAGE_OPTIONS.map((opt) => (
              <PillButton key={opt.value} active={usage === opt.value} onClick={() => onUsageChange(opt.value)}>
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-foreground">顯示模式</p>
          <div className="flex gap-1.5">
            {VIEW_MODE_OPTIONS.map((opt) => (
              <PillButton key={opt.value} active={viewMode === opt.value} onClick={() => onViewModeChange(opt.value)}>
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // inline layout — usage left, viewMode right
  return (
    <div className="flex w-full items-center">
      <span className="mr-2 text-xs text-muted-foreground">使用權限</span>
      <div className="flex gap-1.5">
        {USAGE_OPTIONS.map((opt) => (
          <PillButton key={opt.value} active={usage === opt.value} onClick={() => onUsageChange(opt.value)}>
            {opt.label}
          </PillButton>
        ))}
      </div>
      <div className="flex-1" />
      <span className="mr-2 text-xs text-muted-foreground">顯示模式</span>
      <div className="flex gap-1.5">
        {VIEW_MODE_OPTIONS.map((opt) => (
          <PillButton key={opt.value} active={viewMode === opt.value} onClick={() => onViewModeChange(opt.value)}>
            {opt.label}
          </PillButton>
        ))}
      </div>
    </div>
  );
}
