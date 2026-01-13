import React from "react";
import { Share2, Printer, PenBox } from "lucide-react";

export function ReaderActions({
    canShare,
    onShareUrl,
    shareCopied,
    handleExportPdf,
    onEdit,
    extraActions
}) {
    return (
        <div className="flex items-center justify-end gap-2 sm:gap-3 sm:ml-auto shrink-0 lg:border-l lg:border-border/60 lg:pl-3">
              {canShare && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareUrl?.(e);
                    }}
                    aria-label="分享連結"
                    className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-muted text-foreground/80 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  {shareCopied && (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      已複製
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={handleExportPdf}
                aria-label="匯出 PDF"
                className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-muted text-foreground/80 transition-colors"
              >
                <Printer className="h-4 w-4" />
              </button>
              {onEdit && (
                <button
                  onClick={onEdit}
                  aria-label="編輯劇本"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-muted text-foreground/80 transition-colors"
                >
                  <PenBox className="h-4 w-4" />
                </button>
              )}
              {extraActions}
        </div>
    );
}
