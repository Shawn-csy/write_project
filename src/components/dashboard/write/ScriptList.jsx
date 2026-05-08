import React, { useMemo, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Trash2, Folder, ChevronRight, FileText, MoreHorizontal, Settings, Globe, FolderInput, ArrowUpDown } from "lucide-react";
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
import {
    SortableContext,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { updateScript } from "../../../lib/api/scripts";
import { isDefaultLikeTheme } from "../../../lib/themeNameUtils";
import { useI18n } from "../../../contexts/I18nContext";
import { StudioEmptyStateCard } from "../../common/StudioEmptyStateCard";

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
    onStatusClick,
    onThemeChange,
    onRequestMove,
    onRename,
    onRequestDelete,
}) {
    const { t } = useI18n();

    const isChild = (item.depth || 0) > 0;
    const rowClassName = isSelected
        ? "bg-primary/12 ring-1 ring-inset ring-primary/45 border-l-4 border-l-primary"
        : (isChild ? "bg-muted/20 border-l border-l-border/50" : "");

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
                            <span className="truncate max-w-[100px] hidden md:inline">{item._displayAuthor}</span>

                            {/* Mobile: Show theme and public status */}
                            <div className="flex items-center gap-1 sm:hidden">
                                {item.markerThemeId && markerThemes && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/30">
                                        {item._themeName || t("scriptList.theme")}
                                    </span>
                                )}
                                <span
                                    onClick={(e) => onStatusClick(e, item)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] border ${item.isPublic ? 'border-[color:var(--license-selected-border)] bg-[color:var(--license-selected-bg)] text-[color:var(--license-selected-fg)]' : 'border-border bg-[hsl(var(--surface-2))] text-foreground/75'} ${!readOnly ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
                                >
                                    {item.isPublic ? 'Public' : 'Private'}
                                </span>
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
                                <div className="w-28 hidden md:block"></div>
                            </>
                        )}

                        {/* Theme Selector (Desktop Only) */}
                        {item.type !== 'folder' && !readOnly && (
                            <div className="w-28 text-center hidden md:block" onClick={e => e.stopPropagation()}>
                                <select
                                    id={`script-theme-${item.id}`}
                                    name={`scriptTheme-${item.id}`}
                                    aria-label={t("scriptList.scriptMarkerTheme")}
                                    className="w-full h-6 text-[10px] rounded border border-input bg-background px-1"
                                    value={item.markerThemeId || "default"}
                                    onChange={(e) => onThemeChange(item.id, e.target.value, item.markerThemeId)}
                                >
                                    {selectableMarkerThemes.map(th => (
                                        <option key={th.id} value={th.id}>{th.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Public Status (Desktop Only or Icon) */}
                        <div className="w-20 flex justify-center hidden md:flex">
                            {item.type !== 'folder' && (
                                <div
                                    onClick={(e) => onStatusClick(e, item)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${!readOnly ? "cursor-pointer hover:opacity-85 active:scale-95 transition-all" : ""} ${item.isPublic ? 'border-[color:var(--license-selected-border)] bg-[color:var(--license-selected-bg)] text-[color:var(--license-selected-fg)]' : 'border-border bg-[hsl(var(--surface-2))] text-foreground/75'}`}
                                    title={readOnly ? "" : t("scriptList.clickToManagePublish")}
                                >
                                    {item.isPublic ? "Public" : "Private"}
                                </div>
                            )}
                        </div>

                        {/* Actions Dropdown */}
                        <div className="w-10 flex justify-end items-center" onClick={e => e.stopPropagation()}>
                            {!readOnly && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
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
}) {
    const { t } = useI18n();
    const navigate = useNavigate();
    const themeUpdateSeqRef = useRef(new Map());

    const dateFormatter = useMemo(() => new Intl.DateTimeFormat(undefined), []);
    const formatDate = useCallback((ts) => {
        if (!ts) return "";
        return dateFormatter.format(new Date(ts));
    }, [dateFormatter]);

    const markerThemeNameById = useMemo(() => {
        const map = {};
        (markerThemes || []).forEach((theme) => {
            if (theme?.id) map[theme.id] = theme.name || t("scriptList.theme");
        });
        return map;
    }, [markerThemes, t]);

    const selectableMarkerThemes = useMemo(() => {
        const unique = [];
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

    const handleStatusClick = useCallback((e, item) => {
        if (readOnly) return;
        e.stopPropagation();
        navigate(`/studio?tab=works&scriptId=${encodeURIComponent(item.id)}&open=publish`);
    }, [readOnly, navigate]);

    const handleThemeChange = useCallback(async (scriptId, newVal, prevValRaw) => {
        const prevVal = prevValRaw || "default";
        newVal = newVal || "default";
        if (newVal === prevVal) return;
        const current = themeUpdateSeqRef.current.get(scriptId) || 0;
        const requestSeq = current + 1;
        themeUpdateSeqRef.current.set(scriptId, requestSeq);
        try {
            setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, markerThemeId: newVal } : s));
            await updateScript(scriptId, { markerThemeId: newVal });
        } catch (err) {
            if (themeUpdateSeqRef.current.get(scriptId) !== requestSeq) return;
            setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, markerThemeId: prevVal } : s));
            console.error(t("scriptList.themeUpdateFailed"), err);
        }
    }, [setScripts, t]);

    const handleClickRow = useCallback((item, e) => {
        if (item.type === 'folder') {
            const fullPath = (item.folder === '/' ? '' : item.folder) + '/' + item.title;
            onToggleExpand(fullPath, e);
            onPreviewItem && onPreviewItem(item, { openMobileDrawer: false });
        } else {
            onPreviewItem && onPreviewItem(item);
        }
    }, [onToggleExpand, onPreviewItem]);

    const handleDoubleClickRow = useCallback((item, e) => {
        if (item.type !== 'folder') {
            e.stopPropagation();
            onSelectScript(item);
        }
    }, [onSelectScript]);

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
    }

    if (visibleItems.length === 0) {
        return (
            <StudioEmptyStateCard
                icon={Folder}
                title={t("scriptList.emptyFolder")}
                description={t("writeTab.guideDemoDesc", "你可以建立新劇本、資料夾，或匯入既有稿件。")}
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
                <div className="flex flex-col gap-1">
                    {/* Header Row */}
                    <div className="sticky top-0 z-10 flex items-center rounded-md border border-border/60 bg-gradient-to-r from-muted/70 via-muted/45 to-background px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
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
                        <div className="w-28 text-center hidden md:block">{t("scriptList.markerTheme")}</div>
                        <div className="w-20 text-center hidden md:block">{t("scriptList.status")}</div>
                        <div className="w-10"></div>
                    </div>

                    {/* Go Up Option if not root */}
                    {currentPath !== "/" && (
                        <div
                            onClick={onGoUp}
                            className="flex cursor-pointer items-center rounded-md border border-border/50 bg-background px-4 py-3 text-muted-foreground transition-colors hover:bg-muted/40"
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
