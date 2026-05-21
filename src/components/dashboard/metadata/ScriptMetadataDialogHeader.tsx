import { Globe2, Lock, CircleHelp } from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { DialogHeader, DialogTitle } from "../../ui/dialog";
import { ScriptMetadataChecklistHeader } from "./ScriptMetadataChecklistHeader";
import { useUIContext, useStatusContext, useChecklistContext } from "./ScriptMetadataDialogContext";

export function ScriptMetadataDialogHeader() {
    const { t } = useUIContext();
    const { status, setStatus, activeTab } = useStatusContext();
    const {
        startGuide,
        completedChecklistItems, totalChecklistItems, completionPercent,
        hasBlockingIssues, visibleChecklistChipItems, showAllChecklistChips,
        hiddenChecklistChipCount, checklistChipItems, maxVisibleChecklistChips,
        handleJumpToChecklistItem, setShowAllChecklistChips,
        handleFocusSection,
    } = useChecklistContext();
    const missingRequiredCount = checklistChipItems.filter((item) => item.type === "required").length;
    const canSetPublic = missingRequiredCount === 0;

    return (
        <DialogHeader className="border-b bg-background px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <DialogTitle className="text-xl font-semibold tracking-tight">
                            {t("scriptMetadataDialog.title")}
                        </DialogTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-8" onClick={startGuide}>
                            <CircleHelp className="mr-1.5 h-4 w-4" />
                            {t("scriptMetadataDialog.guide")}
                        </Button>
                        <div className="hidden sm:flex items-center gap-1 rounded-md border bg-background p-1">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={`h-7 px-2 text-xs ${
                                    status === "Private"
                                        ? "border-slate-600/60 bg-slate-500/15 text-slate-800 ring-2 ring-slate-500/40 dark:text-slate-200"
                                        : "border-border text-muted-foreground"
                                }`}
                                onClick={() => setStatus("Private")}
                            >
                                <Lock className="mr-1 h-3.5 w-3.5" />
                                {t("metadataBasic.setPrivate", "設定私人")}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!canSetPublic && status !== "Public"}
                                title={!canSetPublic && status !== "Public" ? `還缺 ${missingRequiredCount} 個必要項目` : undefined}
                                className={`h-7 px-2 text-xs ${
                                    status === "Public"
                                        ? "border-emerald-600/60 bg-emerald-500/15 text-emerald-800 ring-2 ring-emerald-500/40 dark:text-emerald-300"
                                        : "border-border text-muted-foreground"
                                }`}
                                onClick={() => setStatus("Public")}
                            >
                                <Globe2 className="mr-1 h-3.5 w-3.5" />
                                {t("metadataBasic.setPublic", "設定公開")}
                            </Button>
                        </div>
                        <Badge
                            id="metadata-status-badge"
                            variant="outline"
                            className={`text-xs font-medium ${
                                status === "Public"
                                    ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                    : "border-border text-muted-foreground bg-muted/40"
                            }`}
                        >
                            {status === "Public"
                                ? t("metadataBasic.public", "公開")
                                : t("metadataBasic.private", "私人")}
                        </Badge>
                    </div>
                </div>
                {!canSetPublic && status !== "Public" && (
                    <button
                        type="button"
                        className="w-fit text-xs font-medium text-destructive hover:underline"
                        onClick={() => {
                            const firstRequired = checklistChipItems.find((item) => item.type === "required");
                            if (firstRequired?.key) handleJumpToChecklistItem(firstRequired.key);
                        }}
                    >
                        還缺 {missingRequiredCount} 個必要項目，完成後才能設定公開
                    </button>
                )}
                <ScriptMetadataChecklistHeader
                    t={t}
                    completedChecklistItems={completedChecklistItems}
                    totalChecklistItems={totalChecklistItems}
                    completionPercent={completionPercent}
                    hasBlockingIssues={hasBlockingIssues}
                    visibleChecklistChipItems={visibleChecklistChipItems}
                    showAllChecklistChips={showAllChecklistChips}
                    hiddenChecklistChipCount={hiddenChecklistChipCount}
                    checklistChipItems={checklistChipItems}
                    maxVisibleChecklistChips={maxVisibleChecklistChips}
                    activeTab={activeTab}
                    jumpToChecklistItem={handleJumpToChecklistItem}
                    setShowAllChecklistChips={setShowAllChecklistChips}
                    focusSection={handleFocusSection}
                />
            </div>
        </DialogHeader>
    );
}
