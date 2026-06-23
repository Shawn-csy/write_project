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
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
              className="min-h-[44px] px-3 text-xs text-muted-foreground hover:text-foreground transition-colors rounded"
            >
              {copied ? "已複製！" : "分享"}
            </button>
          )}
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={!pdfReady}
              className="min-h-[44px] px-3 text-xs text-muted-foreground hover:text-foreground transition-colors rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
              PDF
            </button>
          )}
        </div>
      }
    />
  );
}
