import type { ReactNode } from "react";

export interface PublicEmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PublicEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: PublicEmptyStateAction;
  secondaryAction?: PublicEmptyStateAction;
  className?: string;
}

function ActionButton({ action, primary }: { action: PublicEmptyStateAction; primary: boolean }) {
  const className = primary
    ? "inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 [font-size:var(--public-font-meta)] font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    : "inline-flex h-10 items-center justify-center rounded-lg border border-border/60 px-4 [font-size:var(--public-font-meta)] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  if (action.href) {
    return <a href={action.href} className={className}>{action.label}</a>;
  }
  return <button type="button" onClick={action.onClick} className={className}>{action.label}</button>;
}

/** Shared empty state: say what is missing, then give the visitor a next step. */
export function PublicEmptyState({ icon, title, description, primaryAction, secondaryAction, className = "" }: PublicEmptyStateProps) {
  return (
    <div className={`px-4 py-16 text-center ${className}`}>
      {icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="[font-size:var(--public-font-body)] font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm [font-size:var(--public-font-meta)] text-muted-foreground">{description}</p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {primaryAction && <ActionButton action={primaryAction} primary />}
          {secondaryAction && <ActionButton action={secondaryAction} primary={false} />}
        </div>
      )}
    </div>
  );
}
