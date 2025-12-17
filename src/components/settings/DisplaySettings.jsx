import React from "react";
import { Type } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { useSettings } from "../../contexts/SettingsContext";

export function DisplaySettings({ sectionRef }) {
  const {
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
    exportMode,
    setExportMode
  } = useSettings();

  return (
    <Card className="border border-border/80" ref={sectionRef}>
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
  );
}
