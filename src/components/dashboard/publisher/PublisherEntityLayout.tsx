import React from "react";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Button } from "../../ui/button";
import { StudioEmptyStateCard } from "../../common/StudioEmptyStateCard";

export const PUBLISHER_CONTENT_STACK_CLASS = "max-w-3xl space-y-8 pb-8";
export const PUBLISHER_CONTENT_COMPACT_STACK_CLASS = "max-w-3xl space-y-8 pb-16";
export const PUBLISHER_SECTION_CARD_CLASS = "border-t border-border/70 pt-6";
export const PUBLISHER_DEMO_CARD_CLASS = "rounded-[10px] border border-dashed border-border p-4";

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
    <div data-mobile-view={mobileEditor ? "editor" : "list"} className="flex h-auto min-h-0 flex-col md:min-h-[420px] md:flex-row md:gap-8">
      <div data-mobile-pane="list" className={mobileEditor ? "hidden md:contents" : "contents"}>{sidebar}</div>
      <div data-mobile-pane="editor" className={`${mobileEditor ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        <div className="flex items-center gap-2 pb-4">
          <Button ref={backButton} type="button" variant="ghost" className="-ml-2 h-11 shrink-0 px-2 md:hidden" onClick={() => {
            setMobileEditor(false);
            window.requestAnimationFrame(() => previousFocus.current?.focus());
          }}>
            <ArrowLeft className="h-4 w-4" />返回列表
          </Button>
          <div className="min-w-0 flex-1">{header}</div>
        </div>
        <div className="min-w-0 flex-1">{children}</div>
        {footer}
      </div>
    </div>
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
    <div id={id} className="flex w-full shrink-0 flex-col md:w-72 md:border-r md:border-border/70 md:pr-6">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="ml-auto h-10 w-10 md:h-8 md:w-8"
          onClick={() => { if (onCreate() !== false) openEditor(); }}
          aria-label={createAriaLabel}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-0.5">
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
      aria-current={selected ? "true" : undefined}
      className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
        selected
          ? "bg-muted shadow-[inset_3px_0_0_hsl(var(--primary))]"
          : "hover:bg-muted/60"
      }`}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm ${selected ? "font-semibold" : "font-medium"}`}>{title}</div>
        {subtitle ? <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
    </button>
  );
}

export function PublisherEmptyState({
  icon = null,
  title,
  description = "",
  actionLabel = "",
  onAction = null,
  className = "",
}: {
  icon?: React.ComponentType<{ className?: string }> | null;
  title: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: React.ReactNode;
  onAction?: (() => void) | null;
  className?: string;
}): React.JSX.Element {
  const { openEditor } = usePublisherPanelNavigation();
  return (
    <StudioEmptyStateCard
      icon={icon}
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
    <div id={id} className={`sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background py-3 ${className}`}>
      {children}
    </div>
  );
}
