import type { ReactNode } from "react";

interface Props {
  title: string;
  count?: string;
  leading?: ReactNode;
  description?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
}

/** Shared heading for public directory pages. */
export function PublicBrowseHeader({ title, count, leading, description, search, actions }: Props) {
  return (
    <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border pb-3 sm:mb-6 sm:gap-4 sm:pb-4">
      <div className="flex min-w-0 flex-1 basis-24 items-center gap-2 sm:gap-3">
        {leading}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h1 className="break-words text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
            {count && <span className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">{count}</span>}
          </div>
          {description}
        </div>
      </div>
      {search && <div className="order-last min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-48 sm:max-w-80">{search}</div>}
      {actions && <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">{actions}</div>}
    </header>
  );
}
