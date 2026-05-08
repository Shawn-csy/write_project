import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * MetadataSectionBlock
 *
 * 可折疊的 section 區塊，用於 ScriptMetadataDialog 的各個資料區段。
 */
export function MetadataSectionBlock({ sectionId, title, collapsed, onToggle, children }) {
  return (
    <div id={sectionId} className="rounded-xl border border-border/70 bg-background shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-muted/30"
        aria-expanded={!collapsed}
        aria-controls={`${sectionId}-content`}
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {!collapsed && (
        <div id={`${sectionId}-content`} className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
