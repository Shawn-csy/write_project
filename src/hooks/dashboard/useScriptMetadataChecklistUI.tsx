import { useMemo } from "react";

export function useScriptMetadataChecklistUI({
  publishChecklist,
  showValidationHints,
  showAllChecklistChips,
  status,
}) {
  const requiredErrorMap = useMemo(
    () => ({
      title: showValidationHints && publishChecklist.missingRequired.some((item) => item.key === "title"),
      identity: showValidationHints && publishChecklist.missingRequired.some((item) => item.key === "identity"),
      audience: showValidationHints && publishChecklist.missingRequired.some((item) => item.key === "audience"),
      rating: showValidationHints && publishChecklist.missingRequired.some((item) => item.key === "rating"),
      license: showValidationHints && publishChecklist.missingRequired.some((item) => item.key === "license"),
    }),
    [showValidationHints, publishChecklist.missingRequired]
  );

  const recommendedErrorMap = useMemo(
    () => ({
      cover: showValidationHints && publishChecklist.missingRecommended.some((item) => item.key === "cover"),
      synopsis: showValidationHints && publishChecklist.missingRecommended.some((item) => item.key === "synopsis"),
      tags: showValidationHints && publishChecklist.missingRecommended.some((item) => item.key === "tags"),
    }),
    [showValidationHints, publishChecklist.missingRecommended]
  );

  const requiredTotal = publishChecklist.required.length;
  const recommendedTotal = publishChecklist.recommended.length;
  const completedRequired = requiredTotal - publishChecklist.missingRequired.length;
  const completedRecommended = recommendedTotal - publishChecklist.missingRecommended.length;
  const totalChecklistItems = requiredTotal + recommendedTotal;
  const completedChecklistItems = completedRequired + completedRecommended;
  const completionPercent = totalChecklistItems > 0 ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 0;
  const hasBlockingIssues = status === "Public" && publishChecklist.missingRequired.length > 0;

  const checklistChipItems = useMemo(
    () => [
      ...publishChecklist.missingRequired.map((item) => ({ ...item, type: "required" })),
      ...publishChecklist.missingRecommended.map((item) => ({ ...item, type: "recommended" })),
    ],
    [publishChecklist.missingRequired, publishChecklist.missingRecommended]
  );

  const maxVisibleChecklistChips = 4;
  const hiddenChecklistChipCount = Math.max(0, checklistChipItems.length - maxVisibleChecklistChips);
  const visibleChecklistChipItems = showAllChecklistChips ? checklistChipItems : checklistChipItems.slice(0, maxVisibleChecklistChips);

  const missingRequiredMap = useMemo(
    () => Object.fromEntries(publishChecklist.missingRequired.map((item) => [item.key, true])),
    [publishChecklist.missingRequired]
  );

  const rowLabelBaseClass = "p-4 text-sm font-medium text-foreground";
  const rowLabelToneClass = {
    required: "border-l-[5px] border-sky-600 bg-sky-100/80 text-sky-950 dark:border-sky-500 dark:bg-sky-950/25 dark:text-foreground",
    recommended: "border-l-[5px] border-amber-600 bg-amber-100/80 text-amber-950 dark:border-amber-500 dark:bg-amber-950/25 dark:text-foreground",
    advanced: "border-l-[5px] border-fuchsia-600 bg-fuchsia-100/80 text-fuchsia-950 dark:border-fuchsia-500 dark:bg-fuchsia-950/25 dark:text-foreground",
  };

  const getRowLabelClass = (tone = "recommended") => `${rowLabelBaseClass} ${rowLabelToneClass[tone] || rowLabelToneClass.recommended}`;
  const withRequiredHighlight = (baseClass, missing) =>
    missing ? `${baseClass} border-l-[6px] border-destructive bg-destructive/20 ring-2 ring-inset ring-destructive/55 dark:bg-destructive/30` : baseClass;
  const renderRowLabel = (label, tone = "recommended", missing = false, hint = "") => (
    <div className={withRequiredHighlight(getRowLabelClass(tone), missing)}>
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {missing && (
          <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-destructive-foreground">
            必填未完成
          </span>
        )}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );

  return {
    requiredErrorMap,
    recommendedErrorMap,
    completedChecklistItems,
    totalChecklistItems,
    completionPercent,
    hasBlockingIssues,
    checklistChipItems,
    maxVisibleChecklistChips,
    hiddenChecklistChipCount,
    visibleChecklistChipItems,
    missingRequiredMap,
    getRowLabelClass,
    renderRowLabel,
  };
}
