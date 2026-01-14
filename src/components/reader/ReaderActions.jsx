import React from "react";
import { Button } from "@/components/ui/button";
import { Share2, Printer, PenBox, BarChart } from "lucide-react";

export function ReaderActions({
    canShare,
    onShareUrl,
    shareCopied,
    handleExportPdf,
    onEdit,
    extraActions,
    onToggleStats // New prop
}) {
    return (
        <div className="flex items-center gap-2 print:hidden">
             
            {/* Statistics Toggle */}
            <Button 
                variant="ghost" 
                size="icon" 
                title="統計資訊"
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
                title="分享連結"
                >
                <Share2 className="h-4 w-4" />
                </Button>
                {shareCopied && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    已複製
                </span>
                )}
            </div>
            )}
            <Button
            variant="ghost"
            size="icon"
            onClick={handleExportPdf}
            title="匯出 PDF"
            >
            <Printer className="h-4 w-4" />
            </Button>
            {onEdit && (
            <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                title="編輯劇本"
            >
                <PenBox className="h-4 w-4" />
            </Button>
            )}
            {extraActions}
        </div>
    );
}
