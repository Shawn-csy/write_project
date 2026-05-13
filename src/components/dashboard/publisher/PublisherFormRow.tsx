import React from "react";

export function PublisherFormRow({ label, required = false, hint = "", className = "", children }) {
  return (
    <div className={`grid gap-1.5 md:grid-cols-[150px_minmax(0,1fr)] md:gap-3 md:items-start ${className}`}>
      <div className="pt-1">
        <div className="text-[13px] font-medium text-foreground">
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </div>
        {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
