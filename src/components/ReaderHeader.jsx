import React, { useEffect, useState } from "react";
import {
  Printer,
  PanelLeftOpen,
  Share2,
  SlidersHorizontal,
  PenBox,
  ArrowLeft,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card, CardContent } from "./ui/card";

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
              className="lg:hidden h-9 w-9 inline-flex items-center justify-center -ml-1 text-foreground/80 hover:text-foreground transition-colors shrink-0"
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
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3 lg:flex-nowrap w-full sm:w-auto sm:items-center">
              {sceneList.length > 0 && (
                <div className="w-full sm:min-w-[200px] sm:w-auto">
                  <Select
                    value={currentSceneId || "__top__"}
                    onValueChange={(val) => {
                      const next = val === "__top__" ? "" : val;
                      onSelectScene?.(next);
                    }}
                  >
                    <SelectTrigger className="h-10 px-3 text-sm w-full bg-muted/40 hover:bg-muted/60 border-transparent hover:border-border transition-all font-medium">
                      <SelectValue placeholder="場景跳轉" />
                    </SelectTrigger>
                    <SelectContent align="start" className="max-h-[300px]">
                      <SelectGroup>
                        <SelectLabel>場景列表</SelectLabel>
                        <SelectItem value="__top__">回到開頭</SelectItem>
                        {sceneList.map((scene) => (
                          <SelectItem key={scene.id} value={scene.id} className="font-mono text-xs sm:text-sm py-2.5">
                            {scene.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {characterList.length > 0 && (
                <div className="w-full sm:min-w-[150px] sm:w-auto">
                  <Select
                    value={filterCharacter}
                    onValueChange={(val) => {
                      setFilterCharacter(val);
                      if (val && val !== "__ALL__") {
                        setFocusMode(true);
                      } else {
                        setFocusMode(false);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 px-3 text-sm w-full bg-muted/40 hover:bg-muted/60 border-transparent hover:border-border transition-all font-medium">
                      <SelectValue placeholder="角色篩選" />
                    </SelectTrigger>
                    <SelectContent align="start" className="max-h-[300px]">
                      <SelectGroup>
                        <SelectLabel>角色</SelectLabel>
                        <SelectItem value="__ALL__">全部顯示</SelectItem>
                        {characterList.map((c) => (
                          <SelectItem key={c} value={c} className="font-semibold">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 sm:gap-3 sm:ml-auto shrink-0 lg:border-l lg:border-border/60 lg:pl-3">
              {canShare && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareUrl?.(e);
                    }}
                    aria-label="分享連結"
                    className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-muted text-foreground/80 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  {shareCopied && (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      已複製
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={handleExportPdf}
                aria-label="匯出 PDF"
                className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-muted text-foreground/80 transition-colors"
              >
                <Printer className="h-4 w-4" />
              </button>
              {onEdit && (
                <button
                  onClick={onEdit}
                  aria-label="編輯劇本"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-muted text-foreground/80 transition-colors"
                >
                  <PenBox className="h-4 w-4" />
                </button>
              )}
              {extraActions}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReaderHeader;
