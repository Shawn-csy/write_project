import type { ReactNode } from "react";

interface Props {
  title: string;
  count?: string;
  actions?: ReactNode;
}

/** Shared heading for public directory pages. */
export function PublicBrowseHeader({ title, count, actions }: Props) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-baseline gap-3">
        <h1 className="font-serif text-3xl font-bold">{title}</h1>
        {count && <span className="text-sm text-muted-foreground">{count}</span>}
      </div>
      {actions}
    </div>
  );
}
