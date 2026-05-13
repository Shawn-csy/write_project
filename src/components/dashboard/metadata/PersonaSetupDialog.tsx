import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";

export function PersonaSetupDialog({ t, open, onOpenChange, onGoProfile }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("scriptMetadataDialog.noPersonaYet", "尚未建立作者身份")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t("scriptMetadataDialog.goCreatePersonaDesc", "請先前往作者身份頁建立至少一位作者，再回來編輯與發布劇本。")}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "取消")}
          </Button>
          <Button type="button" onClick={onGoProfile}>
            {t("scriptMetadataDialog.goCreatePersona", "前往建立作者")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
