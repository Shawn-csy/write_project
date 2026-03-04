import React from "react";
import { Loader2, Eye, Edit, FilePenLine, Grid3X3, Rows3 } from "lucide-react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { CoverPlaceholder } from "../../ui/CoverPlaceholder";
import { useI18n } from "../../../contexts/I18nContext";
import { extractMetadataWithRaw } from "../../../lib/metadataParser";
import { PublisherTabHeader } from "./PublisherTabHeader";

export function PublisherWorksTab({ isLoading, scripts, setEditingScript, navigate, formatDate, onContinueEdit }) {
    const { t } = useI18n();
    const [filter, setFilter] = React.useState("all"); // all, public, private
    const [coverFilter, setCoverFilter] = React.useState("all"); // all, with, without
    const [viewMode, setViewMode] = React.useState("list"); // list, grid
    const [sortKey, setSortKey] = React.useState("updated_desc"); // updated_desc, updated_asc, title_asc, views_desc
    const [failedCoverById, setFailedCoverById] = React.useState({});
    const INITIAL_VISIBLE = 12;
    const PREFETCH_STEP = 24;
    const [visibleCount, setVisibleCount] = React.useState(INITIAL_VISIBLE);
    const hasCover = (value) => Boolean(String(value || "").trim());
    const metadataById = React.useMemo(() => {
        const entries = (scripts || []).map((script) => {
            const meta = extractMetadataWithRaw(script?.content || "").meta || {};
            return [script.id, meta];
        });
        return Object.fromEntries(entries);
    }, [scripts]);
    const hasCompleteLicense = React.useCallback((script) => {
        const meta = metadataById[script?.id] || {};
        const commercial = String(script?.licenseCommercial || meta.licensecommercial || "").trim();
        const derivative = String(script?.licenseDerivative || meta.licensederivative || "").trim();
        const notify = String(script?.licenseNotify || meta.licensenotify || "").trim();
        return Boolean(commercial && derivative && notify);
    }, [metadataById]);
    const statusBadgeClass = (script) => {
        const isPublic = script?.status === "Public" || script?.isPublic;
        return isPublic
            ? "border-emerald-900 bg-emerald-700 text-white shadow-sm shadow-emerald-900/30 ring-1 ring-emerald-500/40 hover:bg-emerald-700"
            : "border-slate-700 bg-slate-600 text-white hover:bg-slate-600";
    };

    const stats = React.useMemo(() => {
        let publicCount = 0;
        let privateCount = 0;
        (scripts || []).forEach((script) => {
            const isPublic = script.status === "Public" || script.isPublic;
            if (isPublic) publicCount += 1;
            else privateCount += 1;
        });
        return { total: (scripts || []).length, publicCount, privateCount };
    }, [scripts]);
    const hasAnyScripts = (scripts || []).length > 0;

    const filteredScripts = React.useMemo(() => {
        return (scripts || []).filter((script) => {
            const isPublic = script.status === "Public" || script.isPublic;
            if (filter === "public" && !isPublic) return false;
            if (filter === "private" && isPublic) return false;
            if (coverFilter === "with" && !hasCover(script.coverUrl)) return false;
            if (coverFilter === "without" && hasCover(script.coverUrl)) return false;
            return true;
        });
    }, [scripts, filter, coverFilter]);
    const hasActiveFilters = filter !== "all" || coverFilter !== "all";

    const sortedScripts = React.useMemo(() => {
        const list = [...filteredScripts];
        list.sort((a, b) => {
            const aTitle = String(a?.title || "");
            const bTitle = String(b?.title || "");
            const aUpdated = Number(a?.lastModified || a?.updatedAt || 0);
            const bUpdated = Number(b?.lastModified || b?.updatedAt || 0);
            const aViews = Number(a?.views || 0);
            const bViews = Number(b?.views || 0);
            if (sortKey === "title_asc") return aTitle.localeCompare(bTitle, "zh-Hant");
            if (sortKey === "updated_asc") return aUpdated - bUpdated;
            if (sortKey === "views_desc") return bViews - aViews;
            return bUpdated - aUpdated;
        });
        return list;
    }, [filteredScripts, sortKey]);

    React.useEffect(() => {
        setVisibleCount(INITIAL_VISIBLE);
    }, [filter, coverFilter, sortKey, scripts]);

    React.useEffect(() => {
        setFailedCoverById({});
    }, [scripts]);

    React.useEffect(() => {
        if (isLoading) return;
        if (visibleCount >= sortedScripts.length) return;

        let cancelled = false;
        let idleId = null;
        let timerId = null;

        const prefetchNextBatch = () => {
            if (cancelled) return;
            setVisibleCount((prev) => Math.min(prev + PREFETCH_STEP, sortedScripts.length));
        };

        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
            idleId = window.requestIdleCallback(prefetchNextBatch, { timeout: 300 });
        } else {
            timerId = window.setTimeout(prefetchNextBatch, 120);
        }

        return () => {
            cancelled = true;
            if (idleId !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
                window.cancelIdleCallback(idleId);
            }
            if (timerId !== null) {
                window.clearTimeout(timerId);
            }
        };
    }, [sortedScripts.length, isLoading, visibleCount]);

    const visibleScripts = React.useMemo(
        () => sortedScripts.slice(0, visibleCount),
        [sortedScripts, visibleCount]
    );
    const hasMore = visibleCount < sortedScripts.length;
    const loadMore = React.useCallback(() => {
        setVisibleCount((prev) => Math.min(prev + PREFETCH_STEP, sortedScripts.length));
    }, [sortedScripts.length]);

    return (
        <div className="grid gap-4">
            <PublisherTabHeader
                title="作品管理"
                description="快速檢視公開狀態、封面與授權缺漏，並直接編輯作品資訊。"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-2" data-guide-id="studio-works-filters">
                <div className="flex items-center gap-2">
                    <Button
                        variant={filter === "all" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setFilter("all")}
                        className="h-8 rounded-full text-xs"
                    >
                        {t("publisherWorksTab.filterAll")} ({stats.total})
                    </Button>
                    <Button
                        variant={filter === "public" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setFilter("public")}
                        className="h-8 rounded-full text-xs"
                    >
                        {t("publisherWorksTab.filterPublic")} ({stats.publicCount})
                    </Button>
                    <Button
                        variant={filter === "private" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setFilter("private")}
                        className="h-8 rounded-full text-xs"
                    >
                        {t("publisherWorksTab.filterPrivate")} ({stats.privateCount})
                    </Button>
                    <Button
                        variant={coverFilter === "with" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setCoverFilter("with")}
                        className="h-8 rounded-full text-xs"
                    >
                        有封面
                    </Button>
                    <Button
                        variant={coverFilter === "without" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setCoverFilter("without")}
                        className="h-8 rounded-full text-xs"
                    >
                        缺封面
                    </Button>
                    {coverFilter !== "all" && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCoverFilter("all")}
                            className="h-8 rounded-full text-xs"
                        >
                            清除封面篩選
                        </Button>
                    )}
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setFilter("all");
                                setCoverFilter("all");
                            }}
                            className="h-8 rounded-full text-xs"
                        >
                            清除全部篩選
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Select value={sortKey} onValueChange={setSortKey}>
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
                        <Button
                            type="button"
                            size="sm"
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            className="h-7 px-2"
                            onClick={() => setViewMode("list")}
                            title={t("publisherWorksTab.viewList", "列表檢視")}
                        >
                            <Rows3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                            className="h-7 px-2"
                            onClick={() => setViewMode("grid")}
                            title={t("publisherWorksTab.viewGrid", "卡片檢視")}
                        >
                            <Grid3X3 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div>
            ) : !hasAnyScripts ? (
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
                                        <Badge variant="outline" className="h-5 border-slate-700 bg-slate-600 text-[10px] font-semibold text-white">
                                            {t("publisherWorksTab.statusPrivate")}
                                        </Badge>
                                        <Badge variant="outline" className="h-5 border-amber-500 bg-amber-50 text-[10px] font-semibold text-amber-700">
                                            {t("publisherWorksTab.missingCoverBadge", "缺封面")}
                                        </Badge>
                                        <Badge variant="outline" className="h-5 border-rose-500 bg-rose-50 text-[10px] font-semibold text-rose-700">
                                            {t("publisherWorksTab.missingLicenseBadge", "缺授權")}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button size="sm" variant="secondary" disabled>
                                    <FilePenLine className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.continueWriting")}
                                </Button>
                                <Button size="sm" variant="ghost" disabled data-guide-id="studio-works-edit-info">
                                    <Edit className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.editInfo")}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </Card>
            ) : sortedScripts.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 border rounded-lg border-dashed">
                    {coverFilter === "with"
                        ? "沒有符合條件的有封面作品"
                        : coverFilter === "without"
                            ? "沒有符合條件的缺封面作品"
                            : filter === "all"
                                ? t("publisherWorksTab.emptyAll")
                                : filter === "public"
                                    ? t("publisherWorksTab.emptyPublic")
                                    : t("publisherWorksTab.emptyPrivate")}
                </div>
            ) : (
                <>
                    {viewMode === "grid" ? (
                        <div
                            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        >
                            {visibleScripts.map((script) => (
                                <Card key={script.id} className="overflow-hidden p-0">
                                    <div className="aspect-[2/3] w-full bg-muted/30">
                                        {hasCover(script.coverUrl) && !failedCoverById[script.id] ? (
                                            <img
                                                src={script.coverUrl}
                                                alt={script.title}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                                onError={() => setFailedCoverById((prev) => ({ ...prev, [script.id]: true }))}
                                            />
                                        ) : (
                                            <CoverPlaceholder title={script.title || t("publisherWorksTab.noCover")} compact />
                                        )}
                                    </div>
                                    <div className="space-y-3 p-3">
                                        <div className="space-y-1">
                                            <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5">{script.title || "Untitled"}</h3>
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Badge variant="outline" className={`h-5 text-[10px] font-semibold ${statusBadgeClass(script)}`}>
                                                        {script.status === "Public" ? t("publisherWorksTab.statusPublic") : t("publisherWorksTab.statusPrivate")}
                                                    </Badge>
                                                    {!hasCover(script.coverUrl) && (
                                                        <Badge variant="outline" className="h-5 border-amber-500 bg-amber-50 text-[10px] font-semibold text-amber-700">
                                                            缺封面
                                                        </Badge>
                                                    )}
                                                    {!hasCompleteLicense(script) && (
                                                        <Badge variant="outline" className="h-5 border-rose-500 bg-rose-50 text-[10px] font-semibold text-rose-700">
                                                            缺授權
                                                        </Badge>
                                                    )}
                                                </div>
                                                {script.status === "Public" && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Eye className="h-3 w-3" />
                                                        {script.views || 0}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                {t("publisherWorksTab.updatedAt")}：{formatDate(script.lastModified)}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            <Button variant="secondary" size="sm" className="h-8 justify-start" onClick={() => onContinueEdit?.(script)}>
                                                <FilePenLine className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.continueWriting")}
                                            </Button>
                                            <div className="flex gap-1.5">
                                                <Button variant="ghost" size="sm" className="h-8 flex-1 justify-start" onClick={() => setEditingScript(script)} data-guide-id="studio-works-edit-info">
                                                    <Edit className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.editInfo")}
                                                </Button>
                                                {script.status === "Public" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 flex-1 justify-start text-muted-foreground hover:text-foreground"
                                                        onClick={() => navigate(`/read/${script.id}`)}
                                                    >
                                                        <Eye className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.viewPublicPage")}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {visibleScripts.map((script) => (
                                <Card key={script.id} className="flex flex-col overflow-hidden sm:flex-row">
                                    <div className="relative h-32 w-full shrink-0 bg-muted sm:w-32">
                                        {hasCover(script.coverUrl) && !failedCoverById[script.id] ? (
                                            <img
                                                src={script.coverUrl}
                                                alt={script.title}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                                onError={() => setFailedCoverById((prev) => ({ ...prev, [script.id]: true }))}
                                            />
                                        ) : (
                                            <CoverPlaceholder title={script.title || t("publisherWorksTab.noCover")} compact />
                                        )}
                                    </div>
                                    <div className="flex flex-1 flex-col justify-between p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-serif text-lg font-semibold">{script.title}</h3>
                                                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{t("publisherWorksTab.updatedAt")}：{formatDate(script.lastModified)}</span>
                                                    <span>•</span>
                                                    <Badge variant="outline" className={`h-5 text-[10px] font-semibold ${statusBadgeClass(script)}`}>
                                                        {script.status === "Public" ? t("publisherWorksTab.statusPublic") : t("publisherWorksTab.statusPrivate")}
                                                    </Badge>
                                                    {!hasCover(script.coverUrl) && (
                                                        <Badge variant="outline" className="h-5 border-amber-500 bg-amber-50 text-[10px] font-semibold text-amber-700">
                                                            缺封面
                                                        </Badge>
                                                    )}
                                                    {!hasCompleteLicense(script) && (
                                                        <Badge variant="outline" className="h-5 border-rose-500 bg-rose-50 text-[10px] font-semibold text-rose-700">
                                                            缺授權
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            {script.status === "Public" && (
                                                <div className="flex gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1"><Eye className="h-4 w-4" /> {script.views || 0}</div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-2">
                                            <Button variant="secondary" size="sm" className="h-8" onClick={() => onContinueEdit?.(script)}>
                                                <FilePenLine className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.continueWriting")}
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditingScript(script)} data-guide-id="studio-works-edit-info">
                                                <Edit className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.editInfo")}
                                            </Button>
                                            {script.status === "Public" && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => navigate(`/read/${script.id}`)}
                                                >
                                                    <Eye className="mr-1.5 h-3.5 w-3.5" /> {t("publisherWorksTab.viewPublicPage")}
                                                </Button>
                                            )}
                                            <div className="flex-1" />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                    {hasMore && (
                        <div className="pt-2 text-center">
                            <Button variant="outline" size="sm" onClick={loadMore}>
                                {t("publisherWorksTab.loadMore")}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
