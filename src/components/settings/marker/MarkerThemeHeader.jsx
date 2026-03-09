import React, { useMemo, useState } from "react";
import { Plus, Trash2, Share2, Settings2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { cn } from "../../../lib/utils";
import { PublicThemeDialog } from "./PublicThemeDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { useI18n } from "../../../contexts/I18nContext";

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
    currentUser,
    readOnly = false,
}) {
    const { t } = useI18n();
    const DEFAULT_THEME_ALIASES = new Set(["預設", "預設主題", "預設主題 (Default)", "default"]);
    const formatThemeName = (theme) => {
        if (!theme) return "";
        if (theme.id === "default") return "系統預設";
        const raw = String(theme.name || "").trim();
        const normalized = raw.toLowerCase();
        if (DEFAULT_THEME_ALIASES.has(raw) || DEFAULT_THEME_ALIASES.has(normalized)) {
            return `${raw}（自訂）`;
        }
        return raw || t("markerThemeHeader.theme");
    };

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
    const canDelete = markerThemes.length > 1 && currentTheme?.id !== "default";
    const publicityPrompt = useMemo(() => {
        if (!currentTheme) return "";
        if (currentTheme.id === "default") {
            return t("markerThemeHeader.publicityPromptDefault");
        }
        return currentTheme.isPublic
            ? t("markerThemeHeader.publicityPromptPrivate")
            : t("markerThemeHeader.publicityPromptPublic");
    }, [currentTheme, t]);

    const handleAddTheme = async () => {
        if (!newThemeName.trim()) return;
        const payload = {
            isPublic: newThemeIsPublic,
            description: newThemeDescription.trim(),
        };
        if (newThemeSource === "current") {
            await addThemeFromCurrent(newThemeName.trim(), payload);
        } else if (newThemeSource === "empty") {
            await addTheme(newThemeName.trim(), [], payload);
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
            await addThemeFromCurrent(t("markerThemeHeader.myThemeDefaultName"), true);
        } else {
            await updateThemePublicity(currentTheme.id, !currentTheme.isPublic);
        }
        setPublicityOpen(false);
    };

    return (
        <>
        <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
            <div className="flex flex-col gap-3">
                <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 w-full">
                        <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">{t("markerThemeHeader.currentTheme")}</span>
                        <select
                            className="h-8 flex-1 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                            value={currentThemeId}
                            onChange={(e) => switchTheme(e.target.value)}
                        >
                            {markerThemes.map((theme) => (
                                <option key={theme.id} value={theme.id}>{formatThemeName(theme)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="h-8 gap-1.5" disabled={readOnly}>
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-xs">{t("markerThemeHeader.newTheme")}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteOpen(true)}
                            className="h-8 gap-1.5 text-destructive border-destructive/40 hover:text-destructive"
                            disabled={!canDelete || readOnly}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-xs">{t("markerThemeHeader.delete")}</span>
                        </Button>
                        {!readOnly && <PublicThemeDialog />}
                        {currentUser && currentTheme && (
                            <Button
                                variant={currentTheme.isPublic ? "secondary" : "ghost"}
                                size="sm"
                                className={cn("h-8 px-2 gap-1.5", currentTheme.isPublic ? "text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300" : "text-muted-foreground")}
                                onClick={() => setPublicityOpen(true)}
                                title={currentTheme.isPublic ? t("markerThemeHeader.publicTitleOn") : t("markerThemeHeader.publicTitleOff")}
                                disabled={readOnly}
                            >
                                <Share2 className="w-3.5 h-3.5" />
                                <span className="text-xs">{currentTheme.isPublic ? t("markerThemeHeader.publicOn") : t("markerThemeHeader.publicOff")}</span>
                            </Button>
                        )}
                        {currentTheme && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 gap-1.5 text-muted-foreground"
                                onClick={() => setMoreOpen(true)}
                                disabled={readOnly}
                            >
                                <Settings2 className="w-3.5 h-3.5" />
                                <span className="text-xs">{t("markerThemeHeader.moreSettings")}</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("markerThemeHeader.moreTitle")}</DialogTitle>
                    <DialogDescription>{t("markerThemeHeader.moreDesc")}</DialogDescription>
                </DialogHeader>
                {currentTheme && (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("markerThemeHeader.descriptionLabel")}</label>
                            <Input
                                className="h-8 w-full text-xs bg-background/80"
                                placeholder={t("markerThemeHeader.descriptionPlaceholder")}
                                value={currentTheme.description || ""}
                                onChange={(e) => {
                                    updateThemeDescription(currentTheme.id, e.target.value);
                                }}
                                disabled={readOnly}
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
                                disabled={readOnly}
                            >
                                {t("markerThemeHeader.rename")}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setMoreOpen(false);
                                    setDeleteOpen(true);
                                }}
                                className="text-destructive hover:text-destructive"
                                disabled={!canDelete || readOnly}
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                {t("markerThemeHeader.delete")}
                            </Button>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setMoreOpen(false)}>{t("markerThemeHeader.done")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

       <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("markerThemeHeader.createTitle")}</DialogTitle>
                    <DialogDescription>{t("markerThemeHeader.createDesc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <Input
                        value={newThemeName}
                        onChange={(e) => setNewThemeName(e.target.value)}
                        placeholder={t("markerThemeHeader.namePlaceholder")}
                        autoFocus
                        disabled={readOnly}
                    />
                    <Input
                        value={newThemeDescription}
                        onChange={(e) => setNewThemeDescription(e.target.value)}
                        placeholder={t("markerThemeHeader.descOptionalPlaceholder")}
                        disabled={readOnly}
                    />
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t("markerThemeHeader.sourceLabel")}</label>
                        <select
                            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                            value={newThemeSource}
                            onChange={(e) => setNewThemeSource(e.target.value)}
                            disabled={readOnly}
                        >
                            <option value="current">{t("markerThemeHeader.sourceCurrent")}</option>
                            <option value="default">{t("markerThemeHeader.sourceDefault")}</option>
                            <option value="empty">空白建立</option>
                        </select>
                    </div>
                    {currentUser && (
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <input
                                type="checkbox"
                                checked={newThemeIsPublic}
                                onChange={(e) => setNewThemeIsPublic(e.target.checked)}
                                className="h-4 w-4 rounded border-input"
                                disabled={readOnly}
                            />
                            {t("markerThemeHeader.publicAfterCreate")}
                        </label>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
                    <Button onClick={handleAddTheme} disabled={!newThemeName.trim() || readOnly}>{t("markerThemeHeader.create")}</Button>
                </DialogFooter>
            </DialogContent>
       </Dialog>

       <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("markerThemeHeader.renameTitle")}</DialogTitle>
                    <DialogDescription>{t("markerThemeHeader.renameDesc")}</DialogDescription>
                </DialogHeader>
                <Input
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    placeholder={t("markerThemeHeader.namePlaceholder")}
                    autoFocus
                    disabled={readOnly}
                />
                <DialogFooter>
                    <Button variant="outline" onClick={() => setRenameOpen(false)}>{t("common.cancel")}</Button>
                    <Button onClick={handleRenameTheme} disabled={!renameName.trim() || readOnly}>{t("markerThemeHeader.save")}</Button>
                </DialogFooter>
            </DialogContent>
       </Dialog>

       <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("markerThemeHeader.deleteTitle")}</DialogTitle>
                    <DialogDescription>
                        {currentTheme
                          ? t("markerThemeHeader.deleteConfirmWithName").replace("{name}", currentTheme.name)
                          : t("markerThemeHeader.deleteConfirm")}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)}>{t("common.cancel")}</Button>
                    <Button variant="secondary" className="text-destructive" onClick={handleDeleteTheme} disabled={!canDelete || readOnly}>{t("markerThemeHeader.delete")}</Button>
                </DialogFooter>
            </DialogContent>
       </Dialog>

       <Dialog open={publicityOpen} onOpenChange={setPublicityOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{currentTheme?.isPublic ? t("markerThemeHeader.setPrivateTitle") : t("markerThemeHeader.setPublicTitle")}</DialogTitle>
                    <DialogDescription>{publicityPrompt}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setPublicityOpen(false)}>{t("common.cancel")}</Button>
                    <Button onClick={handleTogglePublicity} disabled={readOnly}>{t("markerThemeHeader.confirm")}</Button>
                </DialogFooter>
            </DialogContent>
       </Dialog>
       </>
    );
}
