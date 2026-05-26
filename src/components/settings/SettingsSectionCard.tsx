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
    <Card className={cn("border border-border/60 bg-card/50 shadow-sm", className)}>
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-center gap-2">
          {icon ? (
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              {icon}
            </div>
          ) : null}
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? <CardDescription className="text-xs mt-0.5">{description}</CardDescription> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("px-5 pb-5", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
