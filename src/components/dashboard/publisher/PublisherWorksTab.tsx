import React from "react";
import { Loader2, Grid3X3, Rows3, Search } from "lucide-react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { CoverPlaceholder } from "../../ui/CoverPlaceholder";
import { useI18n } from "../../../contexts/I18nContext";
import { Edit, FilePenLine } from "lucide-react";
import { PublisherTabHeader } from "./PublisherTabHeader";
import { PublisherEmptyState } from "./PublisherEntityLayout";
import { WorkScriptGridCard } from "./WorkScriptGridCard";
import { WorkScriptListCard } from "./WorkScriptListCard";
import { usePublisherWorksTabState } from "../../../hooks/publisher/usePublisherWorksTabState";
import type { PublisherScriptItem } from "../../../hooks/publisher/usePublisherWorksTabState";
import type { PersonaLike } from "../../../types/persona";

interface PublisherWorksTabProps {
    isLoading: boolean;
    scripts: PublisherScriptItem[];
    personas?: PersonaLike[];
    setEditingScript: (script: PublisherScriptItem) => void;
    navigate: (to: string) => void;
    formatDate: (value?: number) => string;
    onContinueEdit?: (script: PublisherScriptItem) => void;
}

const warningBadgeClass = "h-5 border-[color:var(--license-term-border)] bg-[color:var(--license-term-bg)] text-[10px] font-semibold text-[color:var(--license-term-fg)]";
const errorBadgeClass = "h-5 border-destructive/40 bg-destructive/10 text-[10px] font-semibold text-destructive";
const filterOptions = [
    { key: "all", label: "全部" },
    { key: "needs_work", label: "待處理" },
    { key: "ready", label: "可公開" },
    { key: "published", label: "已公開" },
] as const;

export function PublisherWorksTab({ isLoading, scripts, personas = [], setEditingScript, navigate, formatDate, onContinueEdit }: PublisherWorksTabProps): React.JSX.Element {
    const { t } = useI18n();
    const s = usePublisherWorksTabState({ scripts, personas, isLoading });

    const sharedCardProps = {
        hasCover: s.hasCover,
        hasCompleteLicense: s.hasCompleteLicense,
        statusBadgeClass: s.statusBadgeClass,
        formatDate,
        onContinueEdit,
        setEditingScript,
        navigate,
    };

    return (
        <div className="flex flex-col gap-4">
            <PublisherTabHeader
                title="發布工作台"
                description="依發布準備度檢視作品，快速補齊必要資料或檢查已公開內容。"
            />
            <div className="space-y-4">
            {/* 工具列：篩選 pill + 搜尋 + 排序 + 檢視切換 */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" data-guide-id="studio-works-filters">
                {/* 左：篩選 pills */}
                <div className="flex flex-wrap items-center gap-1">
                    {filterOptions.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => s.setFilter(item.key)}
                            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
                                s.filter === item.key
                                    ? "bg-foreground text-background"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            {item.label}
                            <span className={`font-mono text-[10px] tabular-nums ${s.filter === item.key ? "opacity-60" : "opacity-50"}`}>
                                {s.filteredStatusCounts[item.key]}
                            </span>
                        </button>
                    ))}
                    {s.hasActiveFilters && (
                        <button
                            type="button"
                            onClick={s.clearFilters}
                            className="inline-flex h-7 items-center rounded-md px-2 text-[11px] text-muted-foreground/50 hover:text-muted-foreground"
                        >
                            ✕
                        </button>
                    )}
                </div>
                {/* 右：搜尋 + 排序 + 檢視 */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
                        <Input
                            value={s.query}
                            onChange={(event) => s.setQuery(event.target.value)}
                            placeholder="搜尋作品..."
                            className="h-8 w-[180px] border-border/50 bg-transparent pl-8 text-xs placeholder:text-muted-foreground/40 focus-visible:border-border focus-visible:w-[240px] transition-all duration-200"
                        />
                    </div>
                    <Select value={s.sortKey} onValueChange={(value) => s.setSortKey(value as "updated_desc" | "updated_asc" | "title_asc" | "views_desc")}>
                        <SelectTrigger className="h-8 w-[120px] border-border/50 bg-transparent text-xs">
                            <SelectValue placeholder="排序" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="updated_desc">最近更新</SelectItem>
                            <SelectItem value="views_desc">最多觀看</SelectItem>
                            <SelectItem value="title_asc">標題 A-Z</SelectItem>
                            <SelectItem value="updated_asc">最早更新</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="inline-flex items-center rounded-md border border-border/50 p-0.5">
                        <Button type="button" size="sm" variant={s.viewMode === "list" ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => s.setViewMode("list")} title={t("publisherWorksTab.viewList", "列表檢視")}>
                            <Rows3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="sm" variant={s.viewMode === "grid" ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => s.setViewMode("grid")} title={t("publisherWorksTab.viewGrid", "卡片檢視")}>
                            <Grid3X3 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div>
            ) : !s.hasAnyScripts ? (
                <Card className="border-dashed p-5 md:p-6">
                    <div className="mb-4">
                        <h4 className="text-base font-semibold">{t("publisherWorksTab.emptyDemoTitle", "這是作品管理示範")}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("publisherWorksTab.emptyDemoDesc", "建立第一部作品後，這裡會顯示公開狀態、封面、授權檢查與編輯入口。")}
                        </p>
                    </div>
                    <Card className="flex flex-col overflow-hidden border bg-muted/20 sm:flex-row">
                        <div className="relative h-32 w-full shrink-0 bg-muted sm:w-32">
                            <CoverPlaceholder title={t("publisherWorksTab.emptyDemoScriptTitle", "示範劇本標題")} compact />
                        </div>
                        <div className="flex flex-1 flex-col justify-between p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-serif text-lg font-semibold">{t("publisherWorksTab.emptyDemoScriptTitle", "示範劇本標題")}</h3>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{t("publisherWorksTab.updatedAt")}：{formatDate(Date.now())}</span>
                                        <span>•</span>
                                        <Badge variant="outline" className="h-5 border-border bg-muted text-[10px] font-semibold text-foreground">
                                            {t("publisherWorksTab.statusPrivate")}
                                        </Badge>
                                        <Badge variant="outline" className={warningBadgeClass}>
                                            {t("publisherWorksTab.missingCoverBadge", "缺封面")}
                                        </Badge>
                                        <Badge variant="outline" className={errorBadgeClass}>
                                            {t("publisherWorksTab.missingLicenseBadge", "缺授權")}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button size="sm" disabled>
                                    <FilePenLine className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.continueWriting")}
                                </Button>
                                <Button size="sm" variant="outline" disabled data-guide-id="studio-works-edit-info">
                                    <Edit className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.editInfo")}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </Card>
            ) : s.sortedScripts.length === 0 ? (
                <PublisherEmptyState
                    title={s.filter === "all"
                        ? t("publisherWorksTab.emptyAll")
                        : s.filter === "needs_work"
                            ? "沒有待處理作品"
                            : s.filter === "ready"
                                ? "沒有可公開作品"
                                : "沒有已公開作品"}
                    description="調整篩選條件後再試一次。"
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
                        <div className="grid gap-3">
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
                    {s.hasMore && (
                        <div ref={s.loadMoreRef} className="pt-3 text-center">
                            <Button variant="ghost" size="sm" onClick={s.loadMore} className="h-8 px-6 text-xs text-muted-foreground hover:text-foreground">
                                {t("publisherWorksTab.loadMore")} ↓
                            </Button>
                        </div>
                    )}
                </>
            )}
            </div>
        </div>
    );
}
