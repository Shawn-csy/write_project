import React from "react";
import { 
  Settings, 
  Info, 
  Home,
  AlignLeft, 
  PanelLeftClose
} from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

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

  const handleHome = () => {
     if (openHome) openHome();
     onClose();
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/60 bg-muted/20">
        <div>
           <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={handleHome}>
             <h2 className={`text-lg font-bold tracking-tight uppercase ${accentStyle.label}`}>Screenplay Reader</h2>
           </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
           <PanelLeftClose className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content: Scene Outline or Menu */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        
        {/* Context Header */}
        <div className="px-4 py-3 bg-card/50 border-b border-border/60 flex items-center gap-2">
           {activeFile ? (
               <>
                 <AlignLeft className="h-4 w-4 text-muted-foreground" />
                 <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scene Outline</span>
                 <span className="ml-auto text-xs text-muted-foreground truncate max-w-[150px]">{activeFile}</span>
               </>
           ) : (
               <>
                 <Home className="h-4 w-4 text-muted-foreground" />
                 <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Navigation</span>
               </>
           )}
        </div>

        {/* Scene List */}
        <ScrollArea className="flex-1">
           <div className="p-2">
             {activeFile && sceneList.length > 0 ? (
                 <div className="flex flex-col gap-1">
                     {sceneList.map((scene) => (
                         <button
                           key={scene.id}
                           onClick={() => {
                               onSelectScene(scene.id);
                               onClose();
                           }}
                           className={`
                             w-full text-left px-4 py-3 rounded-md text-sm font-medium transition-colors border border-transparent
                             ${currentSceneId === scene.id 
                               ? `${accentStyle.fileActiveBg} ${accentStyle.fileActiveText} font-bold border-border/50 shadow-sm` 
                               : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                             }
                           `}
                         >
                            {scene.label}
                         </button>
                     ))}
                 </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4 text-center">
                   {activeFile ? (
                       <p className="text-sm">此劇本沒有場景標題</p>
                   ) : (
                       <div className="flex flex-col gap-4 w-full px-8">
                         <p className="text-sm">回到儀表板選擇劇本</p>
                         <Button onClick={handleHome} variant="outline" className="w-full">
                             Go to Dashboard
                         </Button>
                       </div>
                   )}
                </div>
             )}
           </div>
        </ScrollArea>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border/60 bg-muted/10 grid grid-cols-2 gap-3 shrink-0">
          <Button
            variant="ghost"
            className="flex items-center justify-start gap-2 h-10 px-4 rounded-lg border border-border/40 bg-background/50"
            onClick={() => {
              openAbout();
              onClose();
            }}
          >
            <Info className="h-4 w-4" />
            <span className="text-sm">關於</span>
          </Button>
          <Button
            variant="ghost"
            className="flex items-center justify-start gap-2 h-10 px-4 rounded-lg border border-border/40 bg-background/50"
            onClick={() => {
              openSettings();
              onClose();
            }}
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">設定</span>
          </Button>
      </div>
    </div>
  );
}

export default MobileMenu;
