import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MarkerConfigLike, ReaderMarkerVisibility } from "./useReaderMarkerVisibility";
import type { TocStateEntry } from "./useTocState";
import {
  DEFAULT_READER_PREFERENCES,
  READER_FONT_SIZES,
  READER_LINE_HEIGHTS,
  READER_FONT_FAMILIES,
} from "./readerPreferences";
import type {
  ReaderPreferences,
  ReaderPreferencesState,
  ReaderTheme,
  ReaderFontSize,
  ReaderLineHeight,
  ReaderFontFamily,
} from "./readerPreferences";

export type { ReaderPreferences, ReaderPreferencesState, ReaderTheme, ReaderFontSize, ReaderLineHeight, ReaderFontFamily };

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
  /**
   * Storage adapter for marker visibility persistence (per-script).
   * Omit or pass null to disable.
   */
  storage?: ReaderStorageAdapter | null;
  /**
   * Storage adapter for reading preferences (global/user-level).
   * Defaults to `storage` if not provided.
   * Pass a separate global adapter so preferences are not scoped per-script.
   */
  preferencesStorage?: ReaderStorageAdapter | null;
  /** Storage key prefix. Default: "reader". */
  storageKey?: string;
}

export interface ReaderState {
  markerConfigs: MarkerConfigLike[];
  markerVisibility: ReaderMarkerVisibility;
  toc: ReaderTocState;
  preferences: ReaderPreferencesState;
}

const HIDDEN_IDS_KEY = "hiddenMarkerIds";
const PREFS_KEY = "preferences";

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

function parseStoredPreferences(raw: string | null): Partial<ReaderPreferences> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Partial<ReaderPreferences> = {};
    const p = parsed as Record<string, unknown>;
    if (["light", "dark", "system"].includes(p.theme as string)) {
      out.theme = p.theme as ReaderTheme;
    }
    if (READER_FONT_SIZES.includes(p.fontSize as ReaderFontSize)) {
      out.fontSize = p.fontSize as ReaderFontSize;
    }
    if (READER_LINE_HEIGHTS.includes(p.lineHeight as ReaderLineHeight)) {
      out.lineHeight = p.lineHeight as ReaderLineHeight;
    }
    if (READER_FONT_FAMILIES.includes(p.fontFamily as ReaderFontFamily)) {
      out.fontFamily = p.fontFamily as ReaderFontFamily;
    }
    return out;
  } catch {
    return {};
  }
}

export function useReaderState({
  markerConfigs,
  toc: tocEntries,
  storage,
  preferencesStorage: preferencesStorageProp,
  storageKey = "reader",
}: ReaderStateOptions): ReaderState {
  // If no preferencesStorage specified, fall back to storage (backward compat).
  // Callers should pass a separate global adapter to avoid per-script scoping.
  const preferencesStorage = preferencesStorageProp !== undefined ? preferencesStorageProp : storage;
  const hiddenKey = `${storageKey}:${HIDDEN_IDS_KEY}`;
  const prefsKey = `${storageKey}:${PREFS_KEY}`;

  // Always start from [] on initial render so server HTML and client first render match.
  // Storage restore happens after mount in the effect below.
  const [hiddenMarkerIds, setHiddenMarkerIds] = useState<string[]>([]);
  const [storageHydrated, setStorageHydrated] = useState(storage == null);

  // Preferences also start from defaults on initial render; restored after mount.
  const [preferences, setPreferences] = useState<ReaderPreferences>(DEFAULT_READER_PREFERENCES);
  const [prefsMounted, setPrefsMounted] = useState(false);

  const storageRef = useRef(storage);
  storageRef.current = storage;

  const preferencesStorageRef = useRef(preferencesStorage);
  preferencesStorageRef.current = preferencesStorage;

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

  // After mount: restore preferences from storage. No dependency on markerConfigs.
  useEffect(() => {
    setPrefsMounted(true);
    const s = preferencesStorageRef.current;
    if (!s) return;
    const stored = parseStoredPreferences(safeGet(s, prefsKey));
    if (Object.keys(stored).length > 0) {
      setPreferences((prev) => ({ ...prev, ...stored }));
    }
  // prefsKey intentionally stable across renders unless storageKey changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsKey]);

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

  // Persist preferences after mount (avoid overwriting stored data before restore).
  // Only write when preferences differ from defaults — avoids writing default values
  // on first open before the user has changed anything.
  useEffect(() => {
    if (!prefsMounted) return;
    const s = preferencesStorageRef.current;
    if (!s) return;
    const delta: Partial<ReaderPreferences> = {};
    let hasDelta = false;
    for (const k of Object.keys(DEFAULT_READER_PREFERENCES) as (keyof ReaderPreferences)[]) {
      if (preferences[k] !== DEFAULT_READER_PREFERENCES[k]) {
        (delta as Record<string, unknown>)[k] = preferences[k];
        hasDelta = true;
      }
    }
    if (hasDelta) {
      safeSet(s, prefsKey, JSON.stringify(delta));
    } else {
      safeRemove(s, prefsKey);
    }
  }, [preferences, prefsKey, prefsMounted]);

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

  // Preferences setters
  const setTheme = useCallback((theme: ReaderTheme) => setPreferences((p) => ({ ...p, theme })), []);
  const setFontSize = useCallback((fontSize: ReaderFontSize) => setPreferences((p) => ({ ...p, fontSize })), []);
  const setLineHeight = useCallback((lineHeight: ReaderLineHeight) => setPreferences((p) => ({ ...p, lineHeight })), []);
  const setFontFamily = useCallback((fontFamily: ReaderFontFamily) => setPreferences((p) => ({ ...p, fontFamily })), []);
  const resetPreferences = useCallback(() => setPreferences(DEFAULT_READER_PREFERENCES), []);

  const preferencesState: ReaderPreferencesState = useMemo(
    () => ({
      preferences,
      setTheme,
      setFontSize,
      setLineHeight,
      setFontFamily,
      reset: resetPreferences,
    }),
    [preferences, setTheme, setFontSize, setLineHeight, setFontFamily, resetPreferences]
  );

  return { markerConfigs, markerVisibility, toc, preferences: preferencesState };
}
