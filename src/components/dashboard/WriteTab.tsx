import React from "react";
import { ScriptToolbar } from "./write/ScriptToolbar";
import { ScriptList } from "./write/ScriptList";
import { CreateScriptDialog } from "./write/CreateScriptDialog";
import { RenameScriptDialog } from "./write/RenameScriptDialog";
import { ImportScriptDialog } from "./write/ImportScriptDialog";
import { DeleteScriptDialog } from "./write/DeleteScriptDialog";
import { MoveScriptDialog } from "./write/MoveScriptDialog";
import { Button } from "../ui/button";
import { Search, ArrowUpDown, RotateCcw, PanelRightOpen, PanelRightClose, Loader2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { SpotlightGuideOverlay } from "../common/SpotlightGuideOverlay";
import { WritePreviewContent } from "./write/WritePreviewPanel";
import { MORANDI_STUDIO_TONE_VARS } from "../../constants/morandiPanelTones";
import { useWriteTabState } from "../../hooks/useWriteTabState";
import type { WriteScriptItem } from "../../types/write";

interface WriteTabProps {
  onSelectScript: (script: WriteScriptItem, mode?: string) => void;
  readOnly?: boolean;
  refreshTrigger?: number;
}

export function WriteTab({ onSelectScript, readOnly = false, refreshTrigger = 0 }: WriteTabProps): React.JSX.Element {
  const s = useWriteTabState({ onSelectScript, readOnly, refreshTrigger });
  const writeTone = MORANDI_STUDIO_TONE_VARS.works;
  const controlClassName = "h-8 rounded-md border border-[color:var(--morandi-tone-panel-border)] bg-background/90 text-foreground";

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {s.manager.currentPath !== "/" && (
        <div style={writeTone as React.CSSProperties} className="rounded-lg border border-[color:var(--morandi-tone-panel-border)] bg-gradient-to-r from-[var(--morandi-tone-helper-bg)] via-card to-card px-3 py-2 sm:px-4">
          <ScriptToolbar currentPath={s.manager.currentPath} breadcrumbs={s.breadcrumbs} goUp={s.manager.goUp} navigateTo={s.manager.navigateTo} />
        </div>
      )}

      <div className={`flex-1 min-h-0 grid grid-cols-1 gap-3 ${s.isPreviewCollapsed ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_22rem]"}`}>
        <section
          style={writeTone as React.CSSProperties}
          className="min-h-0 flex flex-col overflow-hidden rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] shadow-sm"
          data-guide-id="write-list-panel"
        >
          <div className="border-b bg-gradient-to-r from-[var(--morandi-tone-helper-bg)]/80 via-[var(--morandi-tone-helper-bg)]/35 to-transparent px-4 py-3 text-xs" data-guide-id="write-middle-controls">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight text-[color:var(--morandi-tone-helper-fg)]">{s.t("writeTab.listTitle", "檔案清單")}</h3>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-48 sm:min-w-[220px] sm:flex-1 items-center gap-1 shrink-0" title={s.t("writeTab.searchTitle")}>
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  className={`${controlClassName} w-full px-2`}
                  placeholder={s.t("writeTab.searchPlaceholder")}
                  value={s.filterQuery}
                  onChange={e => s.setFilterQuery(e.target.value)}
                  aria-label={s.t("writeTab.searchAria")}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className={`${controlClassName} shrink-0 px-2`} title={s.t("writeTab.sortSettings")} aria-label={s.t("writeTab.sortSettings")}>
                    <ArrowUpDown className={`w-3.5 h-3.5 ${s.sortKey !== "custom" ? "text-foreground" : "text-muted-foreground"}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel>{s.t("writeTab.sortField")}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={s.sortKey} onValueChange={val => s.setSortKey(val)}>
                    <DropdownMenuRadioItem value="custom">{s.t("writeTab.sortCustom")}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="lastModified">{s.t("writeTab.sortLastModified")}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="title">{s.t("writeTab.sortName")}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{s.t("writeTab.sortDirection")}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={s.sortDir} onValueChange={val => s.setSortDir(val as "asc" | "desc")}>
                    <DropdownMenuRadioItem value="desc">{s.t("writeTab.sortDesc")}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="asc">{s.t("writeTab.sortAsc")}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="outline" className={`${controlClassName} shrink-0 px-2`} disabled={!s.hasActiveFilters} onClick={() => { s.setFilterQuery(""); s.setSortKey("custom"); s.setSortDir("desc"); }} title={s.t("writeTab.clearFiltersAndSorting")} aria-label={s.t("writeTab.clearFiltersAndSorting")}>
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <div className="hidden xl:flex items-center gap-1 shrink-0 sm:ml-auto">
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => s.setIsPreviewCollapsed(p => !p)} title={s.isPreviewCollapsed ? s.t("writeTab.showPreviewPanel") : s.t("writeTab.hidePreviewPanel")} aria-label={s.isPreviewCollapsed ? s.t("writeTab.showPreviewPanel") : s.t("writeTab.hidePreviewPanel")}>
                  {s.isPreviewCollapsed ? <PanelRightOpen className="w-3.5 h-3.5" /> : <PanelRightClose className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[hsl(var(--surface-1))]/35 px-2 py-2" onScroll={s.handleListScroll}>
            {s.showGuide && s.totalItems === 0 && (
              <div className="m-4 rounded-lg border border-dashed border-[color:var(--morandi-tone-helper-border)] bg-[color:var(--morandi-tone-helper-bg)]/45 p-4">
                <h4 className="text-sm font-semibold text-[color:var(--morandi-tone-helper-fg)]">{s.t("writeTab.guideDemoTitle")}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{s.t("writeTab.guideDemoDesc")}</p>
              </div>
            )}
            <ScriptList
              loading={s.manager.loading}
              visibleItems={s.pagedItems}
              readOnly={readOnly}
              sortKey={s.sortKey}
              sortDir={s.sortDir}
              onSortChange={s.handleSortChange}
              currentPath={s.manager.currentPath}
              expandedPaths={s.manager.expandedPaths}
              activeDragId={s.manager.activeDragId}
              markerThemes={s.manager.markerThemes}
              sensors={s.manager.sensors}
              onSelectScript={s.handleOpenScript}
              onToggleExpand={s.manager.toggleExpand}
              onRequestDelete={s.manager.openDeleteDialog}
              onRequestMove={s.manager.openMoveDialog}
              onTogglePublic={s.manager.handleTogglePublic}
              onRename={s.manager.openRenameDialog}
              onPreviewItem={s.handlePreviewItemSelect}
              onGoUp={s.manager.goUp}
              onDragStart={s.manager.handleDragStart}
              onDragEnd={s.manager.handleDragEnd}
              selectedPreviewId={s.previewItemId || undefined}
              setScripts={s.manager.setScripts}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-[color:var(--morandi-tone-helper-bg)]/55 px-4 py-2 text-sm text-muted-foreground">
            {s.hasMoreItems && <Button variant="outline" size="sm" onClick={s.loadMore}>{s.t("writeTab.loadMore")}</Button>}
          </div>
        </section>

        <aside
          style={writeTone as React.CSSProperties}
          className={`${s.isPreviewCollapsed ? "hidden" : "hidden xl:flex"} flex-col gap-3 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-gradient-to-b from-[var(--morandi-tone-helper-bg)]/45 to-card p-4`}
          data-guide-id="write-preview-panel"
        >
          <h3 className="text-sm font-semibold text-[color:var(--morandi-tone-helper-fg)]">{s.t("writeTab.previewInfo")}</h3>
          <WritePreviewContent
            previewItem={s.previewItem}
            previewPath={s.previewPath}
            readOnly={readOnly}
            onOpen={s.handleOpenScript}
            onMove={s.manager.openMoveDialog}
            onRename={s.manager.openRenameDialog}
            onDelete={s.manager.openDeleteDialog}
            onToggleExpand={s.handleToggleExpandItem}
            onClose={() => {}}
          />
        </aside>
      </div>

      <Drawer open={s.isMobilePreviewOpen && !s.hasDesktopPreview} onOpenChange={s.setIsMobilePreviewOpen}>
        <DrawerContent side="bottom" className="max-h-[88dvh]">
          <DrawerHeader className="border-b border-border/50">
            <DrawerTitle>{s.t("writeTab.previewInfo", "項目資訊")}</DrawerTitle>
            <DrawerDescription>{s.previewItem?.title || s.t("writeTab.previewHint", "選取檔案後可查看資訊")}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6 pt-3">
            <WritePreviewContent
              previewItem={s.previewItem}
              previewPath={s.previewPath}
              readOnly={readOnly}
              onOpen={s.handleOpenScript}
              onMove={s.manager.openMoveDialog}
              onRename={s.manager.openRenameDialog}
              onDelete={s.manager.openDeleteDialog}
              onToggleExpand={item => { const fp = (item.folder === "/" ? "" : item.folder) + "/" + item.title; s.manager.toggleExpand(fp); }}
              onClose={() => s.setIsMobilePreviewOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <footer
        style={writeTone as React.CSSProperties}
        className="hidden md:block shrink-0 rounded-lg border border-[color:var(--morandi-tone-panel-border)] bg-gradient-to-r from-[var(--morandi-tone-helper-bg)]/50 via-card to-card px-3 py-2 text-xs text-muted-foreground"
        title={s.footerQuote ? `${s.footerQuote.anime || "-"}-${s.footerQuote.character || "-"}` : undefined}
      >
        <p className="truncate">{s.footerQuote?.quote || s.footerTip}</p>
      </footer>

      <CreateScriptDialog open={s.manager.isCreateOpen} onOpenChange={s.manager.setIsCreateOpen} newType={s.manager.newType} newTitle={s.manager.newTitle} setNewTitle={s.manager.setNewTitle} handleCreate={s.manager.handleCreate} creating={s.manager.creating} currentPath={s.manager.currentPath} />
      <RenameScriptDialog open={s.manager.isRenameOpen} onOpenChange={s.manager.setIsRenameOpen} type={s.manager.renameType} oldName={s.manager.oldRenameTitle} newName={s.manager.renameTitle} setNewName={s.manager.setRenameTitle} handleRename={s.manager.handleRename} renaming={s.manager.renaming} />
      <ImportScriptDialog open={s.isImportOpen} onOpenChange={s.setIsImportOpen} onImport={s.handleImport} currentPath={s.manager.currentPath} />
      <DeleteScriptDialog open={s.manager.isDeleteOpen} onOpenChange={s.manager.setIsDeleteOpen} item={s.manager.deleteItem} scripts={s.manager.scripts} deleting={s.manager.deleting} onConfirm={s.manager.handleDeleteConfirm} />
      <MoveScriptDialog open={s.manager.isMoveOpen} onOpenChange={s.manager.setIsMoveOpen} item={s.manager.moveItem} availableFolders={s.availableFolders} targetFolder={s.manager.moveTargetFolder} setTargetFolder={s.manager.setMoveTargetFolder} moving={s.manager.moving} onConfirm={s.manager.handleMoveConfirm} />

      <SpotlightGuideOverlay
        open={s.showGuide}
        spotlightRect={s.guideSpotlightRect}
        currentStep={s.guideIndex + 1}
        totalSteps={s.guideSteps.length}
        title={s.guideSteps[s.guideIndex]?.title || ""}
        description={s.guideSteps[s.guideIndex]?.description || ""}
        onSkip={s.closeGuide}
        skipLabel={s.t("writeTab.guideSkip")}
        onPrev={s.prevGuide}
        prevLabel={s.t("writeTab.guidePrev")}
        prevDisabled={s.guideIndex === 0}
        onNext={s.nextGuide}
        nextLabel={s.guideIndex === s.guideSteps.length - 1 ? s.t("writeTab.guideDone") : s.t("writeTab.guideNext")}
      />

      {s.isQuickCreatingScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-10 py-8 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">{s.t("createDialog.creating")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
