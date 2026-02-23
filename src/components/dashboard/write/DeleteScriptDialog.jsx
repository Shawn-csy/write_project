import React, { useMemo } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";
import { useI18n } from "../../../contexts/I18nContext";

function buildPath(item) {
    if (!item) return "/";
    const parent = item.folder === "/" ? "" : item.folder;
    return `${parent}/${item.title}`;
}

export function DeleteScriptDialog({
    open,
    onOpenChange,
    item,
    scripts,
    deleting,
    onConfirm
}) {
    const { t } = useI18n();
    const childCount = useMemo(() => {
        if (!item || item.type !== "folder") return 0;
        const prefix = buildPath(item);
        return scripts.filter(s => s.folder === prefix || s.folder.startsWith(prefix + "/")).length;
    }, [item, scripts]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-4 h-4" />
                        {t("deleteDialog.title").replace("{type}", item?.type === "folder" ? t("writeTab.folder") : t("writeTab.file"))}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                    <p>
                        {t("deleteDialog.deleting").replace("{name}", item?.title || "-")}
                    </p>
                    <p className="text-muted-foreground">{t("deleteDialog.path").replace("{path}", item ? buildPath(item) : "/")}</p>
                    {item?.type === "folder" && (
                        <p className="text-destructive">
                            {t("deleteDialog.folderWarning").replace("{count}", String(childCount))}
                        </p>
                    )}
                    {item?.type !== "folder" && (
                        <p className="text-destructive">{t("deleteDialog.warning")}</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
                        {t("common.cancel")}
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={deleting || !item}>
                        {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {t("deleteDialog.confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
