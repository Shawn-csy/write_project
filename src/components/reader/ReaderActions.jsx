import React from "react";
import { Button } from "@/components/ui/button";
import { Share2, PenBox, BarChart } from "lucide-react";
import { DownloadMenu } from "@/components/common/DownloadMenu";
import { useI18n } from "../../contexts/I18nContext";

export function ReaderActions({
    canShare,
    onShareUrl,
    shareCopied,
    downloadOptions = [],
    onEdit,
    extraActions,
    onToggleStats // New prop
}) {
    const { t } = useI18n();
    return (
        <div className="flex items-center gap-2 print:hidden">
             
            {/* Statistics Toggle */}
            <Button 
                variant="ghost" 
                size="icon" 
                title={t("readerActions.stats")}
                onClick={onToggleStats}
            >
                <BarChart className="w-4 h-4" />
            </Button>

            {/* Share Button (if enabled) */}
            {canShare && (
            <div className="flex items-center gap-2">
                <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                    e.stopPropagation();
                    onShareUrl?.(e);
                }}
                title={t("readerActions.share")}
                >
                <Share2 className="h-4 w-4" />
                </Button>
                {shareCopied && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {t("readerActions.copied")}
                </span>
                )}
            </div>
            )}
            <DownloadMenu options={downloadOptions} title={t("common.download")} />
            {onEdit && (
            <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                title={t("readerActions.editScript")}
            >
                <PenBox className="h-4 w-4" />
            </Button>
            )}
            {extraActions}
        </div>
    );
}
