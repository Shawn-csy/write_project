import { useCallback, useEffect, useMemo, useState } from "react";
import { safeParseThemeConfigsText } from "../../lib/markerThemeCodec.js";

export function useMarkerSettingsState({
  markerConfigs,
  setMarkerConfigs,
  viewMode,
}) {
  const [localConfigs, setLocalConfigs] = useState(markerConfigs || []);
  const [expandedId, setExpandedId] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const existingIds = useMemo(
    () => localConfigs.map((c) => c.id).filter(Boolean),
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

  useEffect(() => {
    if (!isDirty || isSaving) return;
    if (viewMode === "json" && parseError) return;

    const timer = setTimeout(() => {
      const current = JSON.stringify(markerConfigs || []);
      const next = JSON.stringify(localConfigs || []);
      if (current === next) {
        setIsDirty(false);
        return;
      }

      setIsSaving(true);
      Promise.resolve(setMarkerConfigs(localConfigs))
        .then(() => {
          setLastSavedAt(new Date());
          setIsDirty(false);
        })
        .finally(() => setIsSaving(false));
    }, 180);

    return () => clearTimeout(timer);
  }, [
    isDirty,
    isSaving,
    viewMode,
    parseError,
    markerConfigs,
    localConfigs,
    setMarkerConfigs,
  ]);

  const updateMarker = useCallback((index, field, value) => {
    setLocalConfigs((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;

      if (typeof field === "object" && field !== null) {
        next[index] = { ...next[index], ...field };
      } else if (field === "style") {
        next[index] = { ...next[index], style: value };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  }, []);

  const addMarkerFromWizard = useCallback((newMarkerConfig) => {
    setLocalConfigs((prev) =>
      [newMarkerConfig, ...prev].map((item, index) => ({
        ...item,
        priority: 1000 - index * 10,
      }))
    );
    setExpandedId(newMarkerConfig.id);
  }, []);

  const removeMarker = useCallback(
    (index) => {
      const removed = localConfigs[index];
      setLocalConfigs((prev) => {
        const next = [...prev];
        next.splice(index, 1);
        return next;
      });
      if (
        removed &&
        (removed.id === expandedId || removed._tempId === expandedId)
      ) {
        setExpandedId(null);
      }
    },
    [localConfigs, expandedId]
  );

  const applyJson = useCallback(() => {
    if (parseError) return;
    const { value, error } = safeParseThemeConfigsText(jsonText);
    if (error || !value) return;
    setLocalConfigs(value);
    setIsDirty(true);
  }, [jsonText, parseError]);

  return {
    localConfigs,
    setLocalConfigs,
    expandedId,
    setExpandedId,
    wizardOpen,
    setWizardOpen,
    isAdvancedMode,
    setIsAdvancedMode,
    jsonText,
    setJsonText,
    parseError,
    isDirty,
    isSaving,
    lastSavedAt,
    existingIds,
    updateMarker,
    addMarkerFromWizard,
    removeMarker,
    applyJson,
  };
}
