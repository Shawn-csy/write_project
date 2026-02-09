import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Settings, 
  Info, 
  PanelLeftClose,
  Library,
  PencilLine,
  LayoutTemplate,
  AlignLeft,
  ChevronLeft
} from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import UserMenu from "../auth/UserMenu";

function MobileMenu({
  // Scene Props
  sceneList = [],
  currentSceneId,
  onSelectScene,
  
  // Navigation
  // activeFile, // Removed
  openAbout,
  openSettings,
  openHome, // handleReturnHome
  onClose,
  accentStyle
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const handleHome = () => {
     if (openHome) openHome();
     navigate("/dashboard");
     onClose();
  };

  const NavItem = ({ icon: Icon, label, onClick, isActive, className = "" }) => (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`
        w-full justify-start gap-3 h-12 text-base font-normal
        ${isActive 
          ? "bg-primary/10 text-primary font-medium" 
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        }
        ${className}
      `}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="truncate">{label}</span>
    </Button>
  );

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
           <Button variant="ghost" className="p-0 hover:bg-transparent h-auto" onClick={handleHome}>
             <div className="flex flex-col items-start leading-none">
                <h2 className={`text-base font-bold tracking-tight uppercase ${accentStyle?.label || "text-primary"}`}>Screenplay</h2>
                <span className="text-[10px] text-muted-foreground tracking-widest pl-[1px]">READER</span>
             </div>
           </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
           <PanelLeftClose className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
         <ScrollArea className="flex-1">
             <div className="p-4 space-y-6">
                 <div className="space-y-1">
                     <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">快速導航</div>
                     
                     <NavItem 
                         icon={PencilLine} 
                         label="閱讀與寫作 (Workspace)" 
                         onClick={handleHome}
                         isActive={location.pathname.includes("/dashboard")}
                     />

                     <NavItem 
                         icon={Library} 
                         label="公開台本 (Gallery)" 
                         onClick={() => { navigate("/"); onClose(); }}
                         isActive={location.pathname === "/"}
                     />
                     
                     <NavItem 
                         icon={LayoutTemplate} 
                         label="工作室 (Studio)" 
                         onClick={() => { navigate("/studio"); onClose(); }}
                         isActive={location.pathname === "/studio"}
                     />
                 </div>

                 <Separator />

                 <div className="space-y-1">
                     <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">應用程式</div>
                     <NavItem 
                         icon={Info} 
                         label="關於 (About)" 
                         onClick={() => { openAbout(); onClose(); }} 
                     />
                     <NavItem 
                         icon={Settings} 
                         label="設定 (Settings)" 
                         onClick={() => { openSettings(); onClose(); }} 
                     />
                 </div>
             </div>
         </ScrollArea>
      </div>
      
      {/* Footer: User Login/Profile */}
      <div className="p-3 border-t border-border/60 bg-background/80 backdrop-blur-sm shrink-0">
          <UserMenu 
              openSettings={() => { openSettings(); onClose(); }} 
              openAbout={() => { openAbout(); onClose(); }}
          />
      </div>
    </div>
  );
}

export default MobileMenu;
