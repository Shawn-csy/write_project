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
  /** Content column max-width class. Default: "max-w-4xl" */
  contentMaxWidth?: string;
}

export function PublicReaderShell({
  coverUrl,
  toolbar,
  header,
  children,
  footer,
  className = "",
  contentMaxWidth = "max-w-4xl",
}: PublicReaderShellProps): React.JSX.Element {
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
