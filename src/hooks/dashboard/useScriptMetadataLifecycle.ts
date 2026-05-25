import { useEffect, useRef } from "react";
import { getScript } from "../../lib/api/scripts";
import type { ScriptLike } from "./types";

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
}: {
  open: boolean;
  scriptId?: string | null;
  script?: ScriptLike | null;
  localScript?: ScriptLike | null;
  setLocalScript: (v: ScriptLike | null) => void;
  hydrateScriptState: (script: ScriptLike) => void;
  initializedRef: { current: boolean };
  userEditedRef: { current: boolean };
  authorEditedRef?: { current?: boolean } | null;
  contactAutoFilledRef: { current: boolean };
  setActiveTab: (v: string) => void;
  setIsInitializing: (v: boolean) => void;
  setIsMediaPickerOpen: (v: boolean) => void;
  setCoverPreviewFailed: (v: boolean) => void;
  setCoverUploadError: (v: string) => void;
  setCoverUploadWarning: (v: string) => void;
  setShowAllChecklistChips: (v: boolean) => void;
  setSeriesExpanded: (v: boolean) => void;
  setShowSeriesQuickCreate: (v: boolean) => void;
  setShowValidationHints: (v: boolean) => void;
  setShowPersonaSetupDialog: (v: boolean) => void;
}) {
  const lastHydratedScriptIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      lastHydratedScriptIdRef.current = null;
      initializedRef.current = false;
      userEditedRef.current = false;
      if (authorEditedRef) authorEditedRef.current = false;
      contactAutoFilledRef.current = false;
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
        .then((full) => {
          if (!full) {
            console.error("Failed to load script: empty response", { scriptId });
            setIsInitializing(false);
            return;
          }
          setLocalScript(full);
        })
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
    const nextScriptId = String(localScript.id || "");
    if (!nextScriptId) return;
    if (lastHydratedScriptIdRef.current === nextScriptId) return;
    lastHydratedScriptIdRef.current = nextScriptId;
    setIsInitializing(true);
    hydrateScriptState(localScript);
  }, [open, scriptId, localScript, hydrateScriptState, setIsInitializing, userEditedRef]);
}
