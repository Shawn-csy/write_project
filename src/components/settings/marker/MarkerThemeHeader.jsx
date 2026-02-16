import React, { useMemo, useState } from "react";
import { Plus, Trash2, Share2, Copy, Settings2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { cn } from "../../../lib/utils";
import { PublicThemeDialog } from "./PublicThemeDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";

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
    const [newThemeName, setNewThemeName] = useState("");
    const [newThemeDescription, setNewThemeDescription] = useState("");
    const [newThemeSource, setNewThemeSource] = useState("current");
    const [newThemeIsPublic, setNewThemeIsPublic] = useState(false);
    const [renameName, setRenameName] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [publicityOpen, setPublicityOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const canDelete = markerThemes.length > 1;
    const publicityPrompt = useMemo(() => {
        if (!currentTheme) return "";
        if (currentTheme.id === "default") {
            return "這會複製目前預設設定並建立一個新的公開主題，未來修改會同步到該主題。";
        }
        return currentTheme.isPublic
            ? "確定要將此主題設為私人嗎？其他人將無法再搜尋到它。"
            : "確定要公開此主題嗎？所有人都可以搜尋並使用它。";
    }, [currentTheme]);

    const handleAddTheme = async () => {
        if (!newThemeName.trim()) return;
        const payload = {
            isPublic: newThemeIsPublic,
            description: newThemeDescription.trim(),
        };
        if (newThemeSource === "current") {
            await addThemeFromCurrent(newThemeName.trim(), payload);
        } else {
            await addTheme(newThemeName.trim(), payload);
        }
        setCreateOpen(false);
        setNewThemeName("");
        setNewThemeDescription("");
        setNewThemeSource("current");
        setNewThemeIsPublic(false);
    };

    const handleCreateOpenChange = (next) => {
        setCreateOpen(next);
        if (!next) {
            setNewThemeName("");
            setNewThemeDescription("");
            setNewThemeSource("current");
            setNewThemeIsPublic(false);
        }
    };

    const handleRenameTheme = async () => {
        if (!currentTheme) return;
        if (!renameName.trim()) return;
        await renameTheme(currentTheme.id, renameName.trim());
        setRenameOpen(false);
    };

    const handleDeleteTheme = async () => {
        if (!currentTheme) return;
        await deleteTheme(currentTheme.id);
        setDeleteOpen(false);
    };

    const handleTogglePublicity = async () => {
        if (!currentTheme) return;
        if (currentTheme.id === "default") {
            await addThemeFromCurrent("我的標記主題", true);
        } else {
            await updateThemePublicity(currentTheme.id, !currentTheme.isPublic);
        }
        setPublicityOpen(false);
    };

    const handleDuplicateTheme = async () => {
        const baseName = currentTheme?.name || "主題";
        await addThemeFromCurrent(`${baseName} 副本`, false);
    };

    return (
        <>
        <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
            <div className="flex flex-col gap-3">
                <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 w-full">
                        <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">目前主題</span>
                        <select
                            className="h-8 flex-1 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                            value={currentThemeId}
                            onChange={(e) => switchTheme(e.target.value)}
                        >
                            {markerThemes.map((theme) => (
                                <option key={theme.id} value={theme.id}>{theme.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="h-8 gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-xs">新建主題</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDuplicateTheme} className="h-8 gap-1.5">
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-xs">複製目前主題</span>
                        </Button>
                        <PublicThemeDialog />
                        {currentUser && currentTheme && (
                            <Button
                                variant={currentTheme.isPublic ? "secondary" : "ghost"}
                                size="sm"
                                className={cn("h-8 px-2 gap-1.5", currentTheme.isPublic ? "text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300" : "text-muted-foreground")}
                                onClick={() => setPublicityOpen(true)}
                                title={currentTheme.isPublic ? "已公開，點擊改為私人" : "點擊公開目前主題"}
                            >
                                <Share2 className="w-3.5 h-3.5" />
                                <span className="text-xs">{currentTheme.isPublic ? "已公開" : "設為公開"}</span>
                            </Button>
                        )}
                        {currentTheme && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 gap-1.5 text-muted-foreground"
                                onClick={() => setMoreOpen(true)}
                            >
                                <Settings2 className="w-3.5 h-3.5" />
                                <span className="text-xs">更多設定</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>主題更多設定</DialogTitle>
                    <DialogDescription>編輯描述或進行主題管理操作。</DialogDescription>
                </DialogHeader>
                {currentTheme && (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">描述</label>
                            <Input
                                className="h-8 w-full text-xs bg-background/80"
                                placeholder="可輸入主題用途，方便自己與他人辨識"
                                value={currentTheme.description || ""}
                                onChange={(e) => {
                                    updateThemeDescription(currentTheme.id, e.target.value);
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setRenameName(currentTheme?.name || "");
                                    setMoreOpen(false);
                                    setRenameOpen(true);
                                }}
                            >
                                改名
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setMoreOpen(false);
                                    setDeleteOpen(true);
                                }}
                                className="text-destructive hover:text-destructive"
                                disabled={!canDelete}
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                刪除
                            </Button>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setMoreOpen(false)}>完成</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

       <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>新增主題</DialogTitle>
                    <DialogDescription>建立一個新的 Marker 主題，並設定初始來源。</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <Input
                        value={newThemeName}
                        onChange={(e) => setNewThemeName(e.target.value)}
                        placeholder="主題名稱"
                        autoFocus
                    />
                    <Input
                        value={newThemeDescription}
                        onChange={(e) => setNewThemeDescription(e.target.value)}
                        placeholder="主題描述（可選）"
                    />
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">建立來源</label>
                        <select
                            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                            value={newThemeSource}
                            onChange={(e) => setNewThemeSource(e.target.value)}
                        >
                            <option value="current">從目前主題複製</option>
                            <option value="default">從預設主題建立</option>
                        </select>
                    </div>
                    {currentUser && (
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <input
                                type="checkbox"
                                checked={newThemeIsPublic}
                                onChange={(e) => setNewThemeIsPublic(e.target.checked)}
                                className="h-4 w-4 rounded border-input"
                            />
                            建立後立即設為公開主題
                        </label>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
                    <Button onClick={handleAddTheme} disabled={!newThemeName.trim()}>建立</Button>
                </DialogFooter>
            </DialogContent>
       </Dialog>

       <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>重新命名主題</DialogTitle>
                    <DialogDescription>更新目前主題的名稱。</DialogDescription>
                </DialogHeader>
                <Input
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    placeholder="主題名稱"
                    autoFocus
                />
                <DialogFooter>
                    <Button variant="outline" onClick={() => setRenameOpen(false)}>取消</Button>
                    <Button onClick={handleRenameTheme} disabled={!renameName.trim()}>儲存</Button>
                </DialogFooter>
            </DialogContent>
       </Dialog>

       <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>刪除主題</DialogTitle>
                    <DialogDescription>
                        {currentTheme ? `確定要刪除主題「${currentTheme.name}」嗎？此動作無法復原。` : "確定刪除主題？"}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)}>取消</Button>
                    <Button variant="secondary" className="text-destructive" onClick={handleDeleteTheme} disabled={!canDelete}>刪除</Button>
                </DialogFooter>
            </DialogContent>
       </Dialog>

       <Dialog open={publicityOpen} onOpenChange={setPublicityOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{currentTheme?.isPublic ? "設為私人主題" : "設為公開主題"}</DialogTitle>
                    <DialogDescription>{publicityPrompt}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setPublicityOpen(false)}>取消</Button>
                    <Button onClick={handleTogglePublicity}>確認</Button>
                </DialogFooter>
            </DialogContent>
       </Dialog>
       </>
    );
}
