import React from "react";
import { Sun, Moon, Palette, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { useSettings } from "../../contexts/SettingsContext";
import { cn } from "../../lib/utils";

export function ThemeSettings({ sectionRef }) {
  const { isDark, setTheme, accent, accentOptions, setAccent, accentThemes } = useSettings();

  return (
    <Card className="border border-border/60 bg-card/50 shadow-sm transition-all hover:bg-card/80 hover:shadow-md hover:border-border/80" ref={sectionRef}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
           <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Monitor className="w-4 h-4" />
           </div>
           <div>
             <CardTitle className="text-base">外觀主題</CardTitle>
             <CardDescription className="text-xs mt-0.5">自訂介面色彩與風格</CardDescription>
           </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Theme Toggle */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground/90">色彩模式</label>
          <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-lg border border-border/40">
            <button
              className={cn(
                "flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all duration-200",
                !isDark ? "bg-background shadow-sm text-foreground ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              )}
              onClick={() => setTheme("light")}
            >
              <Sun className="h-4 w-4" />
              <span>亮色</span>
            </button>
            <button
               className={cn(
                "flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all duration-200",
                isDark ? "bg-background shadow-sm text-foreground ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              )}
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-4 w-4" />
              <span>暗色</span>
            </button>
          </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
             <label className="text-sm font-medium text-foreground/90">強調色彩</label>
             <Palette className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {accentOptions.map((opt) => {
              const active = accent === opt.value;
              const swatch = accentThemes[opt.value]?.accent;
              return (
                <button
                  key={opt.value}
                  className={cn(
                    "relative group flex flex-col items-center justify-center gap-2 p-2 rounded-lg border transition-all duration-200",
                    active 
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" 
                      : "border-transparent hover:bg-muted/50 hover:border-border/60"
                  )}
                  onClick={() => setAccent(opt.value)}
                >
                  <span
                    className={cn(
                        "h-6 w-6 rounded-full shadow-sm transition-transform duration-200 group-hover:scale-110",
                        active && "ring-2 ring-background ring-offset-2 ring-offset-background"
                    )}
                    style={{ backgroundColor: swatch ? `hsl(${swatch})` : undefined }}
                  />
                  <span className={cn("text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
