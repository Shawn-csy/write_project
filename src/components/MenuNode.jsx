import React, { memo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";

const MenuNode = memo(({
  node,
  depth = 0,
  searchTerm,
  openFolders,
  toggleFolder,
  activeFile,
  onSelectFile,
  onClose,
  fileTitleMap,
  accentStyle
}) => {
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
        {node.children?.map(child => (
          <MenuNode
            key={child.path}
            node={child}
            depth={depth}
            searchTerm={searchTerm}
            openFolders={openFolders}
            toggleFolder={toggleFolder}
            activeFile={activeFile}
            onSelectFile={onSelectFile}
            onClose={onClose}
            fileTitleMap={fileTitleMap}
            accentStyle={accentStyle}
          />
        ))}
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
          {node.children?.map(child => (
            <MenuNode
              key={child.path}
              node={child}
              depth={depth + 1}
              searchTerm={searchTerm}
              openFolders={openFolders}
              toggleFolder={toggleFolder}
              activeFile={activeFile}
              onSelectFile={onSelectFile}
              onClose={onClose}
              fileTitleMap={fileTitleMap}
              accentStyle={accentStyle}
            />
          ))}
         </div>
      )}
    </div>
  );
});

export default MenuNode;
