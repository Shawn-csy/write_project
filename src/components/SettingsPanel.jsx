import React, { useRef, useState } from "react";
import { Sun, Moon, Type, FileText, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { accentThemes } from "../constants/accent";

function SettingsPanel({
  isDark,
  setTheme,
  accent,
  accentOptions,
  setAccent,
  fontSize,
  setFontSize,
  bodyFontSize,
  setBodyFontSize,
  dialogueFontSize,
  setDialogueFontSize,
  exportMode,
  setExportMode,
  fileLabelMode,
  setFileLabelMode,
  focusEffect,
  setFocusEffect,
  focusContentMode,
  setFocusContentMode,
  highlightCharacters,
  setHighlightCharacters,
  highlightSfx,
  setHighlightSfx,
}) {
  const unifiedPresets = [
    { label: "更小", value: 12 },
    { label: "小", value: 14 },
    { label: "中", value: 18 },
    { label: "大", value: 24 },
    { label: "特大", value: 36 },
  ];
  const detailOptions = [12, 14, 16, 18, 24, 32, 36];
  const [showDetailSizes, setShowDetailSizes] = useState(false);
  const scrollContainerRef = useRef(null);
  const sectionRefs = {
    display: useRef(null),
    list: useRef(null),
  };
  const renderSizeButtons = (current, onSelect, options = detailOptions) => (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map((size) => {
        const active = current === size;
        return (
          <button
            key={size}
            aria-label={`字級 ${size}px`}
            onClick={() => onSelect(size)}
            className={`h-10 px-3 inline-flex items-center justify-center rounded border ${
              active ? "border-foreground font-semibold bg-accent/10" : "border-border/70"
            } text-foreground/80 hover:text-foreground transition-colors`}
          >
            <span style={{ fontSize: size <= 16 ? 12 : size >= 24 ? 18 : 14 }}>A</span>
            <span className="ml-2 text-sm">{size}px</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex-1 min-h-0 overflow-hidden border border-border bg-background/60 rounded-xl shadow-sm">
      <div
        className="h-full overflow-y-auto scrollbar-hide p-4 sm:p-6"
        ref={scrollContainerRef}
      >
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[
            { key: "display", label: "顯示 / 字級" },
            { key: "list", label: "列表 / 順讀" },
          ].map((item) => (
            <button
              key={item.key}
              className="px-3 py-2 rounded-lg border border-border/70 text-xs text-foreground/80 hover:text-foreground hover:border-foreground/50 transition-colors"
              onClick={() => {
                const el = sectionRefs[item.key]?.current;
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 lg:gap-5 grid-cols-1 lg:grid-cols-2">
      <Card className="border border-border/80" ref={sectionRefs.display}>
        <CardHeader>
          <CardTitle>顯示</CardTitle>
          <CardDescription>調整主題、重點色與字級大小。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">主題</p>
              <p className="text-xs text-muted-foreground">亮/暗模式切換</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isDark ? "ghost" : "default"}
                size="icon"
                aria-label="切換為亮色"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4" />
              </Button>
              <Button
                variant={isDark ? "default" : "ghost"}
                size="icon"
                aria-label="切換為暗色"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">重點色</p>
                <p className="text-xs text-muted-foreground">套用於強調元素</p>
              </div>
              <Palette className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center flex-wrap gap-2">
              {accentOptions.map((opt) => {
                const active = accent === opt.value;
                const swatch = accentThemes[opt.value]?.accent;
                return (
                  <Button
                    key={opt.value}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                    onClick={() => setAccent(opt.value)}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: swatch ? `hsl(${swatch})` : undefined }}
                    />
                    <span>{opt.label}</span>
                  </Button>
                );
              })}
            </div>
            </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">快速字級</p>
                  <p className="text-xs text-muted-foreground">套用到正文與對白</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {unifiedPresets.map((opt) => {
                  const active =
                    bodyFontSize === opt.value && dialogueFontSize === opt.value;
                  return (
                    <button
                      key={opt.value}
                      className={`h-9 px-3 rounded-lg border text-xs ${
                        active
                          ? "border-foreground font-semibold bg-accent/10"
                          : "border-border/70 text-foreground/80"
                      } hover:text-foreground transition-colors`}
                      onClick={() => {
                        setBodyFontSize(opt.value);
                        setDialogueFontSize(opt.value);
                        setFontSize(opt.value);
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <button
                  className="text-xs text-foreground/80 hover:text-foreground underline underline-offset-4"
                  onClick={() => setShowDetailSizes((v) => !v)}
                >
                  {showDetailSizes ? "收合字級設定" : "展開個別字級"}
                </button>
              </div>
              {showDetailSizes && (
                <>
                  <div className="border-t border-border/70 my-2" />
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">全文字級</p>
                      <p className="text-xs text-muted-foreground">影響正文/標題顯示</p>
                    </div>
                  </div>
                  {renderSizeButtons(bodyFontSize, setBodyFontSize)}
                  <p className="text-xs text-muted-foreground">
                    預覽：<span style={{ fontSize: `${bodyFontSize}px` }}>這是正文示範字級</span>
                  </p>
                  <div className="border-t border-border/70 my-3" />
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">對白字級</p>
                      <p className="text-xs text-muted-foreground">只影響對白/括號</p>
                    </div>
                  </div>
                  {renderSizeButtons(dialogueFontSize, setDialogueFontSize)}
                  <p className="text-xs text-muted-foreground">
                    預覽：<span style={{ fontSize: `${dialogueFontSize}px`, fontStyle: "italic" }}>（這是對白示範字級）</span>
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80" ref={sectionRefs.list}>
        <CardHeader>
          <CardTitle>列表 / 順讀</CardTitle>
          <CardDescription>調整側欄呈現與專注模式行為。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">列表顯示</p>
                  <p className="text-xs text-muted-foreground">檔名或標題</p>
                </div>
              </div>
              <div className="inline-flex rounded-md border border-border/70 overflow-hidden">
                <Button
                  size="sm"
                  variant={fileLabelMode === "auto" ? "default" : "ghost"}
                  className="px-3"
                  onClick={() => setFileLabelMode("auto")}
                >
                  標題
                </Button>
                <Button
                  size="sm"
                  variant={fileLabelMode === "filename" ? "default" : "ghost"}
                  className="px-3"
                  onClick={() => setFileLabelMode("filename")}
                >
                  檔名
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">順讀效果</p>
                <p className="text-xs text-muted-foreground">非目標內容處理</p>
              </div>
              <div className="inline-flex rounded-md border border-border/70 overflow-hidden">
                <Button
                  size="sm"
                  variant={focusEffect === "hide" ? "default" : "ghost"}
                  className="px-3"
                  onClick={() => setFocusEffect("hide")}
                >
                  隱藏
                </Button>
                <Button
                  size="sm"
                  variant={focusEffect === "dim" ? "default" : "ghost"}
                  className="px-3"
                  onClick={() => setFocusEffect("dim")}
                >
                  淡化
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">專注內容</p>
                <p className="text-xs text-muted-foreground">角色專注時顯示</p>
              </div>
              <div className="inline-flex rounded-md border border-border/70 overflow-hidden">
                <Button
                  size="sm"
                  variant={focusContentMode === "all" ? "default" : "ghost"}
                  className="px-3"
                  onClick={() => setFocusContentMode("all")}
                >
                  段落
                </Button>
                <Button
                  size="sm"
                  variant={focusContentMode === "dialogue" ? "default" : "ghost"}
                  className="px-3"
                  onClick={() => setFocusContentMode("dialogue")}
                >
                  台詞
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">角色色塊</p>
                <p className="text-xs text-muted-foreground">高亮角色名稱</p>
              </div>
              <div className="inline-flex rounded-md border border-border/70 overflow-hidden">
                <Button
                  size="sm"
                  variant={highlightCharacters ? "default" : "ghost"}
                  className="px-3"
                  onClick={() => setHighlightCharacters(true)}
                >
                  開
                </Button>
                <Button
                  size="sm"
                  variant={!highlightCharacters ? "default" : "ghost"}
                  className="px-3"
                  onClick={() => setHighlightCharacters(false)}
                >
                  關
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">SFX 標記</p>
                <p className="text-xs text-muted-foreground">顯示 SFX 色塊</p>
              </div>
              <div className="inline-flex rounded-md border border-border/70 overflow-hidden">
                <Button
                  size="sm"
                  variant={highlightSfx ? "default" : "ghost"}
                  className="px-3"
                  onClick={() => setHighlightSfx(true)}
                >
                  開
                </Button>
                <Button
                  size="sm"
                  variant={!highlightSfx ? "default" : "ghost"}
                  className="px-3"
                  onClick={() => setHighlightSfx(false)}
                >
                  關
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">方位/距離</p>
                <p className="text-xs text-muted-foreground">顯示 [] 標記的色塊</p>
              </div>
              <p className="text-xs text-muted-foreground">已啟用，採用與 SFX 不同的淡色。</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">PDF / 匯出內容</p>
                <p className="text-xs text-muted-foreground">選擇匯出的 HTML 來源</p>
              </div>
              <div className="inline-flex rounded-md border border-border/70 overflow-hidden">
                <Button
                  size="sm"
                  variant={exportMode === "processed" ? "default" : "ghost"}
                  className="px-3"
                  onClick={() => setExportMode("processed")}
                >
                  目前視圖
                </Button>
                <Button
                  size="sm"
                  variant={exportMode === "raw" ? "default" : "ghost"}
                  className="px-3"
                  onClick={() => setExportMode("raw")}
                >
                  原始解析
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
