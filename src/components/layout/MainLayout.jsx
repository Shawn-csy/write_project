import React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "../ui/drawer";
import Sidebar from "./Sidebar";

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
            setSidebarOpen={setIsMobileDrawerOpen}
            sceneList={sceneList}
            currentSceneId={currentSceneId}
            onSelectScene={onSelectScene}
          />
        </DrawerContent>
      </Drawer>

      {/* --- Desktop Sidebar (Docked Mode) --- */}
      {showSidebar && (
        <div
          className={`hidden lg:block shrink-0 border-r border-border bg-muted/30 transition-[width] duration-300 ease-in-out overflow-hidden ${
            isDesktopSidebarOpen ? "w-64" : "w-0 border-r-0"
          }`}
          aria-hidden={!isDesktopSidebarOpen}
        >
          <div className="w-64 h-full flex flex-col">
            <Sidebar
              className="bg-transparent"
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
      )}

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {children}
      </div>
    </div>
  );
}
