import React from "react";
import { Sun, Moon, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { useSettings } from "../../contexts/SettingsContext";

export function ThemeSettings({ sectionRef }) {
  const { isDark, setTheme, accent, accentOptions, setAccent, accentThemes } = useSettings();

  return (
    <Card className="border border-border/80" ref={sectionRef}>
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
      </CardContent>
    </Card>
  );
}
