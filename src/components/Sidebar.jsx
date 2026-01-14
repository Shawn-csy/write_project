import React from "react";
import {
  PanelLeftClose,
  Settings,
  AlignLeft,
  Home,
  Info
} from "lucide-react";
import { Button } from "./ui/button";
import UserMenu from "./auth/UserMenu";

function Sidebar({
  // Scene Props
  sceneList = [],
  currentSceneId,
  onSelectScene,
  
  // Navigation
  activeFile,
  openAbout,
  openSettings,
  closeAbout,
  setSidebarOpen,
  openHome,
  accentStyle,
  className,
}) {
  const closeSidebarIfMobile = () => {
    if (!setSidebarOpen || typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  };

  const handleHome = () => {
    openHome();
    closeAbout();
    closeSidebarIfMobile();
  };

  return (
    <aside className={`relative h-full min-h-0 flex flex-col bg-muted/30 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0 h-14">
        <button
            type="button"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
            onClick={(e) => {
               e.preventDefault();
               handleHome();
            }}
            aria-label="回首頁"
          >
            <div className={`w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0`}>
                <span className={`text-[10px] font-bold ${accentStyle.label.replace('text-', 'text-')}`}>SR</span>
            </div>
            <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold leading-none truncate">Screenplay</span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate">Reader</span>
            </div>
        </button>

        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setSidebarOpen(false)}
            aria-label="收合列表"
        >
            <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Content: Scene Outline */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Section Label */}
          <div className="px-4 py-3 flex items-center gap-2 text-muted-foreground shrink-0">
            {activeFile ? (
               <><AlignLeft className="h-3.5 w-3.5" /><span className="text-xs font-medium uppercase tracking-wider">Scene Outline</span></>
            ) : (
               <><Home className="h-3.5 w-3.5" /><span className="text-xs font-medium uppercase tracking-wider">Navigation</span></>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
             {activeFile && sceneList.length > 0 ? (
                 <div className="space-y-0.5">
                     {sceneList.map((scene) => (
                         <button
                           key={scene.id}
                           onClick={() => {
                               onSelectScene(scene.id);
                               closeSidebarIfMobile();
                           }}
                           className={`
                             group w-full text-left px-3 py-2 rounded-md text-xs transition-all relative
                             ${currentSceneId === scene.id 
                               ? `bg-primary/5 font-semibold text-primary` 
                               : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                             }
                           `}
                         >
                            {/* Visual indicator for active item */}
                            {currentSceneId === scene.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3/4 bg-primary rounded-r-full" />
                            )}
                            <span className="line-clamp-2 leading-relaxed">{scene.label}</span>
                         </button>
                     ))}
                 </div>
             ) : !activeFile ? (
                <>
                {/* Quick Navigation when no file is active */}
                <div className="space-y-1">
                    <Button 
                        onClick={handleHome} 
                        variant="ghost" 
                        className="w-full justify-start text-xs h-9 font-normal text-muted-foreground hover:text-foreground"
                    >
                        <Home className="w-4 h-4 mr-2" />
                        閱讀 (Read)
                    </Button>
                    <Button 
                        onClick={() => { handleHome(); }} 
                        variant="ghost" 
                        className="w-full justify-start text-xs h-9 font-normal text-muted-foreground hover:text-foreground"
                    >
                        <AlignLeft className="w-4 h-4 mr-2" />
                        寫作 (Write)
                    </Button>
                    <Button 
                        onClick={() => { openAbout(); closeSidebarIfMobile(); }} 
                        variant="ghost" 
                        className="w-full justify-start text-xs h-9 font-normal text-muted-foreground hover:text-foreground"
                    >
                        <Info className="w-4 h-4 mr-2" />
                        關於 (About)
                    </Button>
                    <Button 
                        onClick={() => { openSettings(); closeSidebarIfMobile(); }} 
                        variant="ghost" 
                        className="w-full justify-start text-xs h-9 font-normal text-muted-foreground hover:text-foreground"
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        設定 (Settings)
                    </Button>
                </div>
                </>
             ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3 p-4 text-center">
                   <p className="text-xs">此劇本沒有場景標題</p>
                </div>
             )}
          </div>
      </div>

      {/* Footer */}
      {/* Footer */}
      <div className="mt-auto border-t border-border/40 p-3 shrink-0 bg-background/20 backdrop-blur-sm space-y-2">
        {/* User Profile */}
        <UserMenu />
        
        {/* App Actions (Settings, About) */}
        <div className="flex items-center gap-1">
             <Button 
                variant="ghost" 
                size="sm"
                className="flex-1 justify-start h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60"
                onClick={() => { openSettings(); closeSidebarIfMobile(); }}
                title="設定 (Settings)"
            >
                <Settings className="w-4 h-4 mr-2" />
                <span className="truncate">設定</span>
            </Button>
            
            <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0"
                onClick={() => { openAbout(); closeSidebarIfMobile(); }}
                title="關於 (About)"
            >
                <Info className="w-4 h-4" />
            </Button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
