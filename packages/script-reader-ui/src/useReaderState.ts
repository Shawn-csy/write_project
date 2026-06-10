import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MarkerConfigLike, ReaderMarkerVisibility } from "./useReaderMarkerVisibility";
import type { TocStateEntry } from "./useTocState";

export interface ReaderStorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface ReaderTocState {
  entries: TocStateEntry[];
  isOpen: boolean;
  activeId: string | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setActiveId: (id: string | null) => void;
}

export interface ReaderStateOptions {
  markerConfigs: MarkerConfigLike[];
  toc: TocStateEntry[];
  /** Storage adapter for persisting reader preferences. Omit or pass null to disable persistence. */
  storage?: ReaderStorageAdapter | null;
  /** Storage key prefix. Default: "reader". */
  storageKey?: string;
}

export interface ReaderState {
  markerConfigs: MarkerConfigLike[];
  markerVisibility: ReaderMarkerVisibility;
  toc: ReaderTocState;
}

const HIDDEN_IDS_KEY = "hiddenMarkerIds";

function safeGet(storage: ReaderStorageAdapter, key: string): string | null {
  try { return storage.get(key); } catch { return null; }
}

function safeSet(storage: ReaderStorageAdapter, key: string, value: string): void {
  try { storage.set(key, value); } catch { /* storage unavailable */ }
}

function safeRemove(storage: ReaderStorageAdapter, key: string): void {
  try { storage.remove(key); } catch { /* storage unavailable */ }
}

function parseStoredHiddenIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function useReaderState({
  markerConfigs,
  toc: tocEntries,
  storage,
  storageKey = "reader",
}: ReaderStateOptions): ReaderState {
  const hiddenKey = `${storageKey}:${HIDDEN_IDS_KEY}`;

  // Always start from [] on initial render so server HTML and client first render match.
  // Storage restore happens after mount in the effect below.
  const [hiddenMarkerIds, setHiddenMarkerIds] = useState<string[]>([]);
  const [storageHydrated, setStorageHydrated] = useState(storage == null);

  const storageRef = useRef(storage);
  storageRef.current = storage;

  const hydrationRef = useRef<{
    hiddenKey: string;
    hasStorage: boolean;
    pendingStoredIds: string[] | null;
    hydrated: boolean;
  }>({
    hiddenKey,
    hasStorage: storage != null,
    pendingStoredIds: null,
    hydrated: storage == null,
  });

  // After mount: restore hidden ids from storage. Runs client-side only.
  // If markerConfigs arrive after mount, wait before hydrating so stored ids are
  // not discarded or overwritten by the initial empty config set.
  useEffect(() => {
    const ref = hydrationRef.current;
    const hasStorage = storage != null;
    if (ref.hiddenKey !== hiddenKey || ref.hasStorage !== hasStorage) {
      ref.hiddenKey = hiddenKey;
      ref.hasStorage = hasStorage;
      ref.pendingStoredIds = null;
      ref.hydrated = storage == null;
      setStorageHydrated(storage == null);
      setHiddenMarkerIds([]);
    }

    if (ref.hydrated) return;

    const s = storage;
    if (!s) {
      ref.hydrated = true;
      setStorageHydrated(true);
      return;
    }

    if (ref.pendingStoredIds === null) {
      ref.pendingStoredIds = parseStoredHiddenIds(safeGet(s, hiddenKey));
    }

    if (ref.pendingStoredIds.length > 0 && markerConfigs.length === 0) {
      return;
    }

    const validIds = new Set(markerConfigs.map((c) => c.id));
    const restored = ref.pendingStoredIds.filter((id) => validIds.has(id));
    ref.hydrated = true;
    setHiddenMarkerIds((prev) => {
      if (prev.length === restored.length && prev.every((id, index) => id === restored[index])) {
        return prev;
      }
      return restored;
    });
    setStorageHydrated(true);
  }, [hiddenKey, markerConfigs, storage]);

  // Persist whenever hiddenMarkerIds changes, but only after storage hydration
  // completes (avoid writing empty [] back over stored data before restore).
  useEffect(() => {
    if (!storageHydrated) return;
    const s = storageRef.current;
    if (!s) return;
    if (hiddenMarkerIds.length === 0) {
      safeRemove(s, hiddenKey);
    } else {
      safeSet(s, hiddenKey, JSON.stringify(hiddenMarkerIds));
    }
  }, [hiddenMarkerIds, hiddenKey, storageHydrated]);

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

  const markerVisibility: ReaderMarkerVisibility = useMemo(
    () => ({
      hiddenMarkerIds,
      visibleCount,
      totalCount: markerConfigs.length,
      toggleMarker,
      showAll,
      hideAll,
      isHidden,
    }),
    [hiddenMarkerIds, visibleCount, markerConfigs.length, toggleMarker, showAll, hideAll, isHidden]
  );

  // TOC state
  const [tocIsOpen, setTocIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const tocOpen = useCallback(() => setTocIsOpen(true), []);
  const tocClose = useCallback(() => setTocIsOpen(false), []);
  const tocToggle = useCallback(() => setTocIsOpen((v) => !v), []);
  const tocSetActiveId = useCallback((id: string | null) => setActiveId(id), []);

  // Prune activeId when tocEntries changes and the active entry no longer exists.
  useEffect(() => {
    if (activeId === null) return;
    const validIds = new Set(tocEntries.map((e) => e.id));
    if (!validIds.has(activeId)) {
      setActiveId(null);
    }
  }, [tocEntries, activeId]);

  const toc: ReaderTocState = useMemo(
    () => ({
      entries: tocEntries,
      isOpen: tocIsOpen,
      activeId,
      open: tocOpen,
      close: tocClose,
      toggle: tocToggle,
      setActiveId: tocSetActiveId,
    }),
    [tocEntries, tocIsOpen, activeId, tocOpen, tocClose, tocToggle, tocSetActiveId]
  );

  return { markerConfigs, markerVisibility, toc };
}
