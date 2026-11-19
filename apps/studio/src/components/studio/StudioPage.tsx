import React from "react";
import { ArrowLeft, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useStudioShell } from "./StudioShellContext";

/**
 * Shared page frame for every Studio screen: one scroll container, one page
 * title, one action row. Pages render their content directly on the page
 * surface instead of wrapping it in extra bordered panels.
 */
export function StudioPage({
  children,
  className,
  width = "default",
}: {
  children: React.ReactNode;
  className?: string;
  width?: "default" | "wide" | "narrow";
}) {
  const maxWidth = width === "wide" ? "max-w-[1400px]" : width === "narrow" ? "max-w-3xl" : "max-w-6xl";
  return (
    <div className="studio-density flex h-full min-h-0 flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn("mx-auto w-full px-4 pb-12 pt-4 sm:px-6 lg:px-10 lg:pt-7", maxWidth, className)}>{children}</div>
      </div>
    </div>
  );
}

export function StudioPageHeader({
  title,
  description,
  actions,
  back,
  meta,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { to: string; label: string };
  meta?: React.ReactNode;
}) {
  const { openMobileMenu } = useStudioShell();
  return (
    <header className="mb-6 flex flex-col gap-3 sm:mb-7">
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={openMobileMenu}
          className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="開啟選單"
        >
          <Menu className="h-5 w-5" />
        </button>
        {back ? (
          <Link to={back.to} className="inline-flex h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {back.label}
          </Link>
        ) : null}
      </div>
      {back ? (
        <Link
          to={back.to}
          className="hidden w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:inline-flex"
        >
          <ArrowLeft className="h-4 w-4" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {meta}
          </div>
          {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function StudioSectionTitle({ children, actions, className }: { children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-center justify-between gap-3", className)}>
      <h2 className="text-[15px] font-semibold text-foreground">{children}</h2>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
