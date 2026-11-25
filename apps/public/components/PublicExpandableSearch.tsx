"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  triggerLabel?: string;
  closeLabel?: string;
  applyOnSubmit?: boolean;
  clearOnClose?: boolean;
  className?: string;
}

export function PublicExpandableSearch({
  value,
  onChange,
  placeholder,
  triggerLabel = "開啟搜尋",
  closeLabel = "收合搜尋",
  applyOnSubmit = false,
  clearOnClose = false,
  className = "",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const contentId = useId();
  const inputId = `${contentId}-input`;
  const submitting = expanded && applyOnSubmit;
  const searchRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const dismissOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node) || searchRef.current?.contains(event.target)) return;
      setExpanded(false);
    };
    document.addEventListener("click", dismissOnOutsideClick, true);
    return () => document.removeEventListener("click", dismissOnOutsideClick, true);
  }, [expanded]);

  const close = () => {
    if (clearOnClose) {
      onChange("");
      setDraft(null);
    }
    setExpanded(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={searchRef} data-expanded={expanded} className={`public-expandable-search min-w-0 ${className}`}>
      <form
        className="public-expandable-search-pill"
        data-has-query={Boolean(value)}
        onSubmit={(event) => {
          event.preventDefault();
          if (!submitting) return;
          onChange(draft ?? value);
          setDraft(null);
          inputRef.current?.focus();
        }}
        onKeyDownCapture={(event) => {
          if (!expanded || event.key !== "Escape" || event.nativeEvent.isComposing) return;
          event.preventDefault();
          event.stopPropagation();
          close();
        }}
      >
        <button
          ref={triggerRef}
          type={submitting ? "submit" : "button"}
          aria-label={submitting ? "套用搜尋" : triggerLabel}
          title={submitting ? "套用搜尋" : triggerLabel}
          aria-controls={submitting ? undefined : contentId}
          aria-expanded={submitting ? undefined : expanded}
          className="public-search-trigger inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-foreground"
          onClick={(event) => {
            if (!expanded) {
              event.preventDefault();
              setExpanded(true);
            } else if (!applyOnSubmit) {
              inputRef.current?.focus();
            }
          }}
        >
          <Search className="h-4 w-4" aria-hidden />
        </button>
        <div id={contentId} className="public-expandable-search-content" inert={!expanded} aria-hidden={!expanded}>
          <label htmlFor={inputId} className="sr-only">{placeholder}</label>
          <input
            id={inputId}
            ref={inputRef}
            type="search"
            value={draft ?? value}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (applyOnSubmit) setDraft(nextValue);
              else onChange(nextValue);
            }}
            placeholder={placeholder}
            enterKeyHint={applyOnSubmit ? "search" : undefined}
            className="h-11 min-w-0 flex-1 bg-transparent text-[0.875rem] placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="button"
            aria-label={closeLabel}
            title={closeLabel}
            onClick={close}
            className="public-search-trigger inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-muted-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}
