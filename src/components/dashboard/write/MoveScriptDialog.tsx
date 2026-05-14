import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";
import { useI18n } from "../../../contexts/I18nContext";

interface WriteItem {
    id: string;
    title: string;
    type?: string;
}

interface MoveScriptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: WriteItem | null;
    availableFolders: string[];
    targetFolder: string;
    setTargetFolder: (path: string) => void;
    moving: boolean;
    onConfirm: () => void;
}

function normalizePath(path: string) {
    return path === "/" ? "/" : (path || "/");
}

export function MoveScriptDialog({
    open,
    onOpenChange,
    item,
    availableFolders,
    targetFolder,
    setTargetFolder,
    moving,
    onConfirm
}: MoveScriptDialogProps) {
    const { t } = useI18n();
    const disabled = !item || item.type === "folder";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("moveDialog.title")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                    <p>
                        {t("moveDialog.file").replace("{name}", item?.title || "-")}
                    </p>
                    {disabled ? (
                        <p className="text-muted-foreground">{t("moveDialog.folderUnsupported")}</p>
                    ) : (
                        <div>
                            <label className="block mb-1 text-muted-foreground">{t("moveDialog.targetFolder")}</label>
                            <select
                                className="w-full h-9 rounded-md border border-input bg-background px-2"
                                value={normalizePath(targetFolder)}
                                onChange={(e) => setTargetFolder(e.target.value)}
                            >
                                {availableFolders.map((folder) => (
                                    <option key={folder} value={folder}>
                                        {folder}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={moving}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={onConfirm} disabled={moving || disabled}>
                        {moving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {t("moveDialog.confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
