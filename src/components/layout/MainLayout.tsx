import React from "react";
import type { Nav } from "../../hooks/useAppNavigation";

// All dependencies are JSX — cast until migrated
type AC = React.ComponentType<Record<string, unknown>>;
type ACC = React.ComponentType<{ children?: React.ReactNode; [k: string]: unknown }>;

import {
  Drawer as DrawerJs,
  DrawerContent as DrawerContentJs,
  DrawerTitle as DrawerTitleJs,
  DrawerDescription as DrawerDescriptionJs,
} from "../ui/drawer";
import SidebarJs from "./Sidebar";

const Drawer = DrawerJs as unknown as ACC;
const DrawerContent = DrawerContentJs as unknown as ACC;
const DrawerTitle = DrawerTitleJs as unknown as ACC;
const DrawerDescription = DrawerDescriptionJs as unknown as ACC;
const Sidebar = SidebarJs as unknown as AC;

interface MainLayoutProps {
  children: React.ReactNode;
  isDesktopSidebarOpen: boolean;
  setIsDesktopSidebarOpen: (open: boolean) => void;
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
  accentStyle: { label?: string; [key: string]: string | undefined };
  openAbout: Nav["openAbout"];
  closeAbout: () => void;
  openSettings: Nav["openSettings"];
  openHome: () => void;
  showSidebar?: boolean;
}

export function MainLayout({
  children,
  isDesktopSidebarOpen,
  setIsDesktopSidebarOpen,
  isMobileDrawerOpen,
  setIsMobileDrawerOpen,
  accentStyle,
  openAbout,
  closeAbout,
  openSettings,
  openHome,
  showSidebar = true,
}: MainLayoutProps) {
  return (
    <div className="relative flex h-[100dvh] w-full bg-background text-foreground overflow-hidden">
      {/* Mobile Drawer */}
      <Drawer
        open={isMobileDrawerOpen}
        onOpenChange={setIsMobileDrawerOpen}
        direction="left"
      >
        <DrawerContent side="left" showHandle={false} className="outline-none z-[100] p-0">
          <DrawerTitle className="sr-only">Menu</DrawerTitle>
          <DrawerDescription className="sr-only">Script Navigation</DrawerDescription>
          <Sidebar
            className="h-full bg-background border-r-0"
            accentStyle={accentStyle}
            openAbout={openAbout}
            closeAbout={closeAbout}
            openSettings={openSettings}
            openHome={openHome}
            setSidebarOpen={setIsMobileDrawerOpen}
          />
        </DrawerContent>
      </Drawer>

      {/* --- Desktop Sidebar (Docked Mode) --- */}
      {showSidebar && (
        <div
          className={`hidden lg:block shrink-0 border-r border-border bg-muted/30 transition-[width] duration-300 ease-in-out overflow-hidden ${
            isDesktopSidebarOpen ? "w-64" : "w-16"
          }`}
        >
          <div className="h-full flex flex-col">
            <Sidebar
              className="bg-transparent"
              collapsed={!isDesktopSidebarOpen}
              accentStyle={accentStyle}
              openAbout={openAbout}
              closeAbout={closeAbout}
              openSettings={openSettings}
              openHome={openHome}
              setSidebarOpen={setIsDesktopSidebarOpen}
            />
          </div>
        </div>
      )}

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {children}
      </div>
    </div>
  );
}
