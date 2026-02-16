import React from "react";
import { 
    Download, 
    FolderPlus, 
    Plus, 
    ArrowLeft, 
    Home, 
    ChevronRight,
    Upload
} from "lucide-react";
import { Button } from "../../ui/button";
import SearchBar from "../SearchBar";

export function ScriptToolbar({
    currentPath,
    breadcrumbs,
    onSelectScript,
    currentUser,
    readOnly,
    goUp,
    navigateTo,
    onExport,
    onImport,
    onCreateFolder,
    onCreateScript
}) {
    return (
        <div className="flex items-center justify-between mb-4 shrink-0 gap-2">
             <div className="flex-1 max-w-sm flex items-center gap-2">
                 {currentPath !== "/" && (
                     <Button variant="ghost" size="icon" onClick={goUp} title="回上一層" className="shrink-0">
                         <ArrowLeft className="w-4 h-4" />
                     </Button>
                 )}
                 <SearchBar onSelectResult={onSelectScript} />
             </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden px-2">
                {currentPath !== '/' && (
                <button 
                    onClick={() => navigateTo("/")}
                    className={`flex items-center hover:text-foreground transition-colors mr-1`}
                >
                    <Home className="w-4 h-4" />
                </button>
                )}
                {breadcrumbs.map((crumb, i) => (
                    <React.Fragment key={crumb.path}>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                        <div 
                            onClick={() => navigateTo(crumb.path)}
                            className={`hover:text-foreground transition-colors truncate cursor-pointer ${i === breadcrumbs.length - 1 ? 'text-foreground font-semibold' : ''}`}
                        >
                            {crumb.name}
                        </div>
                    </React.Fragment>
                ))}
            </div>

            {!readOnly && (
            <div className="flex items-center gap-1">
                 <Button size="icon" variant="ghost" onClick={() => onExport && onExport()} title="全部匯出 (Backup)">
                    <Download className="w-4 h-4" />
                 </Button>
                 <Button size="sm" variant="outline" onClick={() => onImport && onImport()} title="匯入台本" className="hidden sm:inline-flex">
                    <Upload className="w-4 h-4 mr-1" />
                    匯入
                 </Button>
                 <Button size="icon" variant="ghost" onClick={() => onImport && onImport()} title="匯入台本" className="sm:hidden">
                    <Upload className="w-4 h-4" />
                 </Button>
                 <div className="w-px h-4 bg-border/60 mx-1" />
                 <Button size="sm" variant="outline" onClick={onCreateFolder} title="新增資料夾" className="hidden md:inline-flex">
                    <FolderPlus className="w-4 h-4 mr-1" />
                    資料夾
                 </Button>
                 <Button size="icon" variant="ghost" onClick={onCreateFolder} title="新增資料夾" className="md:hidden">
                    <FolderPlus className="w-4 h-4" />
                 </Button>
                 <Button size="sm" onClick={onCreateScript} title="新增劇本" className="hidden sm:inline-flex">
                    <Plus className="w-4 h-4 mr-1" />
                    新增劇本
                 </Button>
                 <Button size="icon" onClick={onCreateScript} title="新增劇本" className="sm:hidden">
                    <Plus className="w-4 h-4" />
                 </Button>
            </div>
            )}
        </div>
    );
}
