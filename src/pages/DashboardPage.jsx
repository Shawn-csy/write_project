import React, { useEffect } from "react";
import HybridDashboard from "../components/dashboard/HybridDashboard";
import { useNavigate } from "react-router-dom";

export default function DashboardPage({ scriptManager, navProps }) {
  const navigate = useNavigate();
  const {
      setActiveCloudScript, setActivePublicScriptId,
      setRawScript, setTitleName, setCloudScriptMode
  } = scriptManager;

  const { enableLocalFiles, nav } = navProps;

  // On mount, ensure cleaner state
  useEffect(() => {
      // setActiveFile(null); // Removed
      setActiveCloudScript(null);
      setActivePublicScriptId(null);
      setRawScript("");
      setTitleName("");
      setCloudScriptMode("read");
      document.title = "Screenplay Reader";
  }, []);

  // const handleSelectLocal = (file) => {
  //     navigate(`/file/${file.name}`);
  // };

  const handleSelectCloud = (script, mode = "read") => {
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
        onSelectCloudScript={handleSelectCloud}
        enableLocalFiles={false}
        openSettings={nav.openSettings}
        openAbout={nav.openAbout}
        openMobileMenu={() => nav.setIsMobileDrawerOpen(true)}
        isSidebarOpen={nav.isDesktopSidebarOpen}
        setSidebarOpen={nav.setIsDesktopSidebarOpen}
      />
  );
}
