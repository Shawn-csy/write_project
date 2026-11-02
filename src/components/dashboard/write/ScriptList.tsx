import React, { useMemo, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Folder, ChevronRight, FileText, MoreHorizontal, Settings, Globe, FolderInput, ArrowUpDown, ChevronDown, FolderOpen, Plus } from "lucide-react";
import { Button } from "../../ui/button";
import { FileRow, SortableFileRow } from "../FileRow";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem
} from "../../ui/dropdown-menu";
import {
    DndContext,
    closestCenter,
    DragOverlay
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, SensorDescriptor } from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { updateScript } from "../../../lib/api/scripts";
import { isDefaultLikeTheme } from "../../../lib/themeNameUtils";
import { useI18n } from "../../../contexts/I18nContext";
import { StudioEmptyStateCard } from "../../common/StudioEmptyStateCard";
import { StatusPill } from "../../studio/StatusPill";
import { ListRowsSkeleton } from "../../studio/StudioSkeleton";
import type { WriteScriptItem } from "../../../types/write";

interface MarkerThemeOption {
    id: string;
    name?: string;
    [key: string]: unknown;
}

type ScriptListItem = WriteScriptItem;

interface ScriptListRowProps {
    item: ScriptListItem;
    isSelected: boolean;
    readOnly: boolean;
    expandedPaths: Set<string>;
    selectableMarkerThemes: MarkerThemeOption[];
    markerThemes: MarkerThemeOption[];
    formatDate: (ts?: string | number) => string;
    onClickRow: (item: ScriptListItem, e: React.MouseEvent<HTMLDivElement>) => void;
    onDoubleClickRow: (item: ScriptListItem, e: React.MouseEvent<HTMLDivElement>) => void;
    onOpenScript: (item: ScriptListItem) => void;
    onStatusClick: (e: React.MouseEvent<HTMLElement>, item: ScriptListItem) => void;
    onThemeChange: (scriptId: string, newVal: string, prevValRaw?: string) => Promise<void>;
    onRequestMove?: (item: ScriptListItem) => void;
    onRename?: (item: ScriptListItem) => void;
    onRequestDelete?: (item: ScriptListItem) => void;
}

interface ScriptListProps {
    loading: boolean;
    visibleItems: ScriptListItem[];
    readOnly: boolean;
    sortKey: string;
    sortDir: "asc" | "desc";
    onSortChange?: (key: string) => void;
    currentPath: string;
    expandedPaths: Set<string>;
    activeDragId?: string | null;
    markerThemes: MarkerThemeOption[];
    onSelectScript: (item: ScriptListItem) => void;
    onToggleExpand: (path: string, e: React.MouseEvent<HTMLDivElement>) => void;
    onRequestDelete?: (item: ScriptListItem) => void;
    onRequestMove?: (item: ScriptListItem) => void;
    onTogglePublic?: (e: React.MouseEvent, item: ScriptListItem) => void | Promise<void>;
    onRename?: (item: ScriptListItem) => void;
    onPreviewItem?: (item: ScriptListItem, options?: { openMobileDrawer?: boolean }) => void;
    onGoUp: () => void;
    selectedPreviewId?: string;
    sensors?: SensorDescriptor<object>[];
    onDragStart?: (event: DragStartEvent) => void;
    onDragEnd?: (event: DragEndEvent) => void;
    setScripts: React.Dispatch<React.SetStateAction<ScriptListItem[]>>;
}

// --- ScriptListRow (memoized) ---
const ScriptListRow = memo(function ScriptListRow({
    item,
    isSelected,
    readOnly,
    expandedPaths,
    selectableMarkerThemes,
    markerThemes,
    formatDate,
    onClickRow,
    onDoubleClickRow,
    onOpenScript,
    onStatusClick,
    onThemeChange,
    onRequestMove,
    onRename,
    onRequestDelete,
}: ScriptListRowProps): React.JSX.Element {
    const { t } = useI18n();

    const isChild = (item.depth || 0) > 0;
    const rowClassName = isSelected
        ? "!bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]"
        : (isChild ? "bg-muted/20" : "");
    const statusLabel = item.isPublic ? t("scriptList.statusPublic", "已公開") : t("scriptList.statusPrivate", "未公開");
    const themeLabel = selectableMarkerThemes.find((th) => th.id === (item.markerThemeId || "default"))?.name || t("scriptList.defaultTheme", "(預設主題)");

    const isFolderExpanded = item.type === 'folder' &&
        expandedPaths.has((item.folder === '/' ? '' : item.folder) + '/' + item.title);

    return (
        <SortableFileRow
            key={item.id}
            id={item.id}
            item={item}
            isFolder={item.type === 'folder'}
        >
            <FileRow
                style={{ marginLeft: `${(item.depth || 0) * 20}px` }}
                icon={item.type === 'folder'
                    ? <Folder className={`w-4 h-4 ${isFolderExpanded ? "fill-primary/20" : ""}`} />
                    : <FileText className="w-4 h-4 text-primary" />
                }
                title={item.title || t("scriptList.untitled")}
                meta={
                    item.type === 'folder' ? null : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground w-full flex-wrap">
                            <span className="hidden md:inline">{item._displayDate}</span>
                            <span className="hidden md:inline">·</span>
                            <span className="truncate max-w-[100px] hidden md:inline">{String(item._displayAuthor || "")}</span>

                            {/* Mobile: Show theme and public status */}
                            <div className="flex items-center gap-1 sm:hidden">
                                {item.markerThemeId && markerThemes && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/30">
                                        {item._themeName || t("scriptList.theme")}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => onStatusClick(e, item)}
                                    disabled={readOnly}
                                    className="inline-flex"
                                    aria-label={statusLabel}
                                >
                                    <StatusPill status={item.isPublic ? "live" : "draft"}>{statusLabel}</StatusPill>
                                </button>
                            </div>
                        </div>
                    )
                }
                isFolder={item.type === 'folder'}
                tags={item.tags}
                className={rowClassName}
                onClick={(e) => onClickRow(item, e)}
                onDoubleClick={(e) => onDoubleClickRow(item, e)}
                actions={
                    <>
                        {item.type !== 'folder' && (
                            <>
                                <div className="w-24 text-right text-xs text-muted-foreground hidden md:block">
                                    {t("scriptList.charCountValue").replace("{count}", String(item.contentLength ? Math.ceil(item.contentLength / 2) : (item.content ? Math.ceil(item.content.length / 2) : 0)))}
                                </div>
                                <div className="w-32 text-right text-xs text-muted-foreground hidden md:block">{formatDate(item.lastModified)}</div>
                            </>
                        )}
                        {item.type === 'folder' && (
                            <>
                                <div className="w-24 hidden md:block"></div>
                                <div className="w-32 hidden md:block"></div>
                                <div className="hidden w-32 md:block"></div>
                            </>
                        )}

                        {/* Theme Selector (Desktop Only) */}
                        {item.type !== 'folder' && !readOnly && (
                            <div className="hidden w-32 md:block" onClick={e => e.stopPropagation()}>
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-full justify-between gap-1 px-2 text-xs font-normal"
                                            aria-label={`${t("scriptList.scriptMarkerTheme", "劇本標記主題")}：${themeLabel}`}
                                        >
                                            <span className="truncate">{themeLabel}</span>
                                            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuRadioGroup
                                            value={item.markerThemeId || "default"}
                                            onValueChange={(val) => onThemeChange(item.id, val, item.markerThemeId)}
                                        >
                                            {selectableMarkerThemes.map(th => (
                                                <DropdownMenuRadioItem key={th.id} value={th.id}>{th.name}</DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}

                                                {/* Public Status (Desktop Only or Icon) */}
                        <div className="hidden w-24 justify-center md:flex">
                            {item.type !== 'folder' && (
                                <button
                                    type="button"
                                    onClick={(e) => onStatusClick(e, item)}
                                    disabled={readOnly}
                                    title={readOnly ? "" : t("scriptList.clickToManagePublish", "點擊管理發布設定")}
                                    className="inline-flex rounded-full disabled:cursor-default"
                                    aria-label={statusLabel}
                                >
                                    <StatusPill status={item.isPublic ? "live" : "draft"}>{statusLabel}</StatusPill>
                                </button>
                            )}
                        </div>

                        {/* Actions Dropdown */}
                        {item.type !== 'folder' && (
                            <Button variant="outline" size="sm" className="h-10 shrink-0 px-3 sm:h-8" onClick={(e) => { e.stopPropagation(); onOpenScript(item); }}>
                                {readOnly ? t("scriptList.view", "檢視") : t("scriptList.edit", "編輯")}
                            </Button>
                        )}
                        <div className="w-10 flex justify-end items-center" onClick={e => e.stopPropagation()}>
                            {!readOnly && (
                                // Non-modal: items here open Dialogs (delete/move/rename). A modal menu
                                // and a modal Dialog mounted together trap focus against each other and
                                // recurse until the stack overflows, freezing the page.
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground sm:h-8 sm:w-8" aria-label={t("scriptList.actions", "操作選項")}>
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuLabel>{t("scriptList.actions")}</DropdownMenuLabel>
                                        <DropdownMenuSeparator />

                                        {item.type !== 'folder' && (
                                            <DropdownMenuItem onClick={(e) => onStatusClick(e, item)}>
                                                <Globe className="w-4 h-4 mr-2" />
                                                <span>{t("scriptList.publishSettings")}</span>
                                            </DropdownMenuItem>
                                        )}

                                        {item.type !== 'folder' && (
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    <Settings className="w-4 h-4 mr-2" />
                                                    <span>{t("scriptList.markerTheme")}</span>
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                    <DropdownMenuRadioGroup
                                                        value={item.markerThemeId || "default"}
                                                        onValueChange={(val) => {
                                                            const newVal = val === "__default__" ? "default" : val;
                                                            onThemeChange(item.id, newVal, item.markerThemeId);
                                                        }}
                                                    >
                                                        {selectableMarkerThemes.map(th => (
                                                            <DropdownMenuRadioItem key={th.id} value={th.id}>
                                                                {th.name}
                                                            </DropdownMenuRadioItem>
                                                        ))}
                                                    </DropdownMenuRadioGroup>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                        )}

                                        <DropdownMenuSeparator />

                                        {item.type !== 'folder' && (
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRequestMove && onRequestMove(item);
                                                }}
                                            >
                                                <FolderInput className="w-4 h-4 mr-2" />
                                                <span>{t("scriptList.moveTo")}</span>
                                            </DropdownMenuItem>
                                        )}


                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRename && onRename(item);
                                            }}
                                        >
                                            <div className="flex items-center">
                                                <FileText className="w-4 h-4 mr-2" />
                                                <span>{t("scriptList.rename")}</span>
                                            </div>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRequestDelete && onRequestDelete(item);
                                            }}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            <span>{t("common.remove")}</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </>
                }
            />
        </SortableFileRow>
    );
});

export const ScriptList = memo(function ScriptList({
    loading,
    visibleItems,
    readOnly,
    sortKey,
    sortDir,
    onSortChange,
    currentPath,
    expandedPaths,
    activeDragId,
    markerThemes,
    // Actions
    onSelectScript,
    onToggleExpand,
    onRequestDelete,
    onRequestMove,
    onTogglePublic,
    onRename,
    onPreviewItem,
    onGoUp,
    selectedPreviewId,

    // Drag Props
    sensors,
    onDragStart,
    onDragEnd,

    // State Setters (for local optimistic updates)
    setScripts
}: ScriptListProps): React.JSX.Element {
    const { t } = useI18n();
    const navigate = useNavigate();
    const themeUpdateSeqRef = useRef<Map<string, number>>(new Map());

    const dateFormatter = useMemo(() => new Intl.DateTimeFormat(undefined), []);
    const formatDate = useCallback((ts?: string | number) => {
        if (!ts) return "";
        return dateFormatter.format(new Date(ts));
    }, [dateFormatter]);

    const markerThemeNameById = useMemo(() => {
        const map: Record<string, string> = {};
        (markerThemes || []).forEach((theme) => {
            if (theme?.id) map[theme.id] = theme.name || t("scriptList.theme");
        });
        return map;
    }, [markerThemes, t]);

    const selectableMarkerThemes = useMemo(() => {
        const unique: MarkerThemeOption[] = [];
        const seen = new Set();
        (markerThemes || []).forEach((theme) => {
            if (!theme?.id || seen.has(theme.id)) return;
            seen.add(theme.id);
            unique.push(theme);
        });
        const custom = unique.filter((theme) => !isDefaultLikeTheme(theme));
        return [{ id: "default", name: t("scriptList.defaultTheme") }, ...custom];
    }, [markerThemes, t]);

    const enrichedItems = useMemo(() => {
        return (visibleItems || []).map((item) => ({
            ...item,
            _displayDate: item.draftDate || formatDate(item.lastModified || item.createdAt),
            _displayAuthor: item.author || t("scriptList.defaultUser"),
            _themeName: item.markerThemeId ? (markerThemeNameById[item.markerThemeId] || t("scriptList.theme")) : "",
        }));
    }, [visibleItems, markerThemeNameById, formatDate, t]);

    const handleStatusClick = useCallback((e: React.MouseEvent<HTMLElement>, item: ScriptListItem) => {
        if (readOnly) return;
        e.stopPropagation();
        navigate(`/works/${encodeURIComponent(item.id)}`);
    }, [readOnly, navigate]);

    const handleThemeChange = useCallback(async (scriptId: string, newVal: string, prevValRaw?: string) => {
        const prevVal = prevValRaw || "default";
        newVal = newVal || "default";
        if (newVal === prevVal) return;
        const current = themeUpdateSeqRef.current.get(scriptId) || 0;
        const requestSeq = current + 1;
        themeUpdateSeqRef.current.set(scriptId, requestSeq);
        try {
            setScripts((prev) => prev.map((script) => script.id === scriptId ? { ...script, markerThemeId: newVal } : script));
            await updateScript(scriptId, { markerThemeId: newVal });
        } catch (err) {
            if (themeUpdateSeqRef.current.get(scriptId) !== requestSeq) return;
            setScripts((prev) => prev.map((script) => script.id === scriptId ? { ...script, markerThemeId: prevVal } : script));
            console.error(t("scriptList.themeUpdateFailed"), err);
        }
    }, [setScripts, t]);

    const handleClickRow = useCallback((item: ScriptListItem, e: React.MouseEvent<HTMLDivElement>) => {
        if (item.type === 'folder') {
            const fullPath = (item.folder === '/' ? '' : item.folder) + '/' + item.title;
            onToggleExpand(fullPath, e);
            onPreviewItem && onPreviewItem(item, { openMobileDrawer: false });
        } else {
            onPreviewItem && onPreviewItem(item);
        }
    }, [onToggleExpand, onPreviewItem]);

    const handleDoubleClickRow = useCallback((item: ScriptListItem, e: React.MouseEvent<HTMLDivElement>) => {
        if (item.type !== 'folder') {
            e.stopPropagation();
            onSelectScript(item);
        }
    }, [onSelectScript]);

    if (loading) {
        return <ListRowsSkeleton label={t("common.loading", "載入中")} />;
    }

    if (visibleItems.length === 0) {
        return (
            <StudioEmptyStateCard
                icon={FolderOpen}
                title={t("scriptList.emptyFolder", "此資料夾為空")}
                description={t("scriptList.emptyFolderHint", "建立新台本、新增資料夾，或匯入既有稿件，開始整理你的作品。")}
                actionLabel={readOnly ? "" : (<><Plus className="mr-1 h-4 w-4" />{t("scriptList.createScript", "新增台本")}</>)}
                onAction={readOnly ? null : () => window.dispatchEvent(new CustomEvent("write-tab-action", { detail: { type: "create-script" } }))}
            />
        );
    }

    return (
        <>
        <DndContext
            sensors={readOnly ? [] : sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <SortableContext
                items={visibleItems.map(i => i.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex flex-col">
                    {/* Header Row */}
                    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground sm:px-4">
                        <div className="flex-1">
                            <button
                                type="button"
                                className="inline-flex items-center gap-1 text-foreground font-semibold hover:text-foreground"
                                onClick={() => onSortChange && onSortChange("title")}
                            >
                                {t("scriptList.name")}
                                <ArrowUpDown className={`w-3 h-3 ${sortKey === "title" ? "text-foreground" : "opacity-50"}`} />
                                {sortKey === "title" && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
                            </button>
                        </div>
                        <div className="w-24 text-right hidden md:block">{t("scriptList.charCountApproxHeader")}</div>
                        <div className="w-32 text-right hidden md:block">
                            <button
                                type="button"
                                className="inline-flex items-center gap-1 hover:text-foreground"
                                onClick={() => onSortChange && onSortChange("lastModified")}
                            >
                                {t("scriptList.modifiedDate")}
                                <ArrowUpDown className={`w-3 h-3 ${sortKey === "lastModified" ? "text-foreground" : "opacity-50"}`} />
                                {sortKey === "lastModified" && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
                            </button>
                        </div>
                        <div className="hidden w-32 md:block">{t("scriptList.markerTheme")}</div>
                        <div className="hidden w-24 text-center md:block">{t("scriptList.status")}</div>
                        <div className="hidden w-14 md:block"></div>
                        <div className="w-10"></div>
                    </div>

                    {/* Go Up Option if not root */}
                    {currentPath !== "/" && (
                        <div
                            onClick={onGoUp}
                            className="flex cursor-pointer items-center gap-1 border-b border-border/70 bg-card px-3 py-3 text-muted-foreground transition-colors hover:bg-muted/40 sm:px-4"
                        >
                            <div className="mr-3 p-1">
                                <ChevronRight className="w-4 h-4 rotate-180" />
                            </div>
                            <span className="text-sm font-medium">{t("scriptList.goParent")}</span>
                        </div>
                    )}

                    {/* Items */}
                    {enrichedItems.map((item) => (
                        <ScriptListRow
                            key={item.id}
                            item={item}
                            isSelected={selectedPreviewId === item.id}
                            readOnly={readOnly}
                            expandedPaths={expandedPaths}
                            selectableMarkerThemes={selectableMarkerThemes}
                            markerThemes={markerThemes}
                            formatDate={formatDate}
                            onClickRow={handleClickRow}
                            onDoubleClickRow={handleDoubleClickRow}
                            onOpenScript={onSelectScript}
                            onStatusClick={handleStatusClick}
                            onThemeChange={handleThemeChange}
                            onRequestMove={onRequestMove}
                            onRename={onRename}
                            onRequestDelete={onRequestDelete}
                        />
                    ))}
                </div>
            </SortableContext>
            <DragOverlay>
                {activeDragId ? (
                    <div className="bg-background border rounded-md shadow-lg p-3 opacity-80">
                        {t("scriptList.dragging")}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
        </>
    );
});
