import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { normalizeEditableSeriesOrder } from "../../../lib/publisher/seriesEditorModel";
import type { BaseScriptApi } from "../../../types/api";

interface SeriesAttachScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: string;
  attachableScripts: BaseScriptApi[];
  onAttachScript: (scriptId: string, seriesId: string, order: number | null) => void;
}

export function SeriesAttachScriptDialog({
  open,
  onOpenChange,
  seriesId,
  attachableScripts,
  onAttachScript,
}: SeriesAttachScriptDialogProps): React.JSX.Element {
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState("");
  const [order, setOrder] = React.useState("");
  const [orderError, setOrderError] = React.useState("");

  const filtered = React.useMemo(
    () =>
      search.trim()
        ? attachableScripts.filter((s) =>
            (s.title || "").toLowerCase().includes(search.trim().toLowerCase())
          )
        : attachableScripts,
    [attachableScripts, search]
  );

  function handleOrderChange(val: string) {
    setOrder(val);
    const result = normalizeEditableSeriesOrder(val);
    setOrderError(result.valid ? "" : result.error);
  }

  function handleConfirm() {
    if (!selectedId) return;
    const result = normalizeEditableSeriesOrder(order);
    if (!result.valid) return;
    onAttachScript(selectedId, seriesId, result.order);
    handleClose();
  }

  function handleClose() {
    setSearch("");
    setSelectedId("");
    setOrder("");
    setOrderError("");
    onOpenChange(false);
  }

  const orderValid = !orderError;
  const canConfirm = Boolean(selectedId) && orderValid;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>加入作品至系列</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search */}
          <Input
            placeholder="搜尋作品名稱…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedId("");
            }}
            aria-label="搜尋作品"
          />

          {/* Script list */}
          <div
            role="listbox"
            aria-label="可加入的作品"
            className="max-h-52 overflow-y-auto rounded-md border divide-y"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                無符合的作品
              </p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={selectedId === s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${
                    selectedId === s.id ? "bg-muted font-medium" : ""
                  }`}
                >
                  {s.title || "Untitled"}
                </button>
              ))
            )}
          </div>

          {/* Order input */}
          <div className="flex items-center gap-2">
            <label htmlFor="attach-dialog-order" className="shrink-0 text-sm">
              章節順序
            </label>
            <div className="flex flex-col gap-0.5">
              <Input
                id="attach-dialog-order"
                className={`h-8 w-24 text-xs ${orderError ? "border-destructive" : ""}`}
                value={order}
                onChange={(e) => handleOrderChange(e.target.value)}
                placeholder="選填"
                aria-label="章節順序"
              />
              {orderError && (
                <span className="text-[10px] text-destructive leading-none">
                  {orderError}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button type="button" disabled={!canConfirm} onClick={handleConfirm}>
            加入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
