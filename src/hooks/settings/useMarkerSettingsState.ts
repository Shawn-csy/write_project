import { useCallback, useEffect, useMemo, useState } from "react";
import type React from "react";
import { safeParseThemeConfigsText } from "../../lib/markerThemeCodec";
import type { MarkerConfig } from "../../types/script";
import { useDebouncedAutosave } from "../useDebouncedAutosave";

interface MarkerSettingsStateProps {
  markerConfigs: MarkerConfig[];
  setMarkerConfigs: (configs: MarkerConfig[]) => Promise<void> | void;
  viewMode: string;
  readOnly?: boolean;
}

interface UseMarkerSettingsStateResult {
  localConfigs: MarkerConfig[];
  setLocalConfigs: React.Dispatch<React.SetStateAction<MarkerConfig[]>>;
  expandedId: string | null;
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>;
  jsonText: string;
  setJsonText: React.Dispatch<React.SetStateAction<string>>;
  parseError: string;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  existingIds: string[];
  updateMarker: (index: number, field: keyof MarkerConfig | Partial<MarkerConfig>, value?: unknown) => void;
  addMarker: () => void;
  removeMarker: (index: number) => void;
  applyJson: () => void;
  save: () => Promise<void>;
}

export function useMarkerSettingsState({
  markerConfigs,
  setMarkerConfigs,
  viewMode,
  readOnly = false,
}: MarkerSettingsStateProps): UseMarkerSettingsStateResult {
  const [localConfigs, setLocalConfigs] = useState<MarkerConfig[]>(markerConfigs || []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState<string>("");
  const [parseError, setParseError] = useState<string>("");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const existingIds = useMemo(
    () => localConfigs.map((c) => c.id).filter(Boolean) as string[],
    [localConfigs]
  );

  useEffect(() => {
    const incoming = markerConfigs || [];
    setLocalConfigs(incoming);
    setJsonText(JSON.stringify(incoming, null, 2));
    setParseError("");
    setIsDirty(false);
  }, [markerConfigs]);

  useEffect(() => {
    if (viewMode !== "json") {
      setJsonText(JSON.stringify(localConfigs || [], null, 2));
    }
  }, [localConfigs, viewMode]);

  useEffect(() => {
    const current = JSON.stringify(markerConfigs || []);
    const next = JSON.stringify(localConfigs || []);
    if (current !== next) {
      setIsDirty(true);
    } else if (!isSaving) {
      setIsDirty(false);
    }
  }, [markerConfigs, localConfigs, isSaving]);

  useEffect(() => {
    if (viewMode !== "json") return;
    const { value, error } = safeParseThemeConfigsText(jsonText);
    if (error) {
      setParseError(error);
      return;
    }
    setParseError("");
    if (value) {
      setLocalConfigs(value);
    }
  }, [jsonText, viewMode]);

  // No auto-save — save() must be called explicitly
  const save = useCallback(async () => {
    if (readOnly || isSaving) return;
    if (viewMode === "json" && parseError) return;
    const current = JSON.stringify(markerConfigs || []);
    const next = JSON.stringify(localConfigs || []);
    if (current === next) { setIsDirty(false); return; }
    setIsSaving(true);
    try {
      await Promise.resolve(setMarkerConfigs(localConfigs));
      setLastSavedAt(new Date());
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, [readOnly, isSaving, viewMode, parseError, markerConfigs, localConfigs, setMarkerConfigs]);

  useDebouncedAutosave({
    enabled: isDirty && !readOnly && !isSaving && !(viewMode === "json" && Boolean(parseError)),
    delayMs: 900,
    save,
    deps: [isDirty, readOnly, isSaving, viewMode, parseError, save],
  });

  const updateMarker = useCallback((index: number, field: keyof MarkerConfig | Partial<MarkerConfig>, value?: unknown) => {
    if (readOnly) return;
    setLocalConfigs((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;

      if (typeof field === "object" && field !== null) {
        next[index] = { ...next[index], ...field };
      } else if (field === "style") {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const styleRecord: Record<string, string> = {};
          for (const [k, v] of Object.entries(value)) {
            styleRecord[k] = String(v ?? "");
          }
          next[index] = { ...next[index], style: styleRecord };
        }
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  }, [readOnly]);

  const addMarker = useCallback(() => {
    if (readOnly) return;
    const nextIndex = localConfigs.length + 1;
    const id = `custom-marker-${Date.now().toString(36)}`;
    const newMarkerConfig = {
      id,
      label: `新標記 ${nextIndex}`,
      type: "block",
      isBlock: true,
      matchMode: "prefix",
      start: `#M${nextIndex}`,
      end: "",
      priority: 1000,
      style: {
        color: "#333333",
        backgroundColor: "transparent",
        fontWeight: "normal",
      },
      renderer: { template: "({{content}})" },
    };
    setLocalConfigs((prev) =>
      [newMarkerConfig, ...prev].map((item, index) => ({
        ...item,
        priority: 1000 - index * 10,
      }))
    );
    setExpandedId(id);
  }, [readOnly, localConfigs.length]);

  const removeMarker = useCallback(
    (index: number) => {
      if (readOnly) return;
      const removed = localConfigs[index];
      setLocalConfigs((prev) => {
        const next = [...prev];
        next.splice(index, 1);
        return next;
      });
      if (
        removed &&
        (removed.id === expandedId || String(removed._tempId || "") === expandedId)
      ) {
        setExpandedId(null);
      }
    },
    [localConfigs, expandedId, readOnly]
  );

  const applyJson = useCallback(() => {
    if (readOnly) return;
    if (parseError) return;
    const { value, error } = safeParseThemeConfigsText(jsonText);
    if (error || !value) return;
    setLocalConfigs(value);
    setIsDirty(true);
  }, [jsonText, parseError, readOnly]);

  return {
    localConfigs,
    setLocalConfigs,
    expandedId,
    setExpandedId,
    jsonText,
    setJsonText,
    parseError,
    isDirty,
    isSaving,
    lastSavedAt,
    existingIds,
    updateMarker,
    addMarker,
    removeMarker,
    applyJson,
    save,
  };
}
