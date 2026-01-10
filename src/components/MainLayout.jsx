import React from "react";
import { PanelLeftOpen } from "lucide-react";
import { Button } from "./ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "./ui/drawer";
import Sidebar from "./Sidebar";
import MobileMenu from "./MobileMenu";

export function MainLayout({
  children,
  isDesktopSidebarOpen,
  setIsDesktopSidebarOpen,
  isMobileDrawerOpen,
  setIsMobileDrawerOpen,
  fileTree,
  activeFile,
  onSelectFile,
  accentStyle,
  openAbout,
  closeAbout,
  openSettings,
  openHome,
  files,
  fileTitleMap,
  searchTerm,
  setSearchTerm,
  openFolders,
  toggleFolder,
  fileTagsMap,
  fileLabelMode,
  setFileLabelMode,
  sceneList,
  currentSceneId,
  onSelectScene, // Add this back
  showSidebar = true
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Toggle Button for Sidebar (Float, outside container to match original z-index behavior) */}


      {/* Centered Main Container */}
      <div className="mx-auto flex h-screen max-w-7xl px-4 py-4 lg:px-6 lg:py-6 gap-3 lg:gap-4">
        
        {/* --- Mobile Drawer --- */}
        <Drawer
          open={isMobileDrawerOpen}
          onOpenChange={setIsMobileDrawerOpen}
          direction="left"
        >
          <DrawerContent className="h-[85vh] outline-none">
            <DrawerTitle className="sr-only">Menu</DrawerTitle>
            <DrawerDescription className="sr-only">Script Navigation</DrawerDescription>
            <MobileMenu
              fileTree={fileTree}
              activeFile={activeFile}
              onSelectFile={onSelectFile}
              accentStyle={accentStyle}
              openAbout={openAbout}
              closeAbout={closeAbout}
              openSettings={openSettings}
              onClose={() => setIsMobileDrawerOpen(false)}
              fileTitleMap={fileTitleMap}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              openFolders={openFolders}
              toggleFolder={toggleFolder}
            />
          </DrawerContent>
        </Drawer>

        {/* --- Desktop Sidebar --- */}
        <div 
          className={`
            hidden lg:block h-full border border-border bg-muted/20 rounded-2xl
            transition-all duration-300 ease-in-out overflow-hidden
            ${(isDesktopSidebarOpen && showSidebar) ? "w-52 opacity-100" : "w-0 opacity-0 border-0"}
          `}
        >
          <div className="w-52 h-full flex flex-col">
            <Sidebar
              fileTree={fileTree}
              activeFile={activeFile}
              onSelectFile={onSelectFile}
              accentStyle={accentStyle}
              openAbout={openAbout}
              closeAbout={closeAbout}
              openSettings={openSettings}
              files={files}
              fileTitleMap={fileTitleMap}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              openFolders={openFolders}
              toggleFolder={toggleFolder}
              openHome={openHome}
              fileTagsMap={fileTagsMap}
              fileLabelMode={fileLabelMode}
              setFileLabelMode={setFileLabelMode}
              setSidebarOpen={setIsDesktopSidebarOpen}
              sceneList={sceneList}
              currentSceneId={currentSceneId}
              onSelectScene={onSelectScene}
            />
          </div>
        </div>

        {/* --- Main Content Area --- */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative transition-[width] duration-300">
          {children}
        </div>
      </div>
    </div>
  );
}
