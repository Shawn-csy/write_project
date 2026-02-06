import React, { useEffect, useState } from "react";
import {
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { ReaderControls } from "../reader/ReaderControls";
import { ReaderActions } from "../reader/ReaderActions";
import { useSettings } from "../../contexts/SettingsContext";
import { useEditableTitle } from "../../hooks/useEditableTitle";
import EditableTitle from "./EditableTitle";
import HeaderTitleBlock from "./HeaderTitleBlock";

function ReaderHeader({
  hasTitle,
  onToggleTitle,
  titleName,
  activeFile,
  fileMeta = {},
  isSidebarOpen,
  setSidebarOpen,
  handleExportPdf,
  onShareUrl,
  canShare,
  shareCopied,
  sceneList = [],
  currentSceneId,
  onSelectScene,
  characterList = [],
  filterCharacter,
  setFilterCharacter,
  setFocusMode,
  scrollProgress = 0,
  totalLines = 0,
  onEdit, 
  extraActions,
  onBack,
  onToggleStats, // New prop
  onTitleChange,
  
  markerConfigs,
  visibleMarkerIds: visibleMarkerIdsProp,
  hiddenMarkerIds: hiddenMarkerIdsProp,
  onToggleMarker: onToggleMarkerProp
}) {
  const { hiddenMarkerIds: ctxHiddenMarkerIds, toggleMarkerVisibility } = useSettings();
  const effectiveHiddenMarkerIds = hiddenMarkerIdsProp ?? ctxHiddenMarkerIds ?? [];
  const effectiveToggleMarker = onToggleMarkerProp ?? toggleMarkerVisibility;
  const effectiveVisibleMarkerIds = visibleMarkerIdsProp ?? (Array.isArray(markerConfigs) ? markerConfigs.filter(c => !effectiveHiddenMarkerIds.includes(c.id)).map(c => c.id) : []);
  const [collapsed, setCollapsed] = useState(true);
  const [autoCollapse, setAutoCollapse] = useState(true);
  const [isLg, setIsLg] = useState(false);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setIsLg(media.matches);
      if (autoCollapse) {
        setCollapsed(!media.matches);
      }
    };
    sync();
    const handler = () => sync();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [autoCollapse]);

  const progressLabel = `${Math.round(scrollProgress)}%`;
  const {
    isEditing,
    editTitle,
    setEditTitle,
    startEditing,
    submitTitle
  } = useEditableTitle(titleName || "", onTitleChange);

  const showTools = isLg || !collapsed;

  return (
    <Card className="border border-border bg-card/80 backdrop-blur rounded-none sm:rounded-xl border-x-0 sm:border-x">
      {/* ... (unchanged header content) */}
      <CardContent
        className={`flex flex-col ${
          collapsed ? "p-2 sm:p-3" : "p-3 sm:p-4"
        } gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center pt-2.5 sm:pt-3`}
      >
        <div className="flex w-full flex-col gap-2 min-w-0 max-w-[1000px]">
          <div className="flex items-center gap-2 min-w-0">
            <HeaderTitleBlock
              onBack={(e) => {
                e.stopPropagation();
                onBack?.();
              }}
              backButtonClassName="h-9 w-9 inline-flex items-center justify-center -ml-1 text-foreground/80 hover:text-foreground transition-colors shrink-0"
              backIconClassName="h-5 w-5"
              backAriaLabel="返回"
              onOpenSidebar={() => setSidebarOpen(true)}
              sidebarButtonClassName={`h-9 w-9 inline-flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors shrink-0 ${
                isSidebarOpen ? "lg:hidden" : ""
              }`}
              sidebarIconClassName="h-5 w-5"
              containerClassName="flex items-center gap-2 min-w-0"
              titleWrapperClassName="min-w-0 flex-1 flex flex-col justify-center"
              titleNode={
                <div className="flex items-center gap-2 min-w-0">
                  <EditableTitle
                    isEditing={isEditing && Boolean(onTitleChange)}
                    editTitle={editTitle}
                    setEditTitle={(val) => setEditTitle(val)}
                    onSubmit={submitTitle}
                    inputClassName="text-base sm:text-2xl font-semibold border border-primary/50 rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary min-w-[120px] sm:min-w-[200px] w-[45vw] sm:w-auto max-w-[60vw]"
                    inputProps={{
                      onClick: (e) => e.stopPropagation(),
                    }}
                    renderDisplay={() => (
                      <button
                        type="button"
                        onClick={(e) => {
                          if (!hasTitle) return;
                          e.stopPropagation();
                          onToggleTitle?.();
                        }}
                        onDoubleClick={(e) => {
                          if (onTitleChange) {
                            e.stopPropagation();
                            startEditing();
                          }
                        }}
                        className={`text-left flex-1 min-w-0 ${
                          hasTitle ? "cursor-pointer" : "cursor-default"
                        }`}
                        title={onTitleChange ? "雙擊重新命名" : ""}
                      >
                        <h2 className="text-base sm:text-2xl font-semibold truncate flex-1 leading-tight min-w-0">
                          {titleName ||
                            (typeof activeFile === "object"
                              ? activeFile?.name
                              : activeFile) ||
                            "選擇一個劇本"}
                        </h2>
                      </button>
                    )}
                  />
                </div>
              }
              metaNode={
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground min-w-0">
                  <span className="truncate max-w-[120px]">
                    {typeof activeFile === "string" && fileMeta[activeFile]
                      ? fileMeta[activeFile].toLocaleDateString()
                      : ""}
                  </span>
                  {totalLines > 0 && (
                    <>
                      <span className="opacity-50">·</span>
                      <span className="whitespace-nowrap">{totalLines} 行</span>
                    </>
                  )}
                  <span className="opacity-50">·</span>
                  <span className="whitespace-nowrap">{progressLabel}</span>
                </div>
              }
            />

            {!isLg && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAutoCollapse(false);
                  setCollapsed((v) => !v);
                }}
                aria-label={collapsed ? "顯示工具" : "隱藏工具"}
                className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-full border bg-muted/30 hover:bg-muted/50 text-foreground/80 transition-colors shrink-0 justify-self-end ml-1"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {showTools && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 lg:justify-end lg:ml-auto lg:w-auto w-full mt-2 sm:mt-0">
            <ReaderControls 
                sceneList={sceneList} 
                currentSceneId={currentSceneId} 
                onSelectScene={onSelectScene} 
                characterList={characterList} 
                filterCharacter={filterCharacter} 
                setFilterCharacter={setFilterCharacter} 

                setFocusMode={setFocusMode} 
 
                markerConfigs={markerConfigs}
                visibleMarkerIds={effectiveVisibleMarkerIds}
                onToggleMarker={effectiveToggleMarker}
            />
            
            <ReaderActions 
                canShare={canShare} 
                onShareUrl={onShareUrl} 
                shareCopied={shareCopied} 
                handleExportPdf={handleExportPdf} 
                onEdit={onEdit} 
                extraActions={extraActions}
                onToggleStats={onToggleStats}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReaderHeader;
