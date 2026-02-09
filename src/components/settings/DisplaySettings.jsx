import React from "react";
import { Type, LayoutList, Eye, Highlighter, FileText, Rabbit, Ruler } from "lucide-react";
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
    // focusEffect, focusContentMode removed
    // highlightCharacters, highlightSfx removed
    showLineUnderline,
    setShowLineUnderline
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
             icon={Ruler} 
             title="行底線" 
             description="顯示每一行的閱讀輔助底線"
          >
             <ToggleGroup 
                value={showLineUnderline} 
                onChange={(v) => setShowLineUnderline(v)}
                options={[
                  { label: "開啟", value: true },
                  { label: "關閉", value: false }
                ]}
             />
          </SettingRow>




        </CardContent>
    </Card>
  );
}
