import React from "react";

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
}) {
  return (
    <div id="metadata-guide-checklist" className="rounded-lg border border-border/70 bg-background p-2.5 shadow-sm">
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
      <div className="mt-2 grid grid-cols-2 gap-1 rounded-md border border-border/70 bg-background p-1 sm:grid-cols-3">
        {[
          { key: "basic", label: t("scriptMetadataDialog.tabBasic", "基本資料") },
          { key: "publish", label: t("scriptMetadataDialog.tabPublish", "發布設定") },
          { key: "exposure", label: t("scriptMetadataDialog.tabExposure", "曝光資訊") },
          { key: "activity", label: t("scriptMetadataDialog.tabActivity", "活動宣傳") },
          { key: "demo", label: "試聽範例" },
          { key: "advanced", label: t("scriptMetadataDialog.tabAdvanced", "進階設定") },
        ].map((item, idx) => (
          <button
            key={item.key}
            type="button"
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs sm:text-sm transition ${
              activeTab === item.key
                ? "border-primary bg-primary/15 text-primary shadow-sm ring-2 ring-primary/35"
                : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/60 hover:text-foreground"
            }`}
            onClick={() => focusSection(item.key)}
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                activeTab === item.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background text-muted-foreground"
              }`}
            >
              {idx + 1}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
