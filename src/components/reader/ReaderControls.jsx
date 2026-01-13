import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"; // Adjust path if needed. ReaderControls is in src/components/reader/ so ../../components/ui/select

export function ReaderControls({
    sceneList = [],
    currentSceneId,
    onSelectScene,
    characterList = [],
    filterCharacter,
    setFilterCharacter,
    setFocusMode
}) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3 lg:flex-nowrap w-full sm:w-auto sm:items-center">
            {sceneList.length > 0 && (
                <div className="w-full sm:min-w-[200px] sm:w-auto">
                  <Select
                    value={currentSceneId || "__top__"}
                    onValueChange={(val) => {
                      const next = val === "__top__" ? "" : val;
                      onSelectScene?.(next);
                    }}
                  >
                    <SelectTrigger className="h-10 px-3 text-sm w-full bg-muted/40 hover:bg-muted/60 border-transparent hover:border-border transition-all font-medium">
                      <SelectValue placeholder="場景跳轉" />
                    </SelectTrigger>
                    <SelectContent align="start" className="max-h-[300px]">
                      <SelectGroup>
                        <SelectLabel>場景列表</SelectLabel>
                        <SelectItem value="__top__">回到開頭</SelectItem>
                        {sceneList.map((scene) => (
                          <SelectItem key={scene.id} value={scene.id} className="font-mono text-xs sm:text-sm py-2.5">
                            {scene.label}
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
        </div>
    );
}
