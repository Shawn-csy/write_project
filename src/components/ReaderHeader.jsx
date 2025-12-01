import React from "react";
import { Printer, PanelLeftOpen } from "lucide-react";
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
  focusMode,
  focusEffect,
  setFocusEffect,
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
                    setFocusEffect("dim");
                  } else {
                    setFocusMode(false);
                  }
                }}
              >
                <SelectTrigger className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
                  <SelectValue placeholder="角色" />
                </SelectTrigger>
                <SelectContent align="end">
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
          {focusMode && (
            <div className="min-w-[90px] sm:min-w-[140px]">
              <Select value={focusEffect} onValueChange={setFocusEffect}>
                <SelectTrigger className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
                  <SelectValue placeholder="效果" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    <SelectLabel>順讀效果</SelectLabel>
                    <SelectItem value="hide">隱藏其他</SelectItem>
                    <SelectItem value="dim">淡化其他</SelectItem>
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
