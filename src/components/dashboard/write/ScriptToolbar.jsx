import React from "react";
import { 
    Plus,
    Upload,
    FolderPlus,
    ArrowLeft, 
    Home, 
    ChevronRight
} from "lucide-react";
import { Button } from "../../ui/button";
import { useI18n } from "../../../contexts/I18nContext";

export function ScriptToolbar({
    currentPath,
    breadcrumbs,
    readOnly,
    goUp,
    navigateTo,
    onExport,
    onImport,
    onCreateFolder,
    onCreateScript
}) {
    const { t } = useI18n();
    return (
        <div className="flex items-center justify-between mb-4 shrink-0 gap-2">
             <div className="flex-1 min-w-0 flex items-center gap-2">
                 {currentPath !== "/" && (
                     <Button variant="ghost" size="icon" onClick={goUp} title={t("scriptToolbar.back")} className="shrink-0">
                         <ArrowLeft className="w-4 h-4" />
                     </Button>
                 )}
                 <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden px-1">
                    {currentPath !== '/' && (
                    <button 
                        onClick={() => navigateTo("/")}
                        className="flex items-center hover:text-foreground transition-colors mr-1"
                        title="/"
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
                                title={crumb.path}
                            >
                                {crumb.name}
                            </div>
                        </React.Fragment>
                    ))}
                 </div>
            </div>

            {!readOnly && (
            <div className="flex items-center gap-1">
                 <Button size="sm" onClick={onCreateScript} title={t("scriptToolbar.newScript")} className="inline-flex">
                    <Plus className="w-4 h-4 mr-1" />
                    {t("scriptToolbar.newScriptLabel")}
                 </Button>
                 <Button size="sm" variant="outline" onClick={() => onImport && onImport()} title={t("scriptToolbar.importScript")} className="inline-flex">
                    <Upload className="w-4 h-4 mr-1" />
                    {t("scriptToolbar.import")}
                 </Button>
                 <Button size="sm" variant="outline" onClick={onCreateFolder} title={t("scriptToolbar.newFolder")} className="inline-flex">
                    <FolderPlus className="w-4 h-4 mr-1" />
                    {t("scriptToolbar.folder")}
                 </Button>
            </div>
            )}
        </div>
    );
}
