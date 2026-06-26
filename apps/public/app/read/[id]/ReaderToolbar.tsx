"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ReaderToolbar as SharedReaderToolbar } from "@write/script-reader-ui";
import type { ReaderState } from "@write/script-reader-ui";
import { useAnimePressFeedback } from "@/lib/motion/useAnimePressFeedback";
import { useAnimeSuccessFeedback } from "@/lib/motion/useAnimeSuccessFeedback";
import type { SegmentRenderProp } from "@write/script-reader-ui";
import { AnimatedSegment } from "@/components/AnimatedSegment";

// Module-level stable ref — no re-creation on render.
const readerSegmentRenderer: SegmentRenderProp = (options, value, onChange, groupLabel) => (
  <AnimatedSegment
    options={options}
    value={value}
    onChange={onChange}
    label={groupLabel}
    btnClassName="py-1 text-xs"
  />
);

interface Props {
  readerState: ReaderState;
  title?: string;
  onShare?: () => void;
  copied?: boolean;
  onExportPdf?: () => void;
  pdfReady?: boolean;
}

export function ReaderToolbar({ readerState, title, onShare, copied, onExportPdf, pdfReady = false }: Props) {
  const sharePress = useAnimePressFeedback<HTMLButtonElement>();
  const shareSuccess = useAnimeSuccessFeedback<HTMLButtonElement>();
  const pdfPress = useAnimePressFeedback<HTMLButtonElement>();

  // Merge share button refs
  const shareRef = (el: HTMLButtonElement | null) => {
    (sharePress.ref as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    (shareSuccess.ref as React.MutableRefObject<HTMLButtonElement | null>).current = el;
  };

  // Fire success pop when copied state becomes true
  const { trigger: triggerShareSuccess } = shareSuccess;
  useEffect(() => {
    if (copied) triggerShareSuccess();
  }, [copied, triggerShareSuccess]);

  return (
    <SharedReaderToolbar
      readerState={readerState}
      contentClassName="w-full px-2 sm:px-4"
      renderSegment={readerSegmentRenderer}
      centerSlot={
        title ? (
          <span className="block truncate text-sm text-muted-foreground">{title}</span>
        ) : undefined
      }
      startSlot={
        <Link
          href="/"
          className="inline-flex items-center gap-1 h-6 px-2.5 rounded-[5px] text-xs font-medium text-muted-foreground border border-border/50 bg-transparent hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all duration-150"
        >
          ← 台本列表
        </Link>
      }
      endSlot={
        <div className="flex items-center gap-1">
          {onShare && (
            <button
              ref={shareRef}
              type="button"
              onClick={onShare}
              className="inline-flex items-center min-h-[44px] px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg"
              {...sharePress.handlers}
            >
              {copied ? "已複製！" : "分享"}
            </button>
          )}
          {onExportPdf && (
            <button
              ref={pdfPress.ref}
              type="button"
              onClick={onExportPdf}
              disabled={!pdfReady}
              className="inline-flex items-center min-h-[44px] px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              {...pdfPress.handlers}
            >
              PDF
            </button>
          )}
        </div>
      }
    />
  );
}
