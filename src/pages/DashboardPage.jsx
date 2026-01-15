import React, { useEffect } from "react";
import HybridDashboard from "../components/dashboard/HybridDashboard";
import { useNavigate } from "react-router-dom";

export default function DashboardPage({ scriptManager, navProps }) {
  const navigate = useNavigate();
  const { 
      files, 
      setActiveFile, setActiveCloudScript, setActivePublicScriptId, 
      setRawScript, setTitleName, setCloudScriptMode
  } = scriptManager;

  const { enableLocalFiles, nav } = navProps;

  // On mount, ensure cleaner state
  useEffect(() => {
      setActiveFile(null);
      setActiveCloudScript(null);
      setActivePublicScriptId(null);
      setRawScript("");
      setTitleName("");
      setCloudScriptMode("read");
      document.title = "Screenplay Reader";
  }, []);

  const handleSelectLocal = (file) => {
      navigate(`/file/${file.name}`);
  };

  const handleSelectCloud = (script) => {
      navigate(`/edit/${script.id}?mode=read`);
  };

  const handleSelectPublic = (script) => {
      navigate(`/read/${script.id}`);
  };

  return (
      <HybridDashboard 
        localFiles={enableLocalFiles ? files : []}
        onSelectLocalFile={handleSelectLocal}
        onSelectCloudScript={handleSelectCloud}
        onSelectPublicScript={handleSelectPublic}
        enableLocalFiles={enableLocalFiles}
        openSettings={nav.openSettings}
        openAbout={nav.openAbout}
        openMobileMenu={() => nav.setIsMobileDrawerOpen(true)}
        isSidebarOpen={nav.isDesktopSidebarOpen}
        setSidebarOpen={nav.setIsDesktopSidebarOpen}
      />
  );
}
