import React from "react";

interface PublisherTabHeaderProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode | null;
    className?: string;
}

export function PublisherTabHeader({ title, description, actions = null, className = "" }: PublisherTabHeaderProps): React.JSX.Element {
    return (
        <div className={`flex items-start justify-between gap-2 py-1 ${className}`}>
            <div className="min-w-0">
                <h3 className="text-sm font-semibold tracking-tight text-[color:var(--morandi-tone-helper-fg)]">{title}</h3>
                {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
    );
}
