import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";
import { useI18n } from "../../../contexts/I18nContext";

export function RenameScriptDialog({
    open,
    onOpenChange,
    type,
    oldName,
    newName,
    setNewName,
    handleRename,
    renaming
}) {
    const { t } = useI18n();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{type === 'folder' ? t("renameDialog.folderTitle") : t("renameDialog.scriptTitle")}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input 
                        placeholder={type === 'folder' ? t("renameDialog.folderName") : t("renameDialog.scriptName")}
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRename()}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
                    <Button onClick={handleRename} disabled={renaming || !newName.trim() || newName === oldName}>
                        {renaming && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {t("renameDialog.confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
