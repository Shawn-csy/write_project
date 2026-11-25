"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode, type RefObject } from "react";

export function PublicSubmissionDialogContent({ title, description, children, width = "medium", closeLabel = "關閉投稿表單", returnFocus, restoreActiveElement = false, elevated = false }: {
  title: string;
  description?: string;
  children: ReactNode;
  width?: "small" | "medium" | "large" | "wide";
  closeLabel?: string;
  returnFocus?: RefObject<HTMLElement | null>;
  restoreActiveElement?: boolean;
  elevated?: boolean;
}) {
  const activeTrigger = useRef<HTMLElement | null>(null);
  const maxWidth = { small: "max-w-lg", medium: "max-w-xl", large: "max-w-2xl", wide: "max-w-5xl" }[width];

  return (
    <Dialog.Portal>
      <Dialog.Overlay className={`public-panel-backdrop-motion fixed inset-0 bg-black/60 ${elevated ? "z-[100]" : "z-50"}`} />
      <Dialog.Content
        {...(!description ? { "aria-describedby": undefined } : {})}
        className={`public-feedback-dialog-motion fixed left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-md border border-border bg-card p-4 shadow-lg outline-none sm:p-6 ${maxWidth} ${elevated ? "z-[101]" : "z-50"}`}
        onOpenAutoFocus={() => {
          if (restoreActiveElement && document.activeElement instanceof HTMLElement) activeTrigger.current = document.activeElement;
        }}
        onCloseAutoFocus={(event) => {
          const target = returnFocus?.current ?? activeTrigger.current;
          activeTrigger.current = null;
          if (!target?.isConnected || target === document.body) return;
          target.focus({ preventScroll: true });
          if (document.activeElement === target) event.preventDefault();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Dialog.Title className="text-lg font-semibold text-foreground">{title}</Dialog.Title>
            {description && <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>}
          </div>
          <Dialog.Close asChild>
            <button type="button" aria-label={closeLabel} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground sm:h-9 sm:w-9">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </Dialog.Close>
        </div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
