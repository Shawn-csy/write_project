import React from "react";
import { PanelLeftOpen } from "lucide-react";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "../ui/drawer";
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
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Mobile Drawer */}
      <Drawer
        open={isMobileDrawerOpen}
        onOpenChange={setIsMobileDrawerOpen}
        direction="left"
      >
        <DrawerContent className="h-[85vh] outline-none z-[100]">
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
            sceneList={sceneList}
            currentSceneId={currentSceneId}
            onSelectScene={onSelectScene}
          />
        </DrawerContent>
      </Drawer>

      {/* --- Desktop Sidebar --- */}
      <div 
        className={`
          hidden lg:block h-full border-r border-border bg-muted/30
          transition-all duration-300 ease-in-out shrink-0
          ${(isDesktopSidebarOpen && showSidebar) ? "w-64 opacity-100" : "w-0 opacity-0 border-0 overflow-hidden"}
        `}
      >
        <div className="w-64 h-full flex flex-col">
          <Sidebar
            className="bg-transparent" // Sidebar has its own bg, override or let it blend
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
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {children}
      </div>
    </div>
  );
}
