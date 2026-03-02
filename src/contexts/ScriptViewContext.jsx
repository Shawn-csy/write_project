import React, { createContext, useContext, useMemo } from "react";

const ScriptViewContext = createContext(null);

export function ScriptViewProvider({ scriptManager, children }) {
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
