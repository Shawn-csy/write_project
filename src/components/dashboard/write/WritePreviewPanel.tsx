import React from "react";
import { FileText, Folder } from "lucide-react";
import { Button } from "../../ui/button";
import { useI18n } from "../../../contexts/I18nContext";

/**
 * Shared preview content for a selected script/folder item.
 * Used in both the desktop sidebar and mobile drawer.
 */
export function WritePreviewContent({ previewItem, previewPath, readOnly, onOpen, onMove, onRename, onDelete, onToggleExpand, onClose }) {
  const { t } = useI18n();

  if (!previewItem) {
    return <p className="text-sm text-muted-foreground">{t("writeTab.previewHint")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {previewItem.type === "folder" ? (
          <Folder className="w-4 h-4 text-primary" />
        ) : (
          <FileText className="w-4 h-4 text-primary" />
        )}
        <p className="font-medium break-words">{previewItem.title}</p>
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p className="break-all">{t("writeTab.pathLabel").replace("{path}", previewPath)}</p>
        <p>{t("writeTab.typeLabel").replace("{type}", previewItem.type === "folder" ? t("writeTab.folder") : t("writeTab.file"))}</p>
        {previewItem.type !== "folder" && (
          <>
            <p>{t("writeTab.statusLabel").replace("{status}", previewItem.isPublic ? "Public" : "Private")}</p>
            <p>{t("writeTab.charCountApprox").replace("{count}", String(previewItem.contentLength ? Math.ceil(previewItem.contentLength / 2) : 0))}</p>
          </>
        )}
      </div>
      {!readOnly && (
        <div className="grid grid-cols-1 gap-2">
          {previewItem.type !== "folder" ? (
            <>
              <Button onClick={() => { onOpen(previewItem); onClose?.(); }}>
                {t("writeTab.openFile")}
              </Button>
              <Button variant="outline" onClick={() => { onMove(previewItem); onClose?.(); }}>
                {t("writeTab.moveTo")}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => { onToggleExpand(previewItem); onClose?.(); }}>
              {t("writeTab.openFolder")}
            </Button>
          )}
          <Button variant="outline" onClick={() => { onRename(previewItem); onClose?.(); }}>
            {t("writeTab.rename")}
          </Button>
          <Button
            variant="outline"
            className="border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.14)]"
            onClick={() => { onDelete(previewItem); onClose?.(); }}
          >
            {t("common.remove")}
          </Button>
        </div>
      )}
    </div>
  );
}
