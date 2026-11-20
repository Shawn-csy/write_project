import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../../lib/utils";

interface SettingsSectionCardProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SettingsSectionCard({
  icon,
  title,
  description,
  children,
  className,
  contentClassName,
}: SettingsSectionCardProps): React.JSX.Element {
  return (
    <Card className={cn("min-w-0 rounded-lg border-border bg-card shadow-none", className)}>
      <CardHeader className="rounded-t-lg border-b bg-muted/30 px-3.5 py-2.5">
        <div className="flex items-baseline gap-2">
          {icon && <span aria-hidden="true" className="shrink-0 self-start pt-0.5 text-muted-foreground">{icon}</span>}
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <CardTitle className="text-sm leading-5">{title}</CardTitle>
            {description && <CardDescription className="text-xs leading-5">{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("px-3.5 py-0", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
