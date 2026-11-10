"use client";

import { forwardRef } from "react";
import { FilePlus2, MessageSquarePlus } from "lucide-react";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  mode: "choice" | "bug" | "listing";
  compactAtMobile?: boolean;
  showLabel?: boolean;
}

export const PublicFeedbackTrigger = forwardRef<HTMLButtonElement, Props>(function PublicFeedbackTrigger(
  { mode, compactAtMobile = false, showLabel = false, ...buttonProps }, ref,
) {
  return (
    <button
      {...buttonProps}
      ref={ref}
      type="button"
      aria-label={mode === "listing" ? "投稿台本" : mode === "bug" ? "回報問題" : "Bug 回報或台本投稿"}
      title={mode === "listing" ? "投稿台本" : mode === "bug" ? "回報問題" : "Bug 回報或台本投稿"}
      className={mode === "listing"
        ? `inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-background text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${compactAtMobile ? "h-9 w-9 sm:h-10 sm:w-auto sm:px-4" : "h-10 px-4"}`
        : "inline-flex h-11 items-center justify-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:px-3"}
    >
      {mode === "listing" && compactAtMobile ? (
        <>
          <FilePlus2 className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">投稿台本</span>
        </>
      ) : (
        <>
          {mode === "listing" ? <FilePlus2 className="h-4 w-4" aria-hidden /> : <MessageSquarePlus className="h-4 w-4" aria-hidden />}
          <span className={mode === "listing" || showLabel ? "inline" : "hidden lg:inline"}>{mode === "listing" ? "投稿台本" : mode === "bug" ? "回報問題" : "回報／投稿"}</span>
        </>
      )}
    </button>
  );
});
