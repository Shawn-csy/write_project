import { useCallback, useEffect, useRef } from "react";
import { updateScript } from "../lib/api/scripts";
import type { ScriptManager } from "./useScriptManager.types";

export function usePersistMarkerTheme(scriptManager: Pick<ScriptManager, "activeCloudScript" | "setActiveCloudScript">) {
  const { activeCloudScript, setActiveCloudScript } = scriptManager;
  const scriptRef = useRef(activeCloudScript);
  useEffect(() => { scriptRef.current = activeCloudScript; }, [activeCloudScript]);

  return useCallback(async (newThemeId: string): Promise<boolean> => {
    const script = scriptRef.current;
    if (!script?.id) return false;
    const normalized = String(newThemeId || "default");
    const prev = String(script.markerThemeId || "default");
    if (normalized === prev) return true;
    setActiveCloudScript(s => s ? { ...s, markerThemeId: normalized } : s);
    try {
      await updateScript(script.id, { markerThemeId: normalized });
      return true;
    } catch {
      setActiveCloudScript(s => s ? { ...s, markerThemeId: prev } : s);
      return false;
    }
  }, [setActiveCloudScript]);
}
