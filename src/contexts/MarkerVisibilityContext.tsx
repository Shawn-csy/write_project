/**
 * MarkerVisibilityContext — high-frequency state.
 * hiddenMarkerIds changes on every marker toggle during reading.
 * Isolated so Reader components can subscribe without triggering
 * re-renders in appearance or theme consumers.
 */
import React, { createContext, useContext } from "react";

export interface MarkerVisibilityContextValue {
  hiddenMarkerIds: string[];
  setHiddenMarkerIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleMarkerVisibility: (id: string) => void;
}

const MarkerVisibilityContext = createContext<MarkerVisibilityContextValue | undefined>(undefined);

export function useMarkerVisibility(): MarkerVisibilityContextValue {
  const ctx = useContext(MarkerVisibilityContext);
  if (!ctx) throw new Error("useMarkerVisibility must be used within SettingsProvider");
  return ctx;
}

export const MarkerVisibilityProvider = MarkerVisibilityContext.Provider;
