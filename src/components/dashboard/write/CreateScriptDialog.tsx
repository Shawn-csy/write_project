import React from "react";
import { useI18n } from "../../../contexts/I18nContext";
import { ScriptNameDialog } from "./ScriptNameDialog";

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
        <ScriptNameDialog
            open={open}
            onOpenChange={onOpenChange}
            title={newType === "folder" ? t("createDialog.newFolder") : t("createDialog.newScript")}
            placeholder={newType === "folder" ? t("createDialog.folderName") : t("createDialog.scriptTitle")}
            value={newTitle}
            setValue={setNewTitle}
            onConfirm={handleCreate}
            cancelText={t("common.cancel")}
            confirmText={t("createDialog.create")}
            confirmDisabled={creating || !newTitle.trim()}
            loading={creating}
            helperText={t("createDialog.location").replace("{path}", currentPath)}
        />
    );
}
