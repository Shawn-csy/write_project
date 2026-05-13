import { useEffect } from "react";

export function useAppShortcuts({ adjustFont, nav, filterCharacter, setFocusMode }) {
  useEffect(() => {
      const handler = (e) => {
          if (e.target?.tagName?.match(/INPUT|TEXTAREA/) || e.target?.isContentEditable) return;
          const meta = e.metaKey || e.ctrlKey;
          const key = e.key.toLowerCase();
          
          if (meta && (key === "[" || key === "{")) { e.preventDefault(); adjustFont(-1); }
          else if (meta && (key === "]" || key === "}")) { e.preventDefault(); adjustFont(1); }
          else if (meta && key === "b") { e.preventDefault(); nav.setSidebarOpen(!nav.isDesktopSidebarOpen); }
          else if (meta && key === "g") { 
              if (filterCharacter && filterCharacter !== "__ALL__") {
                  e.preventDefault(); setFocusMode(v => !v);
              }
          }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
  }, [adjustFont, nav, filterCharacter, setFocusMode]);
}
