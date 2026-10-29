import React from "react";

interface PublisherTabHeaderProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode | null;
    className?: string;
}

export function PublisherTabHeader({ title, description, actions = null, className = "" }: PublisherTabHeaderProps): React.JSX.Element {
    return (
        <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
            <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
                {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
    );
}
