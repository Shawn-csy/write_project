import { Globe2, Lock, CircleHelp } from "lucide-react";
import { Button } from "../../ui/button";
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
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title={t("scriptMetadataDialog.guide")}
                            onClick={startGuide}
                        >
                            <CircleHelp className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1 rounded-md border bg-background p-1">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={`h-7 px-2 text-xs transition-colors ${
                                    status === "Private"
                                        ? "border-red-500/60 bg-red-500/10 text-red-700 ring-2 ring-red-400/40 dark:text-red-300"
                                        : "border-border text-muted-foreground hover:border-red-400/50 hover:bg-red-500/5 hover:text-red-600 dark:hover:text-red-400"
                                }`}
                                onClick={() => setStatus("Private")}
                            >
                                <Lock className="mr-1 h-3.5 w-3.5" />
                                {status === "Private"
                                    ? t("metadataBasic.private", "私人")
                                    : t("metadataBasic.setPrivateActive", "設定為私人")}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!canSetPublic && status !== "Public"}
                                title={!canSetPublic && status !== "Public" ? `還缺 ${missingRequiredCount} 個必要項目` : undefined}
                                className={`h-7 px-2 text-xs transition-colors ${
                                    status === "Public"
                                        ? "border-emerald-600/60 bg-emerald-500/15 text-emerald-800 ring-2 ring-emerald-500/40 dark:text-emerald-300"
                                        : "border-border text-muted-foreground hover:border-emerald-400/50 hover:bg-emerald-500/5 hover:text-emerald-700 dark:hover:text-emerald-400"
                                }`}
                                onClick={() => setStatus("Public")}
                            >
                                <Globe2 className="mr-1 h-3.5 w-3.5" />
                                {status === "Public"
                                    ? t("metadataBasic.public", "公開")
                                    : t("metadataBasic.setPublicActive", "設定為公開")}
                            </Button>
                        </div>
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
