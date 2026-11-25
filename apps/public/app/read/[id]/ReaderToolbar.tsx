"use client";

import { Check, Share2 } from "lucide-react";
import Link from "next/link";
import { ReaderToolbar as SharedReaderToolbar } from "@write/script-reader-ui";
import type { ReaderState } from "@write/script-reader-ui";
import { useAnimePressFeedback } from "@/lib/motion/useAnimePressFeedback";
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
  const pdfPress = useAnimePressFeedback<HTMLButtonElement>();

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
          className="inline-flex items-center gap-1 h-6 px-2.5 rounded-md text-xs font-medium text-muted-foreground border border-border bg-card hover:bg-muted hover:text-foreground"
        >
          ← 台本列表
        </Link>
      }
      endSlot={
        <div className="flex items-center gap-1">
          {onShare && (
            <button
              ref={sharePress.ref}
              type="button"
              onClick={onShare}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              {...sharePress.handlers}
            >
              {copied ? <Check className="public-motion-icon h-4 w-4 text-success" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
              <span aria-live="polite">{copied ? "已複製！" : "分享"}</span>
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
