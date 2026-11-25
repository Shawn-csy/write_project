"use client";

import { forwardRef } from "react";
import { MessageSquarePlus } from "lucide-react";
import { PublicScriptSubmissionTrigger } from "./PublicScriptSubmissionTrigger";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  mode: "choice" | "bug" | "listing";
  showLabel?: boolean;
}

export const PublicFeedbackTrigger = forwardRef<HTMLButtonElement, Props>(function PublicFeedbackTrigger(
  { mode, showLabel = false, ...buttonProps }, ref,
) {
  if (mode === "listing") {
    return <PublicScriptSubmissionTrigger {...buttonProps} ref={ref} />;
  }

  const label = mode === "bug" ? "回報問題" : "Bug 回報或台本投稿";
  return (
    <button
      {...buttonProps}
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-sm px-2.5 text-[0.8125rem] text-muted-foreground transition-colors duration-100 hover:bg-muted hover:text-foreground lg:px-3"
    >
      <MessageSquarePlus className="h-4 w-4" aria-hidden />
      <span className={showLabel ? "inline" : "hidden lg:inline"}>{mode === "bug" ? "回報問題" : "回報／投稿"}</span>
    </button>
  );
});
