import React from "react";

interface ChecklistChipItem {
  type: "required" | "recommended" | string;
  key: string;
  label: string;
}

interface ScriptMetadataChecklistHeaderProps {
  t: (key: string, fallback?: string) => string;
  completedChecklistItems: number;
  totalChecklistItems: number;
  completionPercent: number;
  hasBlockingIssues: boolean;
  visibleChecklistChipItems: ChecklistChipItem[];
  showAllChecklistChips: boolean;
  hiddenChecklistChipCount: number;
  checklistChipItems: ChecklistChipItem[];
  maxVisibleChecklistChips: number;
  activeTab: string;
  jumpToChecklistItem: (key: string) => void;
  setShowAllChecklistChips: (value: boolean) => void;
  focusSection: (section: string) => void;
}

export function ScriptMetadataChecklistHeader({
  t,
  completedChecklistItems,
  totalChecklistItems,
  completionPercent,
  hasBlockingIssues,
  visibleChecklistChipItems,
  showAllChecklistChips,
  hiddenChecklistChipCount,
  checklistChipItems,
  maxVisibleChecklistChips,
  activeTab,
  jumpToChecklistItem,
  setShowAllChecklistChips,
  focusSection,
}: ScriptMetadataChecklistHeaderProps) {
  return (
    <div className="space-y-1">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium text-muted-foreground">{t("scriptMetadataDialog.publishChecklist")}</div>
        <div className="text-xs font-semibold text-foreground">
          {completedChecklistItems}/{totalChecklistItems} {t("common.completed", "完成")}
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${hasBlockingIssues ? "bg-destructive" : "bg-foreground/70"}`}
          style={{ width: `${completionPercent}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {visibleChecklistChipItems.map((item) => (
          <button
            key={`compact-${item.type}-${item.key}`}
            type="button"
            className={
              item.type === "required"
                ? "rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                : "rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
            }
            onClick={() => jumpToChecklistItem(item.key)}
          >
            {item.label}
          </button>
        ))}
        {!showAllChecklistChips && hiddenChecklistChipCount > 0 && (
          <button
            key="compact-show-more"
            type="button"
            className="rounded-md border border-border/70 bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80"
            onClick={() => setShowAllChecklistChips(true)}
          >
            +{hiddenChecklistChipCount}
          </button>
        )}
        {showAllChecklistChips && checklistChipItems.length > maxVisibleChecklistChips && (
          <button
            key="compact-show-less"
            type="button"
            className="rounded-md border border-border/70 bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80"
            onClick={() => setShowAllChecklistChips(false)}
          >
            收合
          </button>
        )}
        {checklistChipItems.length === 0 && (
          <span className="rounded-md border border-emerald-300/70 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-300">
            所有檢查項目已完成
          </span>
        )}
      </div>

    </div>
  );
}
