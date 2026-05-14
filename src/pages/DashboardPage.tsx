import React, { useEffect } from "react";
import HybridDashboard from "../components/dashboard/HybridDashboard";
import { useNavigate } from "react-router-dom";
import type { ScriptManager, CloudScript } from "../hooks/useScriptManager.types";
import type { NavProps } from "../types/nav";

const isCloudScript = (value: unknown): value is CloudScript =>
  typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string";

export default function DashboardPage({ scriptManager, navProps }: { scriptManager: ScriptManager; navProps: NavProps }) {
  const navigate = useNavigate();
  const {
    setActiveCloudScript, setActivePublicScriptId,
    setRawScript, setTitleName, setCloudScriptMode,
  } = scriptManager;

  const { nav } = navProps;

  // On mount, ensure cleaner state
  useEffect(() => {
    setActiveCloudScript(null);
    setActivePublicScriptId(null);
    setRawScript("");
    setTitleName("");
    setCloudScriptMode("read");
    document.title = "Screenplay Reader";
  }, []);

  const handleSelectCloud = (script: unknown, mode: string = "read") => {
    if (!isCloudScript(script)) return;
    const resolvedMode = mode === "edit" ? "edit" : "read";
    // Pre-populate scriptManager: title/mode are immediately available from list data;
    // rawScript is only set when content is defined (list API omits content via ScriptSummary)
    if (script?.id) {
      setActiveCloudScript(script);
      if (script.content !== undefined) {
        setRawScript(script.content || "");
      }
      setTitleName(script.title || "");
      setCloudScriptMode(resolvedMode);
      setActivePublicScriptId(null);
    }
    navigate(`/edit/${script.id}?mode=${resolvedMode}`);
  };

  return (
    <HybridDashboard
      onSelectCloudScript={handleSelectCloud}
      openMobileMenu={() => nav.setIsMobileDrawerOpen(true)}
      isSidebarOpen={nav.isDesktopSidebarOpen}
      setSidebarOpen={nav.setIsDesktopSidebarOpen}
    />
  );
}
