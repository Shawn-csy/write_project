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

const normalizeMarkerConfigForEditor = (cfg: MarkerConfig): MarkerConfig => {
  const mode = String(cfg?.matchMode || "").trim().toLowerCase();
  if (mode === "range") {
    return { ...cfg, type: "block", isBlock: true };
  }
  if (cfg?.type === "inline" && cfg?.isBlock === true) {
    return { ...cfg, isBlock: false };
  }
  if (cfg?.type === "block" && cfg?.isBlock === false) {
    return { ...cfg, isBlock: true };
  }
  return cfg;
};

const normalizeMarkerConfigsForEditor = (configs: MarkerConfig[] = []): MarkerConfig[] =>
  (Array.isArray(configs) ? configs : []).map(normalizeMarkerConfigForEditor);

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
  const markerConfigsSignature = useMemo(
    () => JSON.stringify(markerConfigs || []),
    [markerConfigs]
  );
  const localConfigsSignature = useMemo(
    () => JSON.stringify(localConfigs || []),
    [localConfigs]
  );

  useEffect(() => {
    const incoming = markerConfigs || [];
    const normalizedIncoming = normalizeMarkerConfigsForEditor(incoming);
    setLocalConfigs(normalizedIncoming);
    setJsonText(JSON.stringify(normalizedIncoming, null, 2));
    setParseError("");
    setIsDirty(false);
  }, [markerConfigs]);

  useEffect(() => {
    if (viewMode !== "json") {
      setJsonText(JSON.stringify(localConfigs || [], null, 2));
    }
  }, [localConfigs, viewMode]);

  useEffect(() => {
    if (markerConfigsSignature !== localConfigsSignature) {
      setIsDirty(true);
    } else if (!isSaving) {
      setIsDirty(false);
    }
  }, [markerConfigsSignature, localConfigsSignature, isSaving]);

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
    if (markerConfigsSignature === localConfigsSignature) { setIsDirty(false); return; }
    setIsSaving(true);
    try {
      await Promise.resolve(setMarkerConfigs(localConfigs));
      setLastSavedAt(new Date());
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, [readOnly, isSaving, viewMode, parseError, markerConfigsSignature, localConfigsSignature, localConfigs, setMarkerConfigs]);

  useDebouncedAutosave({
    enabled: isDirty && !readOnly && !isSaving && !(viewMode === "json" && Boolean(parseError)),
    delayMs: 900,
    save,
  });

  const updateMarker = useCallback((index: number, field: keyof MarkerConfig | Partial<MarkerConfig>, value?: unknown) => {
    if (readOnly) return;
    setLocalConfigs((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;

      if (typeof field === "object" && field !== null) {
        next[index] = normalizeMarkerConfigForEditor({ ...next[index], ...field });
      } else if (field === "style") {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const styleRecord: Record<string, string> = {};
          for (const [k, v] of Object.entries(value)) {
            styleRecord[k] = String(v ?? "");
          }
          next[index] = normalizeMarkerConfigForEditor({ ...next[index], style: styleRecord });
        }
      } else {
        next[index] = normalizeMarkerConfigForEditor({ ...next[index], [field]: value });
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
    setLocalConfigs(normalizeMarkerConfigsForEditor(value));
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
