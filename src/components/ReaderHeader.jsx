import React from "react";
import { Printer, PanelLeftOpen, Share2 } from "lucide-react";
import { Button } from "./ui/button";
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
  fileMeta,
  setSidebarOpen,
  handleExportPdf,
  onShareUrl,
  canShare,
  shareCopied,
  sceneList = [],
  currentSceneId,
  onSelectScene,
  titleNote,
  characterList,
  filterCharacter,
  setFilterCharacter,
  setFocusMode,
}) {
  return (
    <Card
      className={`border border-border bg-card/80 backdrop-blur ${
        hasTitle ? "cursor-pointer" : ""
      }`}
      onClick={hasTitle ? onToggleTitle : undefined}
    >
      <CardContent className="flex flex-nowrap items-center gap-2 p-2 sm:p-4 overflow-x-auto scrollbar-hide sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSidebarOpen(true);
            }}
            aria-label="展開列表"
            className="lg:hidden h-8 w-8 inline-flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
          <div className="min-w-0 space-y-0.5">
            <p className={`text-[10px] uppercase tracking-[0.2em] ${accentStyle.label}`}>
              Viewer
            </p>
            <h2 className="text-sm sm:text-2xl font-semibold truncate">
              {titleName || activeFile || "選擇一個劇本"}
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {activeFile && fileMeta[activeFile]
                ? `最後更新：${fileMeta[activeFile].toLocaleString()}`
                : "最後更新：未知"}
            </p>
          </div>
        </div>

        <div className="flex flex-nowrap items-center gap-3 sm:gap-3 ml-auto no-print">
          {titleNote && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
              {titleNote}
            </span>
          )}
          {sceneList.length > 0 && (
            <div className="min-w-[140px] sm:min-w-[200px]">
              <Select
                value={currentSceneId || "__top__"}
                onValueChange={(val) => {
                  const next = val === "__top__" ? "" : val;
                  onSelectScene?.(next);
                }}
              >
                <SelectTrigger className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
                  <SelectValue placeholder="場景" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    <SelectLabel>場景跳轉</SelectLabel>
                    <SelectItem value="__top__">回到開頭</SelectItem>
                    {sceneList.map((scene) => (
                      <SelectItem key={scene.id} value={scene.id}>
                        {scene.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
          {canShare && (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShareUrl?.(e);
                }}
                aria-label="分享連結"
                className="h-8 w-8 inline-flex items-center justify-center rounded hover:text-foreground bg-transparent text-foreground/80 transition-colors"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {shareCopied && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  已複製連結
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleExportPdf}
            aria-label="匯出 PDF"
            className="h-8 w-8 inline-flex items-center justify-center rounded hover:text-foreground bg-transparent text-foreground/80 transition-colors"
          >
            <Printer className="h-4 w-4" />
          </button>
          {characterList.length > 0 && (
            <div className="min-w-[100px] sm:min-w-[160px]">
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
                <SelectTrigger className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
                  <SelectValue placeholder="角色" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    <SelectLabel>角色</SelectLabel>
                    <SelectItem value="__ALL__">全部</SelectItem>
                    {characterList.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ReaderHeader;
