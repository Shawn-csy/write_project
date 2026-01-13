import React from "react";
import { Plus, Trash2, Share2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { cn } from "../../../lib/utils";
import { PublicThemeDialog } from "./PublicThemeDialog";

export function MarkerThemeHeader({
    markerThemes, 
    currentThemeId, 
    switchTheme, 
    addTheme, 
    addThemeFromCurrent, 
    deleteTheme, 
    renameTheme, 
    updateThemeDescription, 
    updateThemePublicity,
    currentUser
}) {
    const currentTheme = markerThemes.find(t => t.id === currentThemeId);

    const handleAddTheme = () => {
        const name = prompt("請輸入新主題名稱 (Theme Name):", "New Theme");
        if (name) addTheme(name);
    };

    const handleRenameTheme = () => {
        if (!currentTheme) return;
        const name = prompt("重新命名主題 (Rename Theme):", currentTheme.name);
        if (name) renameTheme(currentTheme.id, name);
    };

    const handleDeleteTheme = () => {
        if (!currentTheme) return;
        if (confirm(`確定要刪除主題 "${currentTheme.name}" 嗎？此動作無法復原。`)) {
            deleteTheme(currentTheme.id);
        }
    };

    return (
        <div className="mb-4 p-3 bg-muted/40 rounded-lg border border-border/50">
            <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 w-full">
                        <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">主題 (Theme):</span>
                        <select 
                            className="h-8 flex-1 sm:max-w-[200px] rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                            value={currentThemeId}
                            onChange={(e) => switchTheme(e.target.value)}
                        >
                            {markerThemes.map(theme => (
                                <option key={theme.id} value={theme.id}>{theme.name}</option>
                            ))}
                        </select>
                        
                        {/* Public Toggle */}
                        {currentUser && currentTheme && (
                            <Button 
                                variant={currentTheme.isPublic ? "secondary" : "ghost"}
                                size="sm"
                                className={cn("h-8 px-2 gap-1", currentTheme.isPublic ? "text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300" : "text-muted-foreground")}
                                onClick={() => {
                                    if (currentTheme.id === 'default') {
                                        if (confirm("這將會把目前的預設設定轉為「公開主題」以便分享，且未來的修改將會自動同步。確定嗎？")) {
                                            addThemeFromCurrent("我的標記主題", true);
                                        }
                                    } else {
                                        if (confirm(currentTheme.isPublic ? "確定要將此主題設為私人嗎？其他人將無法再搜尋到它。" : "確定要公開此主題嗎？所有人都可以搜尋並使用它。")) {
                                            updateThemePublicity(currentTheme.id, !currentTheme.isPublic);
                                        }
                                    }
                                }}
                                title={currentTheme.isPublic ? "已公開 (點擊改為私人)" : "點擊將此主題設為公開"}
                            >
                                <Share2 className="w-3.5 h-3.5" />
                                <span className="text-xs hidden sm:inline">{currentTheme.isPublic ? "Public" : "Share"}</span>
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-1 w-full sm:w-auto ml-auto">
                        <PublicThemeDialog />
                        <div className="w-px h-4 bg-border mx-1"></div>
                        <Button variant="ghost" size="sm" onClick={handleRenameTheme} className="h-8 px-2" title="重新命名">
                            <span className="text-xs">改名</span>
                        </Button>
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleDeleteTheme} 
                            className="h-8 px-2 text-destructive hover:text-destructive" 
                            disabled={markerThemes.length <= 1}
                            title="刪除主題"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <div className="w-px h-4 bg-border mx-1"></div>
                        <Button variant="outline" size="sm" onClick={handleAddTheme} className="h-8 gap-1">
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-xs">新主題</span>
                        </Button>
                    </div>
                </div>
                {/* Description Field */}
                {currentTheme && (
                    <div className="flex items-center gap-2">
                         <span className="text-[10px] text-muted-foreground w-12 shrink-0">描述:</span>
                         <Input 
                            className="h-6 w-full text-[10px] bg-transparent border-transparent hover:border-input focus:border-input px-1"
                            placeholder="為此主題添加描述 (有助於他人搜尋)"
                            value={currentTheme.description || ""}
                            onChange={(e) => {
                                updateThemeDescription(currentTheme.id, e.target.value);
                             }}
                         />
                    </div>
                )}
            </div>
       </div>
    );
}
