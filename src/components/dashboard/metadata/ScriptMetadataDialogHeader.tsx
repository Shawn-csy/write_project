import { DialogHeader, DialogTitle } from "../../ui/dialog";
import { ScriptMetadataChecklistHeader } from "./ScriptMetadataChecklistHeader";
import { useUIContext, useStatusContext, useChecklistContext } from "./ScriptMetadataDialogContext";

export function ScriptMetadataDialogHeader() {
    const { t } = useUIContext();
    const { status, activeTab } = useStatusContext();
    const {
        completedChecklistItems, totalChecklistItems, completionPercent,
        hasBlockingIssues, visibleChecklistChipItems, showAllChecklistChips,
        hiddenChecklistChipCount, checklistChipItems, maxVisibleChecklistChips,
        handleJumpToChecklistItem, setShowAllChecklistChips,
        handleFocusSection,
    } = useChecklistContext();
    const missingRequiredCount = checklistChipItems.filter((item) => item.type === "required").length;
    const canSetPublic = missingRequiredCount === 0;

    return (
        <DialogHeader className="border-b bg-background px-4 py-3 sm:px-5 sm:py-3">
            <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <DialogTitle className="text-base font-semibold tracking-tight">
                            {t("scriptMetadataDialog.title")}
                        </DialogTitle>
                    </div>
                    <div className="mr-6 flex items-center gap-2">
                        <span id="metadata-status-badge" className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                            儲存後：{status === "Public" ? "公開" : "私人"}
                        </span>
                    </div>
                </div>
                <p className="text-left text-xs text-muted-foreground">公開狀態與資料會在儲存後生效。</p>
                {!canSetPublic && status !== "Public" && (
                    <button
                        type="button"
                        className="w-fit text-xs font-medium text-destructive hover:underline"
                        onClick={() => {
                            const firstRequired = checklistChipItems.find((item) => item.type === "required");
                            if (firstRequired?.key) handleJumpToChecklistItem(firstRequired.key);
                        }}
                    >
                        還缺 {missingRequiredCount} 個必要項目，完成後才能儲存為公開
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
