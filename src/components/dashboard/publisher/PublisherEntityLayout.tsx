import React from "react";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { StudioEmptyStateCard } from "../../common/StudioEmptyStateCard";

export const PUBLISHER_CONTENT_STACK_CLASS = "mx-auto max-w-4xl space-y-4 pb-8";
export const PUBLISHER_CONTENT_COMPACT_STACK_CLASS = "mx-auto max-w-4xl space-y-4 pb-16";
export const PUBLISHER_SECTION_CARD_CLASS = "rounded-lg border bg-card p-4";
export const PUBLISHER_DEMO_CARD_CLASS = "rounded-xl border border-dashed bg-muted/20 p-4";

const PanelNavigation = React.createContext({ openEditor: () => {} });
export const usePublisherPanelNavigation = () => React.useContext(PanelNavigation);

export function PublisherSplitPanel({
  sidebar,
  header,
  children,
  footer = null,
}: {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode | null;
}): React.JSX.Element {
  const [mobileEditor, setMobileEditor] = React.useState(false);
  const previousFocus = React.useRef<HTMLElement | null>(null);
  const backButton = React.useRef<HTMLButtonElement | null>(null);
  const navigation = React.useMemo(() => ({ openEditor: () => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    setMobileEditor(true);
  } }), []);
  React.useEffect(() => {
    if (mobileEditor && window.matchMedia?.("(max-width: 767px)").matches) {
      backButton.current?.focus();
    }
  }, [mobileEditor]);
  return (
    <PanelNavigation.Provider value={navigation}>
    <Card data-mobile-view={mobileEditor ? "editor" : "list"} className="flex h-auto min-h-0 flex-col overflow-hidden border md:min-h-[420px] md:flex-row">
      <div data-mobile-pane="list" className={mobileEditor ? "hidden md:contents" : "contents"}>{sidebar}</div>
      <div data-mobile-pane="editor" className={`${mobileEditor ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-card`}>
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Button ref={backButton} type="button" variant="ghost" className="h-10 shrink-0 px-2 md:hidden" onClick={() => {
            setMobileEditor(false);
            window.requestAnimationFrame(() => previousFocus.current?.focus());
          }}>
            <ArrowLeft className="h-4 w-4" />返回列表
          </Button>
          <div className="min-w-0 flex-1">{header}</div>
        </div>
        <div className="min-w-0 flex-1 p-3 md:p-4">{children}</div>
        {footer}
      </div>
    </Card>
    </PanelNavigation.Provider>
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
}: {
  id: string;
  title: React.ReactNode;
  onCreate: () => void | boolean;
  createAriaLabel?: string;
  topActions?: React.ReactNode | null;
  isLoading?: boolean;
  loadingLabel?: React.ReactNode;
  children: React.ReactNode;
  emptyState?: React.ReactNode | null;
}): React.JSX.Element {
  const { openEditor } = usePublisherPanelNavigation();
  return (
    <div id={id} className="flex w-full shrink-0 flex-col bg-muted/10 md:w-[232px] md:border-r">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="ml-auto h-10 w-10 md:h-8 md:w-8"
          onClick={() => { if (onCreate() !== false) openEditor(); }}
          aria-label={createAriaLabel}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-1 p-2">
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

export function PublisherEntityListItem({
  selected = false,
  onClick,
  leading = null,
  title,
  subtitle = "",
}: {
  selected?: boolean;
  onClick: () => void | boolean;
  leading?: React.ReactNode | null;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}): React.JSX.Element {
  const { openEditor } = usePublisherPanelNavigation();
  return (
    <button
      type="button"
      onClick={() => { if (onClick() !== false) openEditor(); }}
      className={`flex min-h-11 w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
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
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: React.ReactNode;
  onAction?: (() => void) | null;
  className?: string;
}): React.JSX.Element {
  const { openEditor } = usePublisherPanelNavigation();
  return (
    <StudioEmptyStateCard
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction ? () => { onAction(); openEditor(); } : null}
      className={className}
    />
  );
}

export function PublisherActionBar({
  children,
  id,
  className = "",
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div id={id} className={`flex justify-end border-t bg-background/50 p-3 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}
