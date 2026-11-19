import React, { createContext, useContext, useMemo } from "react";
import type { ScriptManager, MarkerConfig } from "../hooks/useScriptManager.types";

interface ScriptViewContextValue {
  markerConfigs: MarkerConfig[];
  setOverrideMarkerConfigs: ScriptManager["setOverrideMarkerConfigs"];
  setScopedMarkerConfigs: ScriptManager["setScopedMarkerConfigs"];
}

const ScriptViewContext = createContext<ScriptViewContextValue | null>(null);

export function ScriptViewProvider({ scriptManager, children }: { scriptManager: ScriptManager; children: React.ReactNode }) {
  const value = useMemo(() => {
    return {
      markerConfigs: scriptManager?.effectiveMarkerConfigs || [],
      setOverrideMarkerConfigs: scriptManager?.setOverrideMarkerConfigs,
      setScopedMarkerConfigs: scriptManager?.setScopedMarkerConfigs
    };
  }, [scriptManager?.effectiveMarkerConfigs, scriptManager?.setOverrideMarkerConfigs, scriptManager?.setScopedMarkerConfigs]);

  return (
    <ScriptViewContext.Provider value={value}>
      {children}
    </ScriptViewContext.Provider>
  );
}

export const useScriptView = () => useContext(ScriptViewContext);
