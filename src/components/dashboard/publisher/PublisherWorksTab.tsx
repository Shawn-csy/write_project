import React from "react";
import { Loader2, Grid3X3, Rows3 } from "lucide-react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Badge } from "../../ui/badge";
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
        <Card className="flex flex-col overflow-hidden border">
            <div className="border-b bg-background/50 p-4 backdrop-blur-sm">
                <PublisherTabHeader
                    title="作品管理"
                    description="快速檢視公開狀態、封面與授權缺漏，並直接編輯作品資訊。"
                    className="border-0 bg-transparent px-0 py-0"
                />
            </div>
            <div className="space-y-4 p-4 md:p-5">
            <div className="space-y-2 rounded-lg border bg-card p-2" data-guide-id="studio-works-filters">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                    <Button variant={s.filter === "all" ? "secondary" : "ghost"} size="sm" onClick={() => s.setFilter("all")} className="h-8 rounded-full text-xs">
                        {t("publisherWorksTab.filterAll")} ({s.stats.total})
                    </Button>
                    <Button variant={s.filter === "public" ? "secondary" : "ghost"} size="sm" onClick={() => s.setFilter("public")} className="h-8 rounded-full text-xs">
                        {t("publisherWorksTab.filterPublic")} ({s.stats.publicCount})
                    </Button>
                    <Button variant={s.filter === "private" ? "secondary" : "ghost"} size="sm" onClick={() => s.setFilter("private")} className="h-8 rounded-full text-xs">
                        {t("publisherWorksTab.filterPrivate")} ({s.stats.privateCount})
                    </Button>
                    <Button variant={s.coverFilter === "without" ? "secondary" : "ghost"} size="sm" onClick={() => s.setCoverFilter("without")} className="h-8 rounded-full text-xs">
                        缺封面
                    </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={s.showAdvancedFilters ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => s.setShowAdvancedFilters((prev) => !prev)}
                            className="h-8 rounded-full text-xs"
                        >
                            {s.showAdvancedFilters ? "收合進階" : "進階篩選"}
                        </Button>
                        {s.hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={() => { s.setFilter("all"); s.setCoverFilter("all"); }} className="h-8 rounded-full text-xs">
                                清除全部篩選
                            </Button>
                        )}
                    </div>
                </div>
                {s.showAdvancedFilters && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
                        <div className="flex items-center gap-2">
                            <Button variant={s.coverFilter === "with" ? "secondary" : "ghost"} size="sm" onClick={() => s.setCoverFilter("with")} className="h-8 rounded-full text-xs">
                                有封面
                            </Button>
                            <Button variant={s.coverFilter === "without" ? "secondary" : "ghost"} size="sm" onClick={() => s.setCoverFilter("without")} className="h-8 rounded-full text-xs">
                                缺封面
                            </Button>
                            {s.coverFilter !== "all" && (
                                <Button variant="ghost" size="sm" onClick={() => s.setCoverFilter("all")} className="h-8 rounded-full text-xs">
                                    清除封面篩選
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={s.sortKey} onValueChange={(value) => s.setSortKey(value as "updated_desc" | "updated_asc" | "title_asc" | "views_desc")}>
                                <SelectTrigger className="h-8 w-[180px] text-xs">
                                    <SelectValue placeholder="排序方式" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="updated_desc">最近更新</SelectItem>
                                    <SelectItem value="updated_asc">最早更新</SelectItem>
                                    <SelectItem value="views_desc">最多觀看</SelectItem>
                                    <SelectItem value="title_asc">標題 A-Z</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="inline-flex items-center gap-1 rounded-md border bg-background p-1">
                                <Button type="button" size="sm" variant={s.viewMode === "list" ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => s.setViewMode("list")} title={t("publisherWorksTab.viewList", "列表檢視")}>
                                    <Rows3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button type="button" size="sm" variant={s.viewMode === "grid" ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => s.setViewMode("grid")} title={t("publisherWorksTab.viewGrid", "卡片檢視")}>
                                    <Grid3X3 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
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
                    title={s.coverFilter === "with"
                        ? "沒有符合條件的有封面作品"
                        : s.coverFilter === "without"
                            ? "沒有符合條件的缺封面作品"
                            : s.filter === "all"
                                ? t("publisherWorksTab.emptyAll")
                                : s.filter === "public"
                                    ? t("publisherWorksTab.emptyPublic")
                                    : t("publisherWorksTab.emptyPrivate")}
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
                                    failedCover={!!s.failedCoverById[script.id]}
                                    onCoverError={s.onCoverError}
                                    {...sharedCardProps}
                                />
                            ))}
                        </div>
                    )}
                    {s.hasMore && (
                        <div className="pt-2 text-center">
                            <Button variant="outline" size="sm" onClick={s.loadMore}>
                                {t("publisherWorksTab.loadMore")}
                            </Button>
                        </div>
                    )}
                </>
            )}
            </div>
        </Card>
    );
}
