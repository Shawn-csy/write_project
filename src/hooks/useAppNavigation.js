import { useState, useEffect } from "react";

export function useAppNavigation() {
  const [homeOpen, setHomeOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("display");
  
  // Sidebar State
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Unified Sidebar Setter
  const setSidebarOpen = (open) => {
    if (window.innerWidth < 1024) {
      setIsMobileDrawerOpen(open);
    } else {
      setIsDesktopSidebarOpen(open);
    }
  };

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileDrawerOpen]);

  // Actions
  const openHome = () => {
    setHomeOpen(true);
    setAboutOpen(false);
    setSettingsOpen(false);
  };

  const openAbout = () => {
    setAboutOpen(true);
    setHomeOpen(false);
    setSettingsOpen(false);
  };

  const openSettings = () => {
    setSettingsOpen((prev) => !prev);
    setHomeOpen(false);
    setAboutOpen(false);
  };

  const closeOverlays = () => {
      setHomeOpen(false);
      setAboutOpen(false);
      setSettingsOpen(false);
  };
  
  const resetToReader = () => {
      closeOverlays();
  };

  return {
    homeOpen, setHomeOpen,
    aboutOpen, setAboutOpen,
    settingsOpen, setSettingsOpen,
    settingsTab, setSettingsTab,
    isDesktopSidebarOpen, setIsDesktopSidebarOpen,
    isMobileDrawerOpen, setIsMobileDrawerOpen,
    setSidebarOpen,
    openHome,
    openAbout,
    openSettings,
    resetToReader
  };
}
