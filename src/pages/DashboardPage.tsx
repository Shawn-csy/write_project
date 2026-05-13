import React, { useEffect } from "react";
import HybridDashboardJs from "../components/dashboard/HybridDashboard";
// HybridDashboard is a JS component pending TS migration; cast to bypass prop checking
const HybridDashboard = HybridDashboardJs as unknown as React.ComponentType<Record<string, unknown>>;
import { useNavigate } from "react-router-dom";
import type { ScriptManager, CloudScript } from "../hooks/useScriptManager.types";
import type { NavProps } from "../types/nav";

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

  const handleSelectCloud = (script: CloudScript, mode: "read" | "edit" = "read") => {
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
      localFiles={[]}
      onSelectLocalFile={() => {}}
      onSelectCloudScript={handleSelectCloud as any}
      enableLocalFiles={false}
      openSettings={nav.openSettings}
      openAbout={nav.openAbout}
      openMobileMenu={() => nav.setIsMobileDrawerOpen(true)}
      isSidebarOpen={nav.isDesktopSidebarOpen}
      setSidebarOpen={nav.setIsDesktopSidebarOpen}
    />
  );
}
