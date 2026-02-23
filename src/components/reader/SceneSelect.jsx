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
import { useI18n } from "../../contexts/I18nContext";

export default function SceneSelect({
  sceneList = [],
  currentSceneId,
  onSelectScene,
  triggerClassName,
  contentAlign = "start",
  label = "",
  placeholder = ""
}) {
  const { t } = useI18n();
  const resolvedLabel = label || t("readerControls.scene");
  const resolvedPlaceholder = placeholder || t("readerControls.scenePlaceholder");
  if (!sceneList || sceneList.length === 0) return null;

  return (
    <Select value={currentSceneId} onValueChange={onSelectScene}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={resolvedPlaceholder} />
      </SelectTrigger>
      <SelectContent align={contentAlign} className="max-h-[300px]">
        <SelectGroup>
          <SelectLabel>{resolvedLabel}</SelectLabel>
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
