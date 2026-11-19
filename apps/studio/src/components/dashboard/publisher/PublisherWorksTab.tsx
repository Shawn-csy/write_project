import React from "react";
import { Loader2, Grid3X3, Rows3, Search, FilePlus2, SearchX } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { useI18n } from "../../../contexts/I18nContext";
import { StudioEmptyStateCard } from "../../common/StudioEmptyStateCard";
import { ListRowsSkeleton } from "../../studio/StudioSkeleton";
import { WorkScriptGridCard } from "./WorkScriptGridCard";
import { WorkScriptListCard, WORK_ROW_GRID } from "./WorkScriptListCard";
import { SegmentedControl } from "../../studio/SegmentedControl";
import { usePublisherWorksTabState } from "../../../hooks/publisher/usePublisherWorksTabState";
import type { PublisherScriptItem } from "../../../hooks/publisher/usePublisherWorksTabState";
import type { PersonaLike } from "../../../types/persona";
import type { StudioScriptCounts } from "../../../types/api";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../../ui/alert-dialog";

interface PublisherWorksTabProps {
    isLoading: boolean;
    scripts: PublisherScriptItem[];
    personas?: PersonaLike[];
    setEditingScript: (script: PublisherScriptItem) => void;
    formatDate: (value?: number) => string;
    onContinueEdit?: (script: PublisherScriptItem) => void;
    serverCounts?: StudioScriptCounts | null;
    externalPagination?: boolean;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void;
    onQueryChange?: (query: {
        filter: "all" | "needs_work" | "ready" | "published";
        q: string;
        sort: "updated_desc" | "updated_asc" | "title_asc" | "views_desc";
    }) => void;
    onDeleteScript?: (script: PublisherScriptItem) => Promise<void>;
    onCreateScript?: () => void;
}

const filterOptions = [
    { key: "all", label: "全部" },
    { key: "needs_work", label: "草稿" },
    { key: "ready", label: "可公開" },
    { key: "published", label: "已公開" },
] as const;

export function PublisherWorksTab({
    isLoading,
    scripts,
    personas = [],
    setEditingScript,
    formatDate,
    onContinueEdit,
    serverCounts,
    externalPagination = false,
    hasMore,
    isLoadingMore = false,
    onLoadMore,
    onQueryChange,
    onDeleteScript,
    onCreateScript,
}: PublisherWorksTabProps): React.JSX.Element {
    const { t } = useI18n();
    const [pendingDelete, setPendingDelete] = React.useState<PublisherScriptItem | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const s = usePublisherWorksTabState({
        scripts,
        personas,
        isLoading,
        serverCounts,
        externalPagination,
        externalHasMore: Boolean(hasMore),
        externalIsLoadingMore: isLoadingMore,
        onExternalLoadMore: onLoadMore,
        onQueryChange,
    });

    const sharedCardProps = {
        hasCover: s.hasCover,
        hasCompleteLicense: s.hasCompleteLicense,
        formatDate,
        onContinueEdit,
        onDeleteScript: onDeleteScript ? setPendingDelete : undefined,
        setEditingScript,
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex flex-wrap items-center gap-2">
                    <SegmentedControl
                        ariaLabel="狀態篩選"
                        value={s.filter}
                        onChange={(value) => s.setFilter(value)}
                        options={filterOptions.map((item) => ({ value: item.key, label: item.label, count: s.filteredStatusCounts[item.key] }))}
                    />
                    {s.hasActiveFilters && (
                        <Button type="button" variant="ghost" size="sm" onClick={s.clearFilters} aria-label="清除作品篩選">
                            清除篩選
                        </Button>
                    )}
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 lg:ml-auto">
                    <div className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:w-60 sm:flex-none">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={s.query}
                            onChange={(event) => s.setQuery(event.target.value)}
                            placeholder="搜尋標題、標籤"
                            aria-label="搜尋作品"
                            type="search"
                            className="h-11 w-full pl-9 sm:h-9"
                        />
                    </div>
                    <Select value={s.sortKey} onValueChange={(value) => s.setSortKey(value as "updated_desc" | "updated_asc" | "title_asc" | "views_desc")}>
                        <SelectTrigger aria-label="作品排序" className="h-11 w-[136px] shrink-0 whitespace-nowrap sm:h-9">
                            <SelectValue placeholder="排序" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="updated_desc">最近更新</SelectItem>
                            <SelectItem value="views_desc">最多觀看</SelectItem>
                            <SelectItem value="title_asc">標題 A-Z</SelectItem>
                            <SelectItem value="updated_asc">最早更新</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="inline-flex items-center rounded-md border border-border p-0.5">
                        <Button type="button" size="sm" variant={s.viewMode === "list" ? "secondary" : "ghost"} className="h-10 w-10 px-0 sm:h-8 sm:w-8" onClick={() => s.setViewMode("list")} aria-label={t("publisherWorksTab.viewList", "列表檢視")} title={t("publisherWorksTab.viewList", "列表檢視")}>
                            <Rows3 className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="sm" variant={s.viewMode === "grid" ? "secondary" : "ghost"} className="h-10 w-10 px-0 sm:h-8 sm:w-8" onClick={() => s.setViewMode("grid")} aria-label={t("publisherWorksTab.viewGrid", "卡片檢視")} title={t("publisherWorksTab.viewGrid", "卡片檢視")}>
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <ListRowsSkeleton label={t("common.loading", "載入中")} />
            ) : !s.hasAnyScripts && !s.hasActiveFilters ? (
                <StudioEmptyStateCard
                    icon={FilePlus2}
                    title={t("publisherWorksTab.emptyDemoTitle", "還沒有作品")}
                    actionLabel={t("publisherWorksTab.emptyCreateAction", "新增第一部台本")}
                    onAction={onCreateScript}
                />
            ) : s.sortedScripts.length === 0 ? (
                <StudioEmptyStateCard
                    icon={SearchX}
                    title={s.filter === "all"
                        ? t("publisherWorksTab.emptyAll")
                        : s.filter === "needs_work"
                            ? "沒有草稿"
                            : s.filter === "ready"
                                ? "沒有可公開作品"
                                : "沒有已公開作品"}
                    actionLabel={t("publisherWorksTab.clearFilters", "清除篩選")}
                    onAction={s.hasActiveFilters ? s.clearFilters : null}
                />
            ) : (
                <>
                    {s.viewMode === "grid" ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {s.visibleScripts.map((script) => (
                                <WorkScriptGridCard
                                    key={script.id}
                                    script={script}
                                    readiness={s.readinessById[script.id] || s.getReadiness(script)}
                                    failedCover={!!s.failedCoverById[script.id]}
                                    onCoverError={s.onCoverError}
                                    {...sharedCardProps}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-[10px] border border-border bg-card">
                            <div className={`hidden gap-x-4 border-b border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground sm:grid ${WORK_ROW_GRID}`}>
                                <span>作品</span>
                                <span>狀態</span>
                                <span>更新</span>
                                <span className="text-right">操作</span>
                            </div>
                            {s.visibleScripts.map((script) => (
                                <WorkScriptListCard
                                    key={script.id}
                                    script={script}
                                    readiness={s.readinessById[script.id] || s.getReadiness(script)}
                                    failedCover={!!s.failedCoverById[script.id]}
                                    onCoverError={s.onCoverError}
                                    {...sharedCardProps}
                                />
                            ))}
                        </div>
                    )}
                    {(externalPagination ? hasMore : s.hasMore) && (
                        <div ref={s.loadMoreRef} className="text-center">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={externalPagination ? onLoadMore : s.loadMore}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                {t("publisherWorksTab.loadMore")}
                            </Button>
                        </div>
                    )}
                </>
            )}
            <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => {
                if (!open && !isDeleting) setPendingDelete(null);
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>刪除此未公開作品？</AlertDialogTitle>
                        <AlertDialogDescription>
                            「{pendingDelete?.title || "未命名"}」及其內容會永久刪除，這個動作無法復原。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={(event) => {
                                event.preventDefault();
                                if (!pendingDelete || !onDeleteScript) return;
                                setIsDeleting(true);
                                void onDeleteScript(pendingDelete)
                                    .then(() => setPendingDelete(null))
                                    .catch(() => undefined)
                                    .finally(() => setIsDeleting(false));
                            }}
                        >
                            {isDeleting ? "刪除中…" : "確認刪除"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
