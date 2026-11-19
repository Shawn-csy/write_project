import React from "react";
import type { Nav } from "../../hooks/useAppNavigation";
import { useAuth } from "../../contexts/AuthContext";

import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "../ui/drawer";
import Sidebar from "./Sidebar";
import { StudioShellProvider } from "../studio/StudioShellContext";

interface MainLayoutProps {
  children: React.ReactNode;
  isDesktopSidebarOpen: boolean;
  setIsDesktopSidebarOpen: (open: boolean) => void;
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
  openAbout: Nav["openAbout"];
  closeOverlays: () => void;
  showSidebar?: boolean;
}

export function MainLayout({
  children,
  isDesktopSidebarOpen,
  setIsDesktopSidebarOpen,
  isMobileDrawerOpen,
  setIsMobileDrawerOpen,
  openAbout,
  closeOverlays,
  showSidebar = true,
}: MainLayoutProps) {
  const { profile } = useAuth();
  const shellValue = React.useMemo(() => ({ openMobileMenu: () => setIsMobileDrawerOpen(true) }), [setIsMobileDrawerOpen]);

  return (
    <StudioShellProvider value={shellValue}>
      <div className="studio-density relative flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
        <Drawer open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen} direction="left">
          <DrawerContent side="left" showHandle={false} className="z-[100] w-72 p-0 outline-none">
            <DrawerTitle className="sr-only">Menu</DrawerTitle>
            <DrawerDescription className="sr-only">Studio navigation</DrawerDescription>
            <Sidebar
              className="h-full"
              openAbout={openAbout}
              closeOverlays={closeOverlays}
              setSidebarOpen={setIsMobileDrawerOpen}
              isAdmin={Boolean(profile?.isAdmin)}
            />
          </DrawerContent>
        </Drawer>

        {showSidebar && (
          <div
            className={`hidden shrink-0 overflow-hidden border-r border-border transition-[width] duration-300 ease-in-out lg:block ${
              isDesktopSidebarOpen ? "w-60" : "w-16"
            }`}
          >
            <Sidebar
              className="h-full"
              collapsed={!isDesktopSidebarOpen}
              openAbout={openAbout}
              closeOverlays={closeOverlays}
              setSidebarOpen={setIsDesktopSidebarOpen}
              isAdmin={Boolean(profile?.isAdmin)}
            />
          </div>
        )}

        <div className="relative flex h-full min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </StudioShellProvider>
  );
}
