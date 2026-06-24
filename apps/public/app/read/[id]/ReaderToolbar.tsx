"use client";

import React from "react";
import { ReaderToolbar as SharedReaderToolbar } from "@write/script-reader-ui";
import type { ReaderState } from "@write/script-reader-ui";

interface Props {
  readerState: ReaderState;
  title?: string;
  onShare?: () => void;
  copied?: boolean;
  onExportPdf?: () => void;
  pdfReady?: boolean;
}

export function ReaderToolbar({ readerState, title, onShare, copied, onExportPdf, pdfReady = false }: Props) {
  return (
    <SharedReaderToolbar
      readerState={readerState}
      contentClassName="w-full px-2 sm:px-4"
      centerSlot={
        title ? (
          <span className="block truncate text-sm text-muted-foreground">{title}</span>
        ) : undefined
      }
      startSlot={
        <a
          href="/"
          className="inline-flex items-center gap-1 h-6 px-2.5 rounded-[5px] text-xs font-medium text-muted-foreground border border-border/50 bg-transparent hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all duration-150"
        >
          ← 台本列表
        </a>
      }
      endSlot={
        <div className="flex items-center gap-1">
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center min-h-[44px] px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg"
            >
              {copied ? "已複製！" : "分享"}
            </button>
          )}
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={!pdfReady}
              className="inline-flex items-center min-h-[44px] px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              PDF
            </button>
          )}
        </div>
      }
    />
  );
}
