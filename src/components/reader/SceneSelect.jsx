import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export default function SceneSelect({
  sceneList = [],
  currentSceneId,
  onSelectScene,
  triggerClassName,
  contentAlign = "start",
  label = "場景",
  placeholder = "選擇場景"
}) {
  if (!sceneList || sceneList.length === 0) return null;

  return (
    <Select value={currentSceneId} onValueChange={onSelectScene}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align={contentAlign} className="max-h-[300px]">
        <SelectGroup>
          <SelectLabel>{label}</SelectLabel>
          {sceneList.map((scene) => (
            <SelectItem key={scene.id} value={scene.id} className="font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs min-w-[20px]">
                  {scene.index}
                </span>
                <span className="truncate">{scene.header}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
