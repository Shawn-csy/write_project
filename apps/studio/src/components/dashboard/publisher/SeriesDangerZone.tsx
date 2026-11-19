import React from "react";
import { Button } from "../../ui/button";

interface SeriesDangerZoneProps {
  seriesName: string;
  isSaving: boolean;
  onDeleteSeries: () => void;
}

export function SeriesDangerZone({
  seriesName,
  isSaving,
  onDeleteSeries,
}: SeriesDangerZoneProps): React.JSX.Element {
  const [confirming, setConfirming] = React.useState(false);

  const handleCancel = React.useCallback(() => setConfirming(false), []);

  return (
    <div className="border-t pt-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        危險操作
      </p>
      <p className="text-xs text-muted-foreground">
        刪除系列不會刪除已加入的作品，但會清除所有章節的系列關聯與排序。
      </p>

      {!confirming ? (
        <Button
          variant="outline"
          size="sm"
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={isSaving}
          onClick={() => setConfirming(true)}
        >
          刪除系列…
        </Button>
      ) : (
        <div className="rounded-md border border-destructive bg-destructive/5 px-3 py-3 space-y-2">
          <p className="text-xs font-medium text-destructive">
            確認刪除「{seriesName || "此系列"}」？此操作無法復原。
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={isSaving}
              onClick={() => {
                setConfirming(false);
                onDeleteSeries();
              }}
            >
              確認刪除
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={handleCancel}
            >
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
