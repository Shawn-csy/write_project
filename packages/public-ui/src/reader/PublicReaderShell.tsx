/**
 * PublicReaderShell
 *
 * Shared reader page shell:
 * - Full-viewport container with cover blur background
 * - Optional sticky toolbar slot (top)
 * - Scrollable content area with header slot (info overlay, series, activity)
 * - Footer slot
 *
 * Both Vite and Next reader pages use this shell.
 * All data-loading, routing, and API calls stay in the host app.
 */
import React from "react";

/** Semantic content width presets. */
export type ContentWidth = "default" | "presentation" | "wide";

const CONTENT_WIDTH_CLASS: Record<ContentWidth, string> = {
  default: "max-w-4xl",
  presentation: "max-w-4xl lg:max-w-6xl 2xl:max-w-7xl",
  wide: "max-w-7xl",
};

export interface PublicReaderShellProps {
  /** Cover image URL for blurred background. Null = gradient fallback. */
  coverUrl?: string | null;
  /** Slot: sticky toolbar rendered above scroll area */
  toolbar?: React.ReactNode;
  /** Slot: rendered at top of scroll area, before script body (info overlay, series lane, etc.) */
  header?: React.ReactNode;
  /** Slot: script content */
  children: React.ReactNode;
  /** Slot: rendered after script body */
  footer?: React.ReactNode;
  /** Extra className on root element */
  className?: string;
  /** Semantic content width. Default: "default" (max-w-4xl reading width). */
  contentWidth?: ContentWidth;
}

export function PublicReaderShell({
  coverUrl,
  toolbar,
  header,
  children,
  footer,
  className = "",
  contentWidth = "default",
}: PublicReaderShellProps): React.JSX.Element {
  const contentMaxWidth = CONTENT_WIDTH_CLASS[contentWidth];
  return (
    <div className={`relative w-full h-[100dvh] overflow-hidden flex flex-col bg-background ${className}`}>
      {/* ── Background blur layer ── */}
      <div className="absolute inset-0 z-0 opacity-30 dark:opacity-20 pointer-events-none" aria-hidden>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-background to-muted" />
        )}
        <div className="absolute inset-0 backdrop-blur-[60px] bg-background/50" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* ── Sticky toolbar ── */}
      {toolbar && (
        <div className="relative z-30 shrink-0">
          {toolbar}
        </div>
      )}

      {/* ── Scrollable content ── */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-y-contain">
        {/* Header slot — info overlay, series lane, activity */}
        {header && (
          <div className="w-full">
            {header}
          </div>
        )}

        {/* Script body */}
        <div className={`${contentMaxWidth} mx-auto px-4 sm:px-6 pb-32 pt-4`}>
          {children}
        </div>

        {/* Footer slot */}
        {footer && (
          <div className={`${contentMaxWidth} mx-auto px-4 sm:px-6 pb-8`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
