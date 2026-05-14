import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { useI18n } from "../../../../contexts/I18nContext";

interface MarkerRow { marker: string; meaning: string; }
interface DetailRow { name: string; desc: string; sample: string; render: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markerRows: MarkerRow[];
  detailRows: DetailRow[];
  showFormatDetails: boolean;
  setShowFormatDetails: (v: boolean) => void;
}

export function ImportFormatGuideDialog({ open, onOpenChange, markerRows, detailRows, showFormatDetails, setShowFormatDetails }: Props) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("importDialog.formatQuickTitle")}</DialogTitle>
          <DialogDescription>{t("importDialog.formatQuickDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{t("publicHelp.importQuickItem1")}</p>
          <p>{t("publicHelp.importQuickItem2")}</p>
          <p>{t("publicHelp.importQuickItem3")}</p>
        </div>
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-[145px_1fr] bg-muted/40 text-xs font-medium">
            <div className="px-3 py-2 border-r">{t("importFormat.markerCol")}</div>
            <div className="px-3 py-2">{t("importFormat.meaningCol")}</div>
          </div>
          {markerRows.map(row => (
            <div key={row.marker} className="grid grid-cols-[145px_1fr] text-sm border-t">
              <div className="px-3 py-2 border-r font-mono">{row.marker}</div>
              <div className="px-3 py-2 text-muted-foreground">{row.meaning}</div>
            </div>
          ))}
        </div>
        {showFormatDetails && (
          <div className="rounded-lg border overflow-hidden max-h-[40vh] overflow-y-auto">
            <div className="grid grid-cols-[120px_1fr_140px_120px] bg-muted/40 text-xs font-medium">
              <div className="px-3 py-2 border-r">{t("importFormat.nameCol")}</div>
              <div className="px-3 py-2 border-r">{t("importFormat.descCol")}</div>
              <div className="px-3 py-2 border-r">{t("importFormat.sampleCol")}</div>
              <div className="px-3 py-2">{t("importFormat.renderCol")}</div>
            </div>
            {detailRows.map(row => (
              <div key={row.name} className="grid grid-cols-[120px_1fr_140px_120px] text-xs border-t">
                <div className="px-3 py-2 border-r font-medium">{row.name}</div>
                <div className="px-3 py-2 border-r text-muted-foreground">{row.desc}</div>
                <div className="px-3 py-2 border-r font-mono">{row.sample}</div>
                <div className="px-3 py-2 text-muted-foreground">{row.render}</div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => setShowFormatDetails(!showFormatDetails)}>
            {showFormatDetails ? t("common.hide", "收合") : t("importDialog.formatGuideDetail")}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
