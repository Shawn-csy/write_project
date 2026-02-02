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

export default function CharacterSelect({
  characterList = [],
  filterCharacter,
  onChange,
  triggerClassName,
  contentAlign = "start",
  label = "角色",
  placeholder = "角色篩選",
  allValue = "__ALL__",
  allLabel = "全部顯示"
}) {
  if (!characterList || characterList.length === 0) return null;

  return (
    <Select value={filterCharacter} onValueChange={onChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align={contentAlign} className="max-h-[300px]">
        <SelectGroup>
          <SelectLabel>{label}</SelectLabel>
          <SelectItem value={allValue}>{allLabel}</SelectItem>
          {characterList.map((c) => (
            <SelectItem key={c} value={c} className="font-semibold">
              {c}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
