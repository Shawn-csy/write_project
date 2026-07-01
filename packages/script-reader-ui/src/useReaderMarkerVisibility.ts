import { useReaderState } from "./useReaderState";

export interface MarkerConfigLike {
  id: string;
  label?: string;
}

export interface ReaderMarkerVisibility {
  hiddenMarkerIds: string[];
  visibleCount: number;
  totalCount: number;
  toggleMarker: (id: string) => void;
  showAll: () => void;
  hideAll: () => void;
  isHidden: (id: string) => boolean;
}

/**
 * Compatibility wrapper — use useReaderState for new code.
 *
 * Provides standalone marker visibility state for contexts that don't need
 * full reader state (e.g. editor preview, isolated tests).
 * No storage persistence.
 */
export function useReaderMarkerVisibility(
  markerConfigs: MarkerConfigLike[]
): ReaderMarkerVisibility {
  return useReaderState({ markerConfigs, toc: [], storage: null }).markerVisibility;
}
