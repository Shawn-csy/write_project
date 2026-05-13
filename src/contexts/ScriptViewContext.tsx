import React, { createContext, useContext, useMemo } from "react";

interface ScriptViewContextValue {
  markerConfigs: any[];
  setOverrideMarkerConfigs: ((configs: any[]) => void) | undefined;
  setScopedMarkerConfigs: ((configs: any[]) => void) | undefined;
}

const ScriptViewContext = createContext<ScriptViewContextValue | null>(null);

export function ScriptViewProvider({ scriptManager, children }: { scriptManager: any; children: React.ReactNode }) {
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
