import React, { useEffect, useState } from "react";
import {
  PanelLeftOpen,
  SlidersHorizontal,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { ReaderControls } from "./reader/ReaderControls";
import { ReaderActions } from "./reader/ReaderActions";

function ReaderHeader({
  accentStyle,
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
  titleNote,
  characterList = [],
  filterCharacter,
  setFilterCharacter,
  setFocusMode,
  scrollProgress = 0,
  totalLines = 0,
  onEdit, 
  extraActions,
  onBack,
}) {
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
  const progressPercent = Math.min(100, Math.max(0, scrollProgress));
  const showTools = isLg || !collapsed;

  return (
    <Card className="border border-border bg-card/80 backdrop-blur rounded-none sm:rounded-xl border-x-0 sm:border-x">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-muted overflow-hidden z-10">
        <div
          className="h-full bg-accent/80 transition-all duration-200"
          style={{ width: `${progressPercent}%` }}
          aria-label={`閱讀進度 ${progressLabel}`}
        />
      </div>
      <CardContent
        className={`flex flex-col ${
          collapsed ? "p-2 sm:p-3" : "p-3 sm:p-4"
        } gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center pt-2.5 sm:pt-3`}
      >
        <div className="flex w-full flex-col gap-2 min-w-0 max-w-[1000px]">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBack?.();
              }}
              aria-label="回上一頁"
              className="h-9 w-9 inline-flex items-center justify-center -ml-1 text-foreground/80 hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button> 
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.currentTarget.blur();
                setSidebarOpen(true);
              }}
              aria-label="展開列表"
              className={`h-9 w-9 inline-flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors shrink-0 ${
                isSidebarOpen ? "lg:hidden" : ""
              }`}
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
            
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    if (!hasTitle) return;
                    e.stopPropagation();
                    onToggleTitle?.();
                  }}
                  className={`text-left flex-1 min-w-0 ${
                    hasTitle ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <h2 className="text-base sm:text-2xl font-semibold truncate flex-1 leading-tight min-w-0">
                    {titleName || activeFile || "選擇一個劇本"}
                  </h2>
                </button>
              </div>
              
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground min-w-0">
                <span className="truncate max-w-[120px]">
                  {activeFile ? (fileMeta[activeFile] ? fileMeta[activeFile].toLocaleDateString() : "未知日期") : ""}
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
            </div>

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
            />
            
            <ReaderActions 
                canShare={canShare} 
                onShareUrl={onShareUrl} 
                shareCopied={shareCopied} 
                handleExportPdf={handleExportPdf} 
                onEdit={onEdit} 
                extraActions={extraActions} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReaderHeader;
