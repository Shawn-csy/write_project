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
        ? `inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-cta text-[0.8125rem] font-bold text-white hover:brightness-110 ${compactAtMobile ? "h-9 w-9 sm:w-auto sm:px-4" : "h-9 px-4"}`
        : "inline-flex h-11 items-center justify-center gap-1.5 rounded-sm px-2.5 text-[0.8125rem] text-muted-foreground transition-colors duration-100 hover:bg-muted hover:text-foreground lg:px-3"}
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
