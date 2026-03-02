import React from "react";
import { Button } from "@/components/ui/button";
import { Share2, PenBox, BarChart, MoreHorizontal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    const enabledDownloadOptions = (downloadOptions || []).filter((opt) => !opt?.hidden);

    return (
        <div className="flex items-center gap-2 print:hidden">
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
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        title={t("readerActions.more")}
                        aria-label={t("readerActions.more")}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{t("readerActions.more")}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={onToggleStats}>
                        <BarChart className="w-4 h-4 mr-2" />
                        {t("readerActions.stats")}
                    </DropdownMenuItem>
                    {canShare && (
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onShareUrl?.(e);
                            }}
                        >
                            <Share2 className="h-4 w-4 mr-2" />
                            {shareCopied ? `${t("readerActions.share")} (${t("readerActions.copied")})` : t("readerActions.share")}
                        </DropdownMenuItem>
                    )}
                    {enabledDownloadOptions.length > 0 && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t("common.download")}</DropdownMenuLabel>
                            {enabledDownloadOptions.map((opt) => (
                                <DropdownMenuItem
                                    key={opt.id}
                                    disabled={Boolean(opt.disabled)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        opt.onClick?.(e);
                                    }}
                                >
                                    {opt.icon ? <opt.icon className="w-4 h-4 mr-2" /> : null}
                                    {opt.label}
                                </DropdownMenuItem>
                            ))}
                        </>
                    )}
                    {extraActions ? (
                        <>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1">{extraActions}</div>
                        </>
                    ) : null}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
