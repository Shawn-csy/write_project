import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "../ui/button";

interface StudioEmptyStateCardProps {
  icon?: React.ComponentType<{ className?: string }> | null;
  title: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: React.ReactNode;
  onAction?: (() => void) | null;
  className?: string;
}

export function StudioEmptyStateCard({
  icon = null,
  title,
  description = "",
  actionLabel = "",
  onAction = null,
  className = "",
}: StudioEmptyStateCardProps): React.JSX.Element {
  const Icon = icon || Inbox;
  return (
    <div className={`flex flex-col items-center rounded-[10px] border border-dashed border-border px-6 py-10 text-center ${className}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="mt-3 text-[15px] font-semibold">{title}</h4>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
