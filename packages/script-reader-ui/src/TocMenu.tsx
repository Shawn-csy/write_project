import React from "react";
import type { TocStateEntry } from "./useTocState";
import type { ReaderTocState } from "./useReaderState";

export interface TocMenuProps {
  toc: ReaderTocState;
  /** Label for the trigger button. Default: "目錄" */
  triggerLabel?: string;
  /** Called when a TOC item is clicked (after closing the panel). */
  onItemClick?: (entry: TocStateEntry) => void;
  /** Render prop for TOC item links. Receives entry and a close callback. */
  renderItem?: (entry: TocStateEntry, close: () => void) => React.ReactNode;
}

function DefaultItem({
  entry,
  active,
  close,
}: {
  entry: TocStateEntry;
  active: boolean;
  close: () => void;
}) {
  return (
    <a
      href={`#${entry.id}`}
      onClick={close}
      className={`block text-sm py-1 transition-colors truncate ${
        active
          ? "text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {entry.label}
    </a>
  );
}

export function TocMenu({
  toc,
  triggerLabel = "目錄",
  onItemClick,
  renderItem,
}: TocMenuProps) {
  if (toc.entries.length === 0) return null;

  const handleItemClick = (entry: TocStateEntry) => {
    toc.close();
    toc.setActiveId(entry.id);
    onItemClick?.(entry);
  };

  return (
    <>
      <button
        type="button"
        onClick={toc.toggle}
        aria-expanded={toc.isOpen}
        className="text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
      >
        {triggerLabel} ({toc.entries.length})
      </button>

      {toc.isOpen && (
        <div
          role="navigation"
          aria-label={triggerLabel}
          className="absolute left-0 right-0 top-full border-t border-border/60 bg-background max-h-48 overflow-y-auto z-40"
        >
          <div className="px-4 py-2">
            {toc.entries.map((entry) =>
              renderItem ? (
                <React.Fragment key={entry.id}>
                  {renderItem(entry, () => handleItemClick(entry))}
                </React.Fragment>
              ) : (
                <DefaultItem
                  key={entry.id}
                  entry={entry}
                  active={toc.activeId === entry.id}
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
