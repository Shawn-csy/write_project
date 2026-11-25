"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Plus } from "lucide-react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  quiet?: boolean;
}

export const PublicSubmissionTrigger = forwardRef<HTMLButtonElement, Props>(function PublicSubmissionTrigger(
  { label, quiet = false, className = "", ...props }, ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      aria-label={label}
      data-quiet={quiet || undefined}
      className={`public-submission-trigger inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[0.8125rem] font-semibold ${quiet ? "text-foreground" : "bg-primary text-primary-foreground"} ${className}`}
    >
      <Plus className="h-4 w-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </button>
  );
});
