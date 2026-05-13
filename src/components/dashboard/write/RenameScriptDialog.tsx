import React from "react";
import { useI18n } from "../../../contexts/I18nContext";
import { ScriptNameDialog } from "./ScriptNameDialog";

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
        <ScriptNameDialog
            open={open}
            onOpenChange={onOpenChange}
            title={type === "folder" ? t("renameDialog.folderTitle") : t("renameDialog.scriptTitle")}
            placeholder={type === "folder" ? t("renameDialog.folderName") : t("renameDialog.scriptName")}
            value={newName}
            setValue={setNewName}
            onConfirm={handleRename}
            cancelText={t("common.cancel")}
            confirmText={t("renameDialog.confirm")}
            confirmDisabled={renaming || !newName.trim() || newName === oldName}
            loading={renaming}
        />
    );
}
