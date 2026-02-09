import React from "react";
import { Settings2, Type, Sun, Moon, BookOpen } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Slider } from "../../components/ui/slider";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useSettings } from "../../contexts/SettingsContext";
import { MarkerVisibilitySelect } from "../ui/MarkerVisibilitySelect";

export function ReaderAppearanceMenu({
    markerConfigs = [],
    hiddenMarkerIds = [],
    onToggleMarker
}) {
  const { 
      fontSize, setFontSize, 
      isDark, setTheme,
      hideWhitespace, setHideWhitespace 
  } = useSettings();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" aria-label="Appearance Settings">
          <Type className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none text-sm text-muted-foreground mb-3">Appearance</h4>
            
            {/* Theme Toggle */}
            <div className="grid gap-2">
                <Tabs value={isDark ? "dark" : "light"} onValueChange={(v) => setTheme(v)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="light">
                            <Sun className="w-4 h-4 mr-2" /> Light
                        </TabsTrigger>
                        <TabsTrigger value="dark">
                            <Moon className="w-4 h-4 mr-2" /> Dark
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            {/* Markers Toggle (Mobile Only) */}
            {markerConfigs.length > 0 && onToggleMarker && (
                <div className="grid gap-2 pt-2 border-t mt-2 block sm:hidden">
                     <span className="text-sm font-medium">Markers</span>
                     <MarkerVisibilitySelect
                        markerConfigs={markerConfigs}
                        visibleMarkerIds={null} // Let component compute
                        hiddenMarkerIds={hiddenMarkerIds}
                        onToggleMarker={onToggleMarker}
                        triggerClassName="w-full h-8"
                        contentAlign="end"
                        label="顯示標記"
                        titlePrefix="標記"
                     />
                </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between items-center mb-1">
                 <span className="text-sm font-medium">Font Size</span>
                 <span className="text-xs text-muted-foreground">{fontSize}px</span>
            </div>
            
            {/* Font Size Slider */}
            <div className="flex items-center gap-4">
                <span className="text-xs">A</span>
                <Slider 
                    defaultValue={[fontSize]} 
                    value={[fontSize]}
                    min={12} 
                    max={32} 
                    step={2} 
                    onValueChange={(val) => setFontSize(val[0])}
                    className="flex-1"
                />
                <span className="text-lg">A</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
             <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Hide Blank Lines</span>
                <Switch 
                    checked={hideWhitespace}
                    onCheckedChange={setHideWhitespace}
                />
             </div>
             <p className="text-xs text-muted-foreground">Collapse empty lines for compact view & print.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
