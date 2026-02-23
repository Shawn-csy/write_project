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

export default function CharacterSelect({
  characterList = [],
  filterCharacter,
  onChange,
  triggerClassName,
  contentAlign = "start",
  label = "",
  placeholder = "",
  allValue = "__ALL__",
  allLabel = ""
}) {
  const { t } = useI18n();
  const resolvedLabel = label || t("readerControls.character");
  const resolvedPlaceholder = placeholder || t("readerControls.characterPlaceholder");
  const resolvedAllLabel = allLabel || t("characterSelect.allShow");
  if (!characterList || characterList.length === 0) return null;

  return (
    <Select value={filterCharacter} onValueChange={onChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={resolvedPlaceholder} />
      </SelectTrigger>
      <SelectContent align={contentAlign} className="max-h-[300px]">
        <SelectGroup>
          <SelectLabel>{resolvedLabel}</SelectLabel>
          <SelectItem value={allValue}>{resolvedAllLabel}</SelectItem>
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
