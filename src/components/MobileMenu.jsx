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

  // Recursive render similar to Sidebar but tailored for mobile
  const renderNode = (node, depth = 0) => {
    if (!node) return null;
    const isRoot = node.path === "__root__";
    const expanded = searchTerm ? true : openFolders?.has(node.path);
    const label = isRoot ? "根目錄" : node.name;
    const indentPx = 12 + depth * 12; // slightly less indent for mobile

    if (isRoot) {
        return (
          <div key={node.path} className="flex flex-col gap-1">
            {node.files?.map(file => (
               <Button
                 key={file.path}
                 variant="ghost"
                 className={`justify-start text-left h-auto py-3 px-3 w-full rounded-lg ${
                   activeFile === file.name 
                     ? `${accentStyle.fileActiveBg} ${accentStyle.fileActiveText} border-l-2 ${accentStyle.fileActiveBorder}` 
                     : "hover:bg-muted/50"
                 }`}
                 style={{ paddingLeft: `${indentPx + 8}px` }}
                 onClick={() => {
                   onSelectFile(file);
                   onClose();
                 }}
               >
                 <div className="flex flex-col gap-0.5 min-w-0">
                   <span className="font-medium truncate text-[15px]">
                      {fileTitleMap[file.name]?.trim() || file.name}
                   </span>
                   <span className="text-[11px] text-muted-foreground truncate opacity-70">
                     {file.name}
                   </span>
                 </div>
               </Button>
            ))}
            {node.children?.map(child => renderNode(child, depth))}
          </div>
        );
    }

    // Folder Node
    return (
      <div key={node.path} className="flex flex-col gap-1">
        <Button
          variant="ghost"
          className="justify-between text-left h-10 px-3 w-full rounded-lg hover:bg-muted/50"
          onClick={() => toggleFolder(node.path)}
          disabled={Boolean(searchTerm)}
          style={{ paddingLeft: `${indentPx}px` }}
        >
           <span className="font-semibold text-sm truncate">{label}</span>
           {expanded ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
        </Button>
        
        {expanded && (
           <div className="flex flex-col gap-1">
            {node.files?.map(file => (
               <Button
                 key={file.path}
                 variant="ghost"
                 className={`justify-start text-left h-auto py-3 px-3 w-full rounded-lg ${
                   activeFile === file.name 
                     ? `${accentStyle.fileActiveBg} ${accentStyle.fileActiveText} border-l-2 ${accentStyle.fileActiveBorder}` 
                     : "hover:bg-muted/50"
                 }`}
                 style={{ paddingLeft: `${indentPx + 16}px` }}
                 onClick={() => {
                   onSelectFile(file);
                   onClose();
                 }}
               >
                 <div className="flex flex-col gap-0.5 min-w-0">
                   <span className="font-medium truncate text-[15px]">
                      {fileTitleMap[file.name]?.trim() || file.name}
                   </span>
                   <span className="text-[11px] text-muted-foreground truncate opacity-70">
                     {file.name}
                   </span>
                 </div>
               </Button>
            ))}
            {node.children?.map(child => renderNode(child, depth + 1))}
           </div>
        )}
      </div>
    );
  };

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
                 {renderNode(fileTree)}
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
