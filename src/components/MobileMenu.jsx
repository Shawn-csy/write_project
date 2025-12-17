import React, { useState } from "react";
import { 
  Settings, 
  Info, 
  FileText, 
  ChevronRight,
  ChevronDown,
  BookOpen
} from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import MenuNode from "./MenuNode";

function MobileMenu({
  fileTree,
  activeFile,
  onSelectFile,
  accentStyle,
  openAbout,
  openSettings,
  onClose,
  fileTitleMap,
  searchTerm,
  onSearchChange,
  openFolders,
  toggleFolder
}) {
  const [showFiles, setShowFiles] = useState(false);

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header & Actions Compact Row */}
      <div className="flex items-center justify-between p-4 border-b border-border/60 bg-muted/20">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Menu</h2>
        </div>
        <div className="flex items-center gap-2">
           <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 h-9"
            onClick={() => {
              openSettings();
              onClose();
            }}
          >
            <Settings className="h-4 w-4" />
            <span className="text-xs">設定</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
             className="flex items-center gap-1.5 h-9"
            onClick={() => {
              openAbout();
              onClose();
            }}
          >
            <Info className="h-4 w-4" />
            <span className="text-xs">關於</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-4 pt-4 pb-6 overflow-y-auto">
        {/* Search & Script List */}
        <div className="flex flex-col gap-2 flex-1">
           {/* Search Input */}
           <div className="mb-2">
              <input
                value={searchTerm || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="搜尋檔案或資料夾..."
                className={`w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none ${accentStyle.focusRing}`}
              />
           </div>
           
           <div className="rounded-xl border border-border/60 bg-card overflow-hidden flex-1 min-h-[50vh]">
             <ScrollArea className="h-full">
               <div className="p-2 flex flex-col gap-1">
                 <MenuNode
                   node={fileTree}
                   depth={0}
                   searchTerm={searchTerm}
                   openFolders={openFolders}
                   toggleFolder={toggleFolder}
                   activeFile={activeFile}
                   onSelectFile={onSelectFile}
                   onClose={onClose}
                   fileTitleMap={fileTitleMap}
                   accentStyle={accentStyle}
                 />
                 {(!fileTree || (fileTree.files.length === 0 && fileTree.children.length === 0 && fileTree.children.size === 0)) && (
                   <div className="p-8 text-center text-muted-foreground text-sm">
                     {searchTerm ? "未找到符合的檔案" : "無與劇本檔案"}
                   </div>
                 )}
               </div>
             </ScrollArea>
           </div>
        </div>
      </div>
    </div>
  );
}

export default MobileMenu;
