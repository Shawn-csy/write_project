import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

export function StudioEmptyStateCard({
  icon = null,
  title,
  description = "",
  actionLabel = "",
  onAction = null,
  className = "",
}) {
  const Icon = icon || Inbox;
  return (
    <Card className={`border-dashed bg-muted/20 p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/70 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <h4 className="text-base font-semibold">{title}</h4>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actionLabel && onAction ? (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
