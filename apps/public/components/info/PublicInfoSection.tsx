import type { ReactNode } from "react";

export interface PublicInfoSectionProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  /** Render as a bordered card block rather than a plain section. */
  card?: boolean;
}

export function PublicInfoSection({
  title,
  description,
  icon,
  children,
  card = false,
}: PublicInfoSectionProps) {
  const cardClass = card ? "border-t border-border pt-4" : "space-y-3";

  return (
    <section className={cardClass}>
      <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
        {icon && <span className="text-link">{icon}</span>}
        {title}
      </h2>
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}
      {children}
    </section>
  );
}
