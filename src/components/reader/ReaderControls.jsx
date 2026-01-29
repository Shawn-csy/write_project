import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"; 


export function ReaderControls({
    sceneList = [],
    currentSceneId,
    onSelectScene,
    characterList = [],
    filterCharacter,
    setFilterCharacter,

    setFocusMode,
    isFocusMode,
    markerThemes,
    currentThemeId,
    switchTheme,

    markerConfigs,
    visibleMarkerIds,
    onToggleMarker
}) {
    return (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:gap-3 lg:flex-nowrap w-full sm:w-auto sm:items-center">
            {sceneList.length > 0 && (
                <div className="w-full sm:min-w-[150px] sm:w-auto">
                    <Select
                        value={currentSceneId}
                        onValueChange={onSelectScene}
                    >
                        <SelectTrigger className="h-10 px-3 text-sm w-full bg-muted/40 hover:bg-muted/60 border-transparent hover:border-border transition-all font-medium">
                            <SelectValue placeholder="選擇場景" />
                        </SelectTrigger>
                        <SelectContent align="start" className="max-h-[300px]">
                            <SelectGroup>
                                <SelectLabel>場景</SelectLabel>
                                {sceneList.map((scene) => (
                                    <SelectItem key={scene.id} value={scene.id} className="font-semibold">
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs min-w-[20px]">{scene.index}</span>
                                            <span className="truncate">{scene.header}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
            )}
            {characterList.length > 0 && (
                <div className="w-full sm:min-w-[150px] sm:w-auto">
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
                    <SelectTrigger className="h-10 px-3 text-sm w-full bg-muted/40 hover:bg-muted/60 border-transparent hover:border-border transition-all font-medium">
                      <SelectValue placeholder="角色篩選" />
                    </SelectTrigger>
                    <SelectContent align="start" className="max-h-[300px]">
                      <SelectGroup>
                        <SelectLabel>角色</SelectLabel>
                        <SelectItem value="__ALL__">全部顯示</SelectItem>
                        {characterList.map((c) => (
                          <SelectItem key={c} value={c} className="font-semibold">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
            )}
            
            {/* Marker Visibility Toggle */}
            {markerConfigs && markerConfigs.length > 0 && onToggleMarker && (
               <div className="w-full sm:min-w-[150px] sm:w-auto">
                    <Select
                        value="markers" // Dummy value
                        onValueChange={(val) => {
                            // Prevent selection close loop if possible, or usually Select closes.
                            // Shadcn Select is for single value. For multiple toggle, usually Popover + Command or DropdownMenuCheckboxItem.
                            // Given existing imports, let's use a simple Select but hack it or simpler:
                            // The user requested "Manual Switch".
                            // Let's use DropdownMenu if available? Or stick to Select if we only have Select imported.
                            // ReaderHeader imports Lucide icons.
                            // Let's check imports. Just Select?
                            // Let's try to import DropdownMenu which allows checkboxes. 
                            // But I need to see what's available in ReaderControls imports.
                        }}
                    >
                         <SelectTrigger className="h-10 px-3 text-sm w-full bg-muted/40 hover:bg-muted/60 border-transparent hover:border-border transition-all font-medium">
                            <span className="truncate">標記顯示 ({visibleMarkerIds?.length}/{markerConfigs.length})</span>
                        </SelectTrigger>
                        <SelectContent align="start" className="max-h-[300px]">
                            <SelectGroup>
                                <SelectLabel>顯示標記</SelectLabel>
                                {markerConfigs.map(config => {
                                    const isVisible = visibleMarkerIds?.includes(config.id);
                                    return (
                                        <div 
                                            key={config.id} 
                                            className="flex items-center px-2 py-1.5 cursor-pointer hover:bg-muted text-sm"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onToggleMarker(config.id);
                                            }}
                                        >
                                            <div className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${isVisible ? 'bg-primary border-primary text-primary-foreground' : 'border-input'}`}>
                                                {isVisible && <span className="text-[10px]">✓</span>}
                                            </div>
                                            <span className={!isVisible ? 'opacity-50' : ''}>{config.label || config.id}</span>
                                        </div>
                                    );
                                })}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
               </div>
            )}
        </div>
    );
}
