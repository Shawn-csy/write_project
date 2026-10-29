import React, { createContext, useContext } from "react";

interface StudioShellValue {
  /** Opens the navigation drawer on viewports without the docked sidebar. */
  openMobileMenu: () => void;
}

const StudioShellContext = createContext<StudioShellValue>({ openMobileMenu: () => {} });

export function StudioShellProvider({ value, children }: { value: StudioShellValue; children: React.ReactNode }) {
  return <StudioShellContext.Provider value={value}>{children}</StudioShellContext.Provider>;
}

export function useStudioShell(): StudioShellValue {
  return useContext(StudioShellContext);
}
