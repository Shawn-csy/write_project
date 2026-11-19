import { useEffect } from "react";

export function useAppShortcuts({ adjustFont, nav, filterCharacter, setFocusMode }: {
  adjustFont: (delta: number) => void;
  nav: { setSidebarOpen: (open: boolean) => void; isDesktopSidebarOpen: boolean };
  filterCharacter?: string | null;
  setFocusMode: (updater: (v: boolean) => boolean) => void;
}) {
  useEffect(() => {
      const handler = (e: KeyboardEvent) => {
          const target = e.target instanceof HTMLElement ? e.target : null;
          if (target?.tagName?.match(/INPUT|TEXTAREA/) || target?.isContentEditable) return;
          const meta = e.metaKey || e.ctrlKey;
          const key = e.key.toLowerCase();
          
          if (meta && (key === "[" || key === "{")) { e.preventDefault(); adjustFont(-1); }
          else if (meta && (key === "]" || key === "}")) { e.preventDefault(); adjustFont(1); }
          else if (meta && key === "b") { e.preventDefault(); nav.setSidebarOpen(!nav.isDesktopSidebarOpen); }
          else if (meta && key === "g") {
              if (filterCharacter && filterCharacter !== "__ALL__") {
                  e.preventDefault(); setFocusMode((v: boolean) => !v);
              }
          }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
  }, [adjustFont, nav, filterCharacter, setFocusMode]);
}
