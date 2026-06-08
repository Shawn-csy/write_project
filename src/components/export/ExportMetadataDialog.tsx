import React from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import type { ExportMetadataField, ExportMetadataFieldKey } from "../../lib/exportMetadata";

interface Props {
  open: boolean;
  fields: ExportMetadataField[];
  selectedKeys: ExportMetadataFieldKey[];
  onToggleKey: (key: ExportMetadataFieldKey, checked: boolean) => void;
  onSelectAll: () => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  isExporting?: boolean;
}

export function ExportMetadataDialog({
  open,
  fields,
  selectedKeys,
  onToggleKey,
  onSelectAll,
  onOpenChange,
  onConfirm,
  isExporting = false,
}: Props) {
  const uniqueFields = React.useMemo(() => {
    const seen = new Set<string>();
    return fields.filter((field) => {
      if (!field.value || seen.has(field.key)) return false;
      seen.add(field.key);
      return true;
    });
  }, [fields]);
  const selected = new Set(selectedKeys);
  const allChecked = uniqueFields.length > 0 && uniqueFields.every((field) => selected.has(field.key));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>確認匯出內容</DialogTitle>
          <DialogDescription>
            選擇要放在匯出文件最上方的資訊欄位。預設會全部匯出。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
            <Checkbox checked={allChecked} onCheckedChange={onSelectAll} />
            <span className="font-medium">全部資訊欄位</span>
          </label>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {uniqueFields.map((field) => (
              <label key={field.key} className="flex items-start gap-3 rounded-md border p-3 text-sm">
                <Checkbox
                  checked={selected.has(field.key)}
                  onCheckedChange={(checked) => onToggleKey(field.key, checked === true)}
                />
                <span>
                  <span className="block font-medium">{field.label}</span>
                  <span className="line-clamp-2 text-muted-foreground">{field.value}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            取消
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isExporting}>
            {isExporting ? "匯出中..." : "開始匯出"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
