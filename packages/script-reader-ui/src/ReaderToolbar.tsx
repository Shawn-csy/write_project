import React from "react";
import { MarkerVisibilityMenu } from "./MarkerVisibilityMenu";
import { TocMenu } from "./TocMenu";
import { ReaderPreferencesPanel } from "./ReaderPreferencesPanel";
import type { ReaderState } from "./useReaderState";
import type { TocStateEntry } from "./useTocState";

export interface ReaderToolbarProps {
  readerState: ReaderState;
  /** Slot rendered at the start (left) of the toolbar. */
  startSlot?: React.ReactNode;
  /** Slot rendered at the end (right) of the toolbar, after the built-in controls. */
  endSlot?: React.ReactNode;
  /** Called when a TOC item is clicked. */
  onTocItemClick?: (entry: TocStateEntry) => void;
  /** Render prop for TOC items. */
  renderTocItem?: (entry: TocStateEntry, close: () => void) => React.ReactNode;
  /** className applied to the inner content row. Use to constrain width (e.g. "max-w-4xl mx-auto"). */
  contentClassName?: string;
}

export function ReaderToolbar({
  readerState,
  startSlot,
  endSlot,
  onTocItemClick,
  renderTocItem,
  contentClassName = "",
}: ReaderToolbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className={`relative flex h-12 items-center gap-2 px-4 ${contentClassName}`.trimEnd()}>
        {startSlot && <div className="shrink-0">{startSlot}</div>}
        <div className="ml-auto flex items-center gap-2">
          <MarkerVisibilityMenu
            markerConfigs={readerState.markerConfigs}
            visibility={readerState.markerVisibility}
          />
          <TocMenu
            toc={readerState.toc}
            onItemClick={onTocItemClick}
            renderItem={renderTocItem}
          />
          <ReaderPreferencesPanel preferences={readerState.preferences} />
          {endSlot}
        </div>
      </div>
    </header>
  );
}
