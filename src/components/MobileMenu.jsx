import React from "react";
import { 
  Settings, 
  Info, 
  Home,
  AlignLeft, 
  PanelLeftClose,
  PenBox
} from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import UserMenu from "./auth/UserMenu";

function MobileMenu({
  // Scene Props
  sceneList = [],
  currentSceneId,
  onSelectScene,
  
  // Navigation
  activeFile,
  openAbout,
  openSettings,
  openHome, // handleReturnHome
  onClose,
  accentStyle
}) {
  const [activeTab, setActiveTab] = React.useState(activeFile ? "outline" : "menu");

  const handleHome = () => {
     if (openHome) openHome();
     onClose();
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
           <Button variant="ghost" className="p-0 hover:bg-transparent h-auto" onClick={handleHome}>
             <div className="flex flex-col items-start leading-none">
                <h2 className={`text-base font-bold tracking-tight uppercase ${accentStyle.label}`}>Screenplay</h2>
                <span className="text-[10px] text-muted-foreground tracking-widest pl-[1px]">READER</span>
             </div>
           </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
           <PanelLeftClose className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs Switcher */}
      <div className="p-2 grid grid-cols-2 gap-1 border-b border-border/60 shrink-0">
          <button
              onClick={() => setActiveTab("menu")}
              className={`py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "menu" 
                  ? "bg-muted text-foreground" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
          >
              導覽 (Menu)
          </button>
          <button
              onClick={() => setActiveTab("outline")}
              className={`py-2 text-sm font-medium rounded-md transition-colors relative ${
                  activeTab === "outline" 
                  ? "bg-muted text-foreground" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              } ${!activeFile ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!activeFile}
          >
              大綱 (Outline)
              {activeFile && <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-primary/80" />}
          </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        
        {activeTab === "outline" ? (
             /* --- OUTLINE TAB --- */
             <>
                <div className="px-4 py-2 bg-card/50 border-b border-border/60 flex items-center gap-2 shrink-0">
                   <AlignLeft className="h-4 w-4 text-muted-foreground" />
                   <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scene List</span>
                   <span className="ml-auto text-xs text-muted-foreground truncate max-w-[150px]">
                      {typeof activeFile === 'object' ? activeFile.name : activeFile}
                   </span>
                </div>
                <ScrollArea className="flex-1">
                   <div className="p-2">
                     {sceneList.length > 0 ? (
                         <div className="flex flex-col gap-0.5">
                             {sceneList.map((scene) => (
                                 <button
                                   key={scene.id}
                                   onClick={() => {
                                       onSelectScene(scene.id);
                                       onClose();
                                   }}
                                   className={`
                                     w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors border-l-2
                                     ${currentSceneId === scene.id 
                                       ? `${accentStyle.border} ${accentStyle.fileActiveBg} font-medium text-foreground` 
                                       : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                     }
                                   `}
                                 >
                                    <span className="line-clamp-1">{scene.label}</span>
                                 </button>
                             ))}
                         </div>
                     ) : (
                        <div className="py-12 text-center text-muted-foreground text-sm">
                           此劇本沒有場景標題
                        </div>
                     )}
                   </div>
                </ScrollArea>
             </>
        ) : (
             /* --- MENU TAB --- */
             <ScrollArea className="flex-1">
                 <div className="p-4 space-y-4">
                     <div className="space-y-1">
                         <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">快速導航</div>
                         <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base" onClick={handleHome}>
                             <Home className="w-5 h-5 text-muted-foreground" />
                             閱讀 (Read)
                         </Button>
                         <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base" onClick={handleHome}>
                             <PenBox className="w-5 h-5 text-muted-foreground" />
                             寫作 (Write)
                         </Button>
                     </div>

                     <Separator />

                     <div className="space-y-1">
                         <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">應用程式</div>
                         <Button variant="ghost" className="w-full justify-start gap-3 h-12" onClick={() => { openAbout(); onClose(); }}>
                             <Info className="w-5 h-5 text-muted-foreground" />
                             關於 (About)
                         </Button>
                         <Button variant="ghost" className="w-full justify-start gap-3 h-12" onClick={() => { openSettings(); onClose(); }}>
                             <Settings className="w-5 h-5 text-muted-foreground" />
                             設定 (Settings)
                         </Button>
                     </div>
                 </div>
             </ScrollArea>
        )}

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
