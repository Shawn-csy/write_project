import React from "react";
import type { TocStateEntry, TocState } from "./useTocState";

export interface TocMenuProps {
  toc: TocStateEntry[];
  tocState: TocState;
  /** Label for the trigger button. Default: "目錄" */
  triggerLabel?: string;
  /** Called when a TOC item is clicked (after closing the panel). */
  onItemClick?: (entry: TocStateEntry) => void;
  /** Render prop for TOC item links. Receives entry; must render an anchor or button. */
  renderItem?: (entry: TocStateEntry, close: () => void) => React.ReactNode;
}

function DefaultItem({
  entry,
  close,
}: {
  entry: TocStateEntry;
  close: () => void;
}) {
  return (
    <a
      href={`#${entry.id}`}
      onClick={close}
      className="block text-sm py-1 text-muted-foreground hover:text-foreground transition-colors truncate"
    >
      {entry.label}
    </a>
  );
}

export function TocMenu({
  toc,
  tocState,
  triggerLabel = "目錄",
  onItemClick,
  renderItem,
}: TocMenuProps) {
  if (toc.length === 0) return null;

  const handleItemClick = (entry: TocStateEntry) => {
    tocState.close();
    onItemClick?.(entry);
  };

  return (
    <>
      <button
        type="button"
        onClick={tocState.toggle}
        aria-expanded={tocState.isOpen}
        className="text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
      >
        {triggerLabel} ({toc.length})
      </button>

      {tocState.isOpen && (
        <div
          role="navigation"
          aria-label={triggerLabel}
          className="absolute left-0 right-0 top-full border-t border-border/60 bg-background max-h-48 overflow-y-auto z-40"
        >
          <div className="px-4 py-2">
            {toc.map((entry) =>
              renderItem ? (
                <React.Fragment key={entry.id}>
                  {renderItem(entry, () => handleItemClick(entry))}
                </React.Fragment>
              ) : (
                <DefaultItem
                  key={entry.id}
                  entry={entry}
                  close={() => handleItemClick(entry)}
                />
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}
