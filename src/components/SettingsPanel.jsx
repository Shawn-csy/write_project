import React from "react";
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
  return (
    <div className="grid gap-4 lg:gap-5 grid-cols-1 lg:grid-cols-2">
      <Card className="border border-border/80">
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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">字級</p>
                <p className="text-xs text-muted-foreground">影響閱讀區字體大小</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[16, 24, 36, 72].map((size) => (
                <button
                  key={size}
                  aria-label={`字級 ${size}px`}
                  onClick={() => setFontSize(size)}
                  className={`h-10 px-3 inline-flex items-center justify-center rounded border ${
                    fontSize === size ? "border-foreground font-semibold" : "border-border/70"
                  } text-foreground/80 hover:text-foreground transition-colors`}
                >
                  <span style={{ fontSize: size <= 24 ? 12 : size >= 72 ? 20 : 16 }}>A</span>
                  <span className="ml-2 text-sm">{size}px</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80">
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
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsPanel;
