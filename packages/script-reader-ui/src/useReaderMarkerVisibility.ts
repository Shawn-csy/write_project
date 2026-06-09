import { useCallback, useEffect, useMemo, useState } from "react";

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

export function useReaderMarkerVisibility(
  markerConfigs: MarkerConfigLike[]
): ReaderMarkerVisibility {
  const [hiddenMarkerIds, setHiddenMarkerIds] = useState<string[]>([]);

  // Prune hidden ids that no longer exist in markerConfigs.
  useEffect(() => {
    const validIds = new Set(markerConfigs.map((c) => c.id));
    setHiddenMarkerIds((prev) => {
      const pruned = prev.filter((id) => validIds.has(id));
      return pruned.length === prev.length ? prev : pruned;
    });
  }, [markerConfigs]);

  const toggleMarker = useCallback((id: string) => {
    setHiddenMarkerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const showAll = useCallback(() => setHiddenMarkerIds([]), []);

  const hideAll = useCallback(
    () => setHiddenMarkerIds(markerConfigs.map((c) => c.id)),
    [markerConfigs]
  );

  const isHidden = useCallback(
    (id: string) => hiddenMarkerIds.includes(id),
    [hiddenMarkerIds]
  );

  const visibleCount = useMemo(
    () => markerConfigs.filter((c) => !hiddenMarkerIds.includes(c.id)).length,
    [markerConfigs, hiddenMarkerIds]
  );

  return {
    hiddenMarkerIds,
    visibleCount,
    totalCount: markerConfigs.length,
    toggleMarker,
    showAll,
    hideAll,
    isHidden,
  };
}
