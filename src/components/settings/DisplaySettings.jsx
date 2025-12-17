import React from "react";
import { Type, LayoutList, Eye, Highlighter, FileText, Rabbit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useSettings } from "../../contexts/SettingsContext";
import { cn } from "../../lib/utils";

const SettingRow = ({ icon: Icon, title, description, children }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div className="flex items-start gap-3 min-w-0">
      {Icon && (
        <div className="mt-0.5 p-1.5 rounded-md bg-muted/50 text-muted-foreground">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>}
      </div>
    </div>
    <div className="shrink-0">
      {children}
    </div>
  </div>
);

const ToggleGroup = ({ options, value, onChange }) => (
  <div className="inline-flex rounded-lg border border-border/50 bg-muted/30 p-1">
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
          value === opt.value
            ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

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
    <Card className="border border-border/60 bg-card/50 shadow-sm transition-all hover:bg-card/80 hover:shadow-md hover:border-border/80" ref={sectionRef}>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
             <div className="p-2 rounded-md bg-primary/10 text-primary">
                <LayoutList className="w-4 h-4" />
             </div>
             <div>
               <CardTitle className="text-base">閱讀體驗</CardTitle>
               <CardDescription className="text-xs mt-0.5">自訂列表顯示與順讀模式</CardDescription>
             </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 divide-y divide-border/30">
          <SettingRow 
             icon={Type} 
             title="列表標題" 
             description="側邊欄位標題顯示方式"
          >
             <ToggleGroup 
                value={fileLabelMode} 
                onChange={setFileLabelMode}
                options={[
                  { label: "標題", value: "auto" },
                  { label: "檔名", value: "filename" }
                ]}
             />
          </SettingRow>

          <SettingRow 
             icon={Eye} 
             title="順讀效果" 
             description="非焦點區域的視覺處理"
          >
             <ToggleGroup 
                value={focusEffect} 
                onChange={setFocusEffect}
                options={[
                  { label: "隱藏", value: "hide" },
                  { label: "淡化", value: "dim" }
                ]}
             />
          </SettingRow>

          <SettingRow 
             icon={Rabbit} 
             title="專注範圍" 
             description="角色專注模式下的顯示內容"
          >
             <ToggleGroup 
                value={focusContentMode} 
                onChange={setFocusContentMode}
                options={[
                  { label: "整段", value: "all" },
                  { label: "僅台詞", value: "dialogue" }
                ]}
             />
          </SettingRow>

          <SettingRow 
             icon={Highlighter} 
             title="角色標記" 
             description="是否顯示角色名稱底色"
          >
             <ToggleGroup 
                value={highlightCharacters} 
                onChange={(v) => setHighlightCharacters(v)}
                options={[
                  { label: "開啟", value: true },
                  { label: "關閉", value: false }
                ]}
             />
          </SettingRow>

          <SettingRow 
             icon={Highlighter} 
             title="SFX / 方位" 
             description="強調顯示 SFX 與方位標記"
          >
             <ToggleGroup 
                value={highlightSfx} 
                onChange={(v) => setHighlightSfx(v)}
                options={[
                  { label: "開啟", value: true },
                  { label: "關閉", value: false }
                ]}
             />
          </SettingRow>

          <SettingRow 
             icon={FileText} 
             title="匯出來源" 
             description="PDF 與複製內容的來源格式"
          >
             <ToggleGroup 
                value={exportMode} 
                onChange={setExportMode}
                options={[
                  { label: "目前視圖", value: "processed" },
                  { label: "原始碼", value: "raw" }
                ]}
             />
          </SettingRow>
        </CardContent>
    </Card>
  );
}
