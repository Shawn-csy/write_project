import { useEffect } from "react";
import { getScript } from "../../lib/api/scripts";

export function useScriptMetadataLifecycle({
  open,
  scriptId,
  script,
  localScript,
  setLocalScript,
  hydrateScriptState,
  initializedRef,
  userEditedRef,
  authorEditedRef,
  contactAutoFilledRef,
  publicLoadedRef,
  setActiveTab,
  setIsInitializing,
  setIsMediaPickerOpen,
  setCoverPreviewFailed,
  setCoverUploadError,
  setCoverUploadWarning,
  setShowAllChecklistChips,
  setSeriesExpanded,
  setShowSeriesQuickCreate,
  setShowValidationHints,
  setShowPersonaSetupDialog,
}) {
  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      userEditedRef.current = false;
      if (authorEditedRef) authorEditedRef.current = false;
      contactAutoFilledRef.current = false;
      publicLoadedRef.current = null;
      setLocalScript(null);
      setActiveTab("basic");
      setIsInitializing(false);
      setIsMediaPickerOpen(false);
      setCoverPreviewFailed(false);
      setCoverUploadError("");
      setCoverUploadWarning("");
      setShowAllChecklistChips(false);
      setSeriesExpanded(false);
      setShowSeriesQuickCreate(false);
      setShowValidationHints(false);
      setShowPersonaSetupDialog(false);
      return;
    }
    if (initializedRef.current) return;
    if (scriptId) {
      setIsInitializing(true);
      initializedRef.current = true;
      userEditedRef.current = false;
      if (authorEditedRef) authorEditedRef.current = false;
      getScript(scriptId)
        .then((full) => setLocalScript(full))
        .catch((error) => {
          console.error("Failed to load script", error);
          setIsInitializing(false);
        });
      return;
    }
    if (!script) return;
    setIsInitializing(true);
    initializedRef.current = true;
    userEditedRef.current = false;
    if (authorEditedRef) authorEditedRef.current = false;
    hydrateScriptState(script);
  }, [
    open,
    scriptId,
    script?.id,
    hydrateScriptState,
    initializedRef,
    userEditedRef,
    authorEditedRef,
    contactAutoFilledRef,
    publicLoadedRef,
    setLocalScript,
    setActiveTab,
    setIsInitializing,
    setIsMediaPickerOpen,
    setCoverPreviewFailed,
    setCoverUploadError,
    setCoverUploadWarning,
    setShowAllChecklistChips,
    setSeriesExpanded,
    setShowSeriesQuickCreate,
    setShowValidationHints,
    setShowPersonaSetupDialog,
  ]);

  useEffect(() => {
    if (!open) return;
    if (!scriptId || !localScript || userEditedRef.current) return;
    setIsInitializing(true);
    hydrateScriptState(localScript);
  }, [open, scriptId, localScript, hydrateScriptState, setIsInitializing, userEditedRef]);
}
