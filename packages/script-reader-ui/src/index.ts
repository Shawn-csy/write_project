// Canonical reader state hook
export { useReaderState } from "./useReaderState";
export type { ReaderState, ReaderStateOptions, ReaderStorageAdapter, ReaderTocState } from "./useReaderState";

// Storage adapter
export { createLocalStorageReaderStorage } from "./readerStorage";

// Shared UI components
export { MarkerVisibilityMenu } from "./MarkerVisibilityMenu";
export type { MarkerVisibilityMenuProps } from "./MarkerVisibilityMenu";
export { TocMenu } from "./TocMenu";
export type { TocMenuProps } from "./TocMenu";
export { ReaderToolbar } from "./ReaderToolbar";
export type { ReaderToolbarProps } from "./ReaderToolbar";

// Primitive state types (used by TocMenu, TocStateEntry passed to callbacks)
export type { TocStateEntry, TocState } from "./useTocState";

// Compatibility — use useReaderState for new code
export { useReaderMarkerVisibility } from "./useReaderMarkerVisibility";
export type { ReaderMarkerVisibility, MarkerConfigLike } from "./useReaderMarkerVisibility";

// useTocState — use useReaderState for new code
export { useTocState } from "./useTocState";
