import React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { PublisherFormRow } from "./PublisherFormRow";
import {
  detectOrderConflicts,
  normalizeEditableSeriesOrder,
} from "../../../lib/publisher/seriesEditorModel";
import type { SeriesChapterRow } from "../../../lib/publisher/seriesEditorModel";
import type { BaseScriptApi } from "../../../types/api";

interface SeriesChapterManagerProps {
  seriesId: string;
  seriesScripts: SeriesChapterRow[];
  attachableScripts: BaseScriptApi[];
  onDetachScript?: (scriptId: string, seriesId: string) => void;
  onAttachScript?: (scriptId: string, seriesId: string, order: number | null) => void;
  onReorderScript?: (scriptId: string, order: number | null) => void;
  onBatchReorderScripts?: (seriesId: string, currentRows: SeriesChapterRow[], targetOrders: Map<string, number | null>) => void;
}

export function SeriesChapterManager({
  seriesId,
  seriesScripts,
  attachableScripts,
  onDetachScript,
  onAttachScript,
  onReorderScript,
  onBatchReorderScripts,
}: SeriesChapterManagerProps): React.JSX.Element {
  const [attachScriptId, setAttachScriptId] = React.useState<string>("");
  const [attachOrder, setAttachOrder] = React.useState<string>("");
  const [attachOrderError, setAttachOrderError] = React.useState<string>("");
  const [pendingOrders, setPendingOrders] = React.useState<Record<string, string>>({});
  const [orderErrors, setOrderErrors] = React.useState<Record<string, string>>({});

  const conflicts = React.useMemo(() => detectOrderConflicts(seriesScripts), [seriesScripts]);
  const conflictOrders = React.useMemo(
    () => new Set(conflicts.map((c) => c.order)),
    [conflicts]
  );
  const missingOrderCount = seriesScripts.filter((r) => r.isMissingOrder).length;

  const handleMove = React.useCallback((index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= seriesScripts.length) return;
    const a = seriesScripts[index];
    const b = seriesScripts[targetIndex];
    if (a.seriesOrder === null || b.seriesOrder === null) return;
    const targetOrders = new Map<string, number | null>([
      [a.id, b.seriesOrder],
      [b.id, a.seriesOrder],
    ]);
    onBatchReorderScripts?.(seriesId, seriesScripts, targetOrders);
  }, [seriesId, seriesScripts, onBatchReorderScripts]);

  return (
    <div className="border-t pt-3 space-y-4">
      {/* Warnings */}
      {(conflicts.length > 0 || missingOrderCount > 0) && (
        <div className="space-y-1.5">
          {conflicts.length > 0 && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              ⚠ {conflicts.length} 個重複章節順序：{conflicts.map((c) => `第 ${c.order} 作`).join("、")}。請調整後再發布。
            </p>
          )}
          {missingOrderCount > 0 && (
            <p className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {missingOrderCount} 部作品尚未設定章節順序。
            </p>
          )}
        </div>
      )}

      {/* Chapter list */}
      <PublisherFormRow label="章節列表" hint="可 inline 調整順序，Enter 或離開欄位後儲存。">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">已加入作品</h4>
            <Badge variant="outline">{seriesScripts.length} 部</Badge>
          </div>
          {seriesScripts.length === 0 ? (
            <p className="text-xs text-muted-foreground">目前此系列沒有作品。</p>
          ) : (
            <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
              {seriesScripts.map((script, index) => {
                const pendingVal = pendingOrders[script.id];
                const displayVal =
                  pendingVal !== undefined
                    ? pendingVal
                    : script.seriesOrder !== null
                      ? String(script.seriesOrder)
                      : "";
                const hasConflict =
                  script.seriesOrder !== null && conflictOrders.has(script.seriesOrder);
                const orderError = orderErrors[script.id];
                const canMoveUp = Boolean(onBatchReorderScripts) && index > 0 && !script.isMissingOrder && !seriesScripts[index - 1].isMissingOrder;
                const canMoveDown = Boolean(onBatchReorderScripts) && index < seriesScripts.length - 1 && !script.isMissingOrder && !seriesScripts[index + 1].isMissingOrder;

                return (
                  <div
                    key={script.id}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 ${hasConflict ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20" : "bg-muted/20"}`}
                  >
                    {/* Order input */}
                    <div className="flex w-16 shrink-0 flex-col items-center gap-0.5">
                      <Input
                        className={`h-7 w-full px-1.5 text-center text-xs ${orderError ? "border-destructive" : ""}`}
                        value={displayVal}
                        placeholder="順序"
                        aria-label={`${script.title} 章節順序`}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPendingOrders((prev) => ({ ...prev, [script.id]: val }));
                          const result = normalizeEditableSeriesOrder(val);
                          setOrderErrors((prev) => {
                            const next = { ...prev };
                            if (result.valid) delete next[script.id];
                            else next[script.id] = result.error;
                            return next;
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        onBlur={() => {
                          const raw = pendingOrders[script.id];
                          if (raw === undefined) return;
                          const result = normalizeEditableSeriesOrder(raw);
                          setPendingOrders((prev) => {
                            const next = { ...prev };
                            delete next[script.id];
                            return next;
                          });
                          if (!result.valid) {
                            setOrderErrors((prev) => {
                              const next = { ...prev };
                              delete next[script.id];
                              return next;
                            });
                            return;
                          }
                          if (result.order !== script.seriesOrder) {
                            onReorderScript?.(script.id, result.order);
                          }
                        }}
                      />
                      {orderError ? (
                        <span className="text-[10px] text-destructive leading-none">
                          {orderError}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground leading-none">
                          {script.isPrologue
                            ? "設定/背景"
                            : script.isMissingOrder
                              ? "未設定"
                              : `第 ${script.seriesOrder} 作`}
                        </span>
                      )}
                    </div>

                    {/* Up / down */}
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={!canMoveUp}
                        onClick={() => handleMove(index, "up")}
                        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label={`${script.title} 上移`}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={!canMoveDown}
                        onClick={() => handleMove(index, "down")}
                        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label={`${script.title} 下移`}
                      >
                        ▼
                      </button>
                    </div>

                    {/* Title + status */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{script.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">{script.status || "private"}</p>
                    </div>

                    {/* Detach */}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => onDetachScript?.(script.id, seriesId)}
                    >
                      移出
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PublisherFormRow>

      {/* Attach existing script */}
      {attachableScripts.length > 0 && (
        <PublisherFormRow
          label="加入現有作品"
          hint="選擇尚未加入此系列的作品，設定章節順序後加入。"
        >
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <select
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={attachScriptId}
                onChange={(e) => setAttachScriptId(e.target.value)}
                aria-label="選擇作品"
              >
                <option value="">— 選擇作品 —</option>
                {attachableScripts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title || "Untitled"}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <Input
                className={`h-8 w-20 shrink-0 text-xs ${attachOrderError ? "border-destructive" : ""}`}
                value={attachOrder}
                onChange={(e) => {
                  const val = e.target.value;
                  setAttachOrder(val);
                  const result = normalizeEditableSeriesOrder(val);
                  setAttachOrderError(result.valid ? "" : result.error);
                }}
                placeholder="順序"
                aria-label="章節順序"
              />
              {attachOrderError && (
                <span className="text-[10px] text-destructive leading-none">{attachOrderError}</span>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!attachScriptId || Boolean(attachOrderError)}
              onClick={() => {
                if (!attachScriptId) return;
                const result = normalizeEditableSeriesOrder(attachOrder);
                if (!result.valid) return;
                onAttachScript?.(attachScriptId, seriesId, result.order);
                setAttachScriptId("");
                setAttachOrder("");
                setAttachOrderError("");
              }}
            >
              加入
            </Button>
          </div>
        </PublisherFormRow>
      )}
    </div>
  );
}
