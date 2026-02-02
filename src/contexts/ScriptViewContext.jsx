import React, { createContext, useContext, useMemo } from "react";

const ScriptViewContext = createContext(null);

export function ScriptViewProvider({ scriptManager, children }) {
  const value = useMemo(() => {
    return {
      markerConfigs: scriptManager?.effectiveMarkerConfigs || [],
      setOverrideMarkerConfigs: scriptManager?.setOverrideMarkerConfigs
    };
  }, [scriptManager?.effectiveMarkerConfigs, scriptManager?.setOverrideMarkerConfigs]);

  return (
    <ScriptViewContext.Provider value={value}>
      {children}
    </ScriptViewContext.Provider>
  );
}

export const useScriptView = () => useContext(ScriptViewContext);
