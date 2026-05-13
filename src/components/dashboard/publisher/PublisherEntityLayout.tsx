import React from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { StudioEmptyStateCard } from "../../common/StudioEmptyStateCard";

export const PUBLISHER_CONTENT_STACK_CLASS = "mx-auto max-w-4xl space-y-6 pb-16";
export const PUBLISHER_CONTENT_COMPACT_STACK_CLASS = "mx-auto max-w-4xl space-y-4 pb-16";
export const PUBLISHER_SECTION_CARD_CLASS = "rounded-lg border bg-card p-4";
export const PUBLISHER_DEMO_CARD_CLASS = "rounded-xl border border-dashed bg-muted/20 p-4";

export function PublisherSplitPanel({ sidebar, header, children, footer = null }) {
  return (
    <Card className="flex h-auto min-h-0 flex-col overflow-hidden border md:min-h-[500px] md:flex-row">
      {sidebar}
      <div className="flex flex-1 flex-col overflow-hidden bg-card">
        <div className="border-b bg-background/50 p-4 backdrop-blur-sm">{header}</div>
        <div className="flex-1 overflow-y-auto p-4 md:p-5">{children}</div>
        {footer}
      </div>
    </Card>
  );
}

export function PublisherEntityListPane({
  id,
  title,
  onCreate,
  createAriaLabel = "create",
  topActions = null,
  isLoading = false,
  loadingLabel = "",
  children,
  emptyState = null,
}) {
  return (
    <div id={id} className="flex w-full flex-col border-b bg-muted/10 md:w-[280px] md:border-b-0 md:border-r">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/50 p-4 backdrop-blur-sm">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="ml-auto h-8 w-8"
          onClick={onCreate}
          aria-label={createAriaLabel}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {topActions}
        {isLoading ? (
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{loadingLabel}</span>
          </div>
        ) : null}
        {children}
        {emptyState}
      </div>
    </div>
  );
}

export function PublisherEntityListItem({ selected = false, onClick, leading = null, title, subtitle = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
        selected
          ? "border-primary/50 bg-background shadow-sm ring-1 ring-primary/20"
          : "border-transparent bg-transparent hover:border-border/50 hover:bg-background/80 hover:shadow-sm"
      }`}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
    </button>
  );
}

export function PublisherEmptyState({
  title,
  description = "",
  actionLabel = "",
  onAction = null,
  className = "",
}) {
  return (
    <StudioEmptyStateCard
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
      className={className}
    />
  );
}

export function PublisherActionBar({ children, id, className = "" }) {
  return (
    <div id={id} className={`flex justify-end border-t bg-background/50 p-3 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}
