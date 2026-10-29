import { useMemo } from "react";
import type { PublishChecklist } from "./types";

export function useScriptMetadataChecklistUI({
  publishChecklist,
  showValidationHints,
  showAllChecklistChips,
  status,
}: {
  publishChecklist: PublishChecklist & {
    required: Array<{ key: string; label: string }>;
    recommended: Array<{ key: string; label: string }>;
    missingRequired: Array<{ key: string; label: string }>;
    missingRecommended: Array<{ key: string; label: string }>;
  };
  showValidationHints: boolean;
  showAllChecklistChips: boolean;
  status: string;
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

  const rowLabelBaseClass = "px-3 py-2 text-xs font-medium text-foreground";
  const rowLabelToneClass = {
    required: "bg-muted/30",
    recommended: "bg-muted/20",
    advanced: "bg-muted/20",
  };

  const getRowLabelClass = (tone = "recommended") => `${rowLabelBaseClass} ${rowLabelToneClass[tone as keyof typeof rowLabelToneClass] || rowLabelToneClass.recommended}`;
  const withRequiredHighlight = (baseClass: string, missing: boolean) =>
    missing ? `${baseClass} border-l-2 border-destructive bg-destructive/5` : baseClass;
  const renderRowLabel = (label: string, tone = "recommended", missing = false, hint = "") => (
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
