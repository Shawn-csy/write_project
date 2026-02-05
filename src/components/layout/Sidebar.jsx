import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  PanelLeftClose,
  Settings,
  AlignLeft,
  Home,
  Info,
  LayoutTemplate,
  ChevronLeft,
  Library,
  PencilLine
} from "lucide-react";
import { Button } from "../ui/button";
import UserMenu from "../auth/UserMenu";

function Sidebar({
  // Scene Props
  sceneList = [],
  currentSceneId,
  onSelectScene,
  
  // Navigation
  // activeFile, // Removed
  openAbout,
  openSettings,
  closeAbout,
  setSidebarOpen,
  openHome,
  accentStyle,
  className,
}) {
  const navigate = useNavigate();
  const location = useLocation();

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

  const NavItem = ({ icon: Icon, label, onClick, isActive, className = "" }) => (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all
        ${isActive 
          ? "bg-primary/10 text-primary font-medium" 
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        }
        ${className}
      `}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <aside className={`relative h-full min-h-0 flex flex-col bg-muted/30 border-r border-border/40 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 h-14 shrink-0">
        <button
            type="button"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left group"
            onClick={(e) => {
               e.preventDefault();
               handleHome();
            }}
            aria-label="回首頁"
          >
            <div className={`w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors`}>
                <span className={`text-[10px] font-bold ${accentStyle.label}`}>SR</span>
            </div>
            <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold leading-none truncate font-tracking-tight">Screenplay</span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate group-hover:text-primary/80 transition-colors">Reader</span>
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

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          
          <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin space-y-4">
             {/* Contextual Navigation or Scene List */}
              <div className="space-y-1 pt-2">
                  <div className="px-3 pb-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground opacity-70">Menu</span>
                  </div>
                  
                  <NavItem 
                      icon={PencilLine} 
                      label="閱讀與寫作 (Workspace)" 
                      onClick={() => { openHome(); closeSidebarIfMobile(); }}
                      isActive={location.pathname.includes("/dashboard")} // Rough check, since dashboard route renders HybridDashboard
                  />

                  <NavItem 
                      icon={Library} 
                      label="公開台本 (Gallery)" 
                      onClick={() => { navigate("/"); closeSidebarIfMobile(); }}
                      isActive={location.pathname === "/"}
                  />
                  <NavItem 
                      icon={LayoutTemplate} 
                      label="工作室 (Studio)" 
                      onClick={() => { navigate("/studio"); closeSidebarIfMobile(); }}
                      isActive={location.pathname === "/studio"}
                  />
              </div>
          </div>
      </div>

      {/* Footer Area */}
      <div className="p-3 shrink-0 bg-background/40 backdrop-blur-sm border-t border-border/40 space-y-1">
        
        {/* Secondary Actions */}
        <div className="space-y-0.5 mb-2 border-b border-border/40 pb-2">
             <NavItem 
                icon={Settings} 
                label="設定 (Settings)" 
                onClick={() => { openSettings(); closeSidebarIfMobile(); }} 
                className="h-8 text-xs"
             />
             <NavItem 
                icon={Info} 
                label="關於 (About)" 
                onClick={() => { openAbout(); closeSidebarIfMobile(); }} 
                className="h-8 text-xs"
             />
        </div>

        {/* User Profile */}
        <UserMenu />
      </div>
    </aside>
  );
}

export default Sidebar;
