import React from "react";

export function PublisherTabHeader({ title, description, actions = null, className = "" }) {
    return (
        <div className={`flex items-start justify-between gap-3 rounded-lg border bg-card/80 px-4 py-3 ${className}`}>
            <div className="min-w-0">
                <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
                {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
    );
}
