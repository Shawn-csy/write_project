"use client";

import { ArrowRight } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

// UI Stage bt-ih-03: the left dot fills the button as the arrow slides into view.
export const PublicScriptSubmissionTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function PublicScriptSubmissionTrigger({ className = "", ...props }, ref) {
    return (
      <button
        aria-haspopup="dialog"
        title="投稿台本"
        {...props}
        ref={ref}
        type="button"
        className={`public-script-submit relative inline-flex h-10 shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-full border border-border bg-background px-3 text-[0.8125rem] font-medium text-foreground ${className}`}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="public-script-submit-dot h-1.5 w-1.5 rounded-full bg-foreground" />
          <span className="public-script-submit-label">投稿台本</span>
        </span>
        <span aria-hidden="true" className="public-script-submit-reveal pointer-events-none absolute inset-0 flex items-center justify-center gap-1 text-background">
          投稿台本 <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </button>
    );
  },
);
