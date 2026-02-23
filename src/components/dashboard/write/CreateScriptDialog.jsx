import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";
import { useI18n } from "../../../contexts/I18nContext";

export function CreateScriptDialog({
    open,
    onOpenChange,
    newType,
    newTitle,
    setNewTitle,
    handleCreate,
    creating,
    currentPath
}) {
    const { t } = useI18n();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{newType === 'folder' ? t("createDialog.newFolder") : t("createDialog.newScript")}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input 
                        placeholder={newType === 'folder' ? t("createDialog.folderName") : t("createDialog.scriptTitle")}
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        autoFocus
                    />
                     <p className="text-xs text-muted-foreground mt-2">
                        {t("createDialog.location").replace("{path}", currentPath)}
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
                    <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                        {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {t("createDialog.create")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
