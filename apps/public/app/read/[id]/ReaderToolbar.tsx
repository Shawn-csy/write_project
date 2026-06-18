"use client";

import React from "react";
import { ReaderToolbar as SharedReaderToolbar } from "@write/script-reader-ui";
import type { ReaderState } from "@write/script-reader-ui";

interface Props {
  readerState: ReaderState;
  onShare?: () => void;
  copied?: boolean;
  onExportPdf?: () => void;
  pdfReady?: boolean;
}

export function ReaderToolbar({ readerState, onShare, copied, onExportPdf, pdfReady = false }: Props) {
  return (
    <SharedReaderToolbar
      readerState={readerState}
      contentClassName="max-w-4xl mx-auto"
      startSlot={
        <a
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← 台本列表
        </a>
      }
      endSlot={
        (onShare || onExportPdf) ? (
          <div className="flex items-center gap-1">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded"
              >
                {copied ? "已複製！" : "分享"}
              </button>
            )}
            {onExportPdf && (
              <button
                type="button"
                onClick={onExportPdf}
                disabled={!pdfReady}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                PDF
              </button>
            )}
          </div>
        ) : undefined
      }
    />
  );
}
