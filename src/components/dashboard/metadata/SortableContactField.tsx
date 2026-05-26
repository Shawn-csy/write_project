import React from "react";
import { useI18n } from "../../../contexts/I18nContext";
import { SortableKeyValueRow } from "./SortableKeyValueRow";
import type { SortableKeyValueItem } from "./SortableKeyValueRow";

interface SortableContactFieldProps {
  field: SortableKeyValueItem;
  index: number;
  onUpdate: (id: string, key: string, value: string) => void;
  onRemove: (index: number) => void;
  onFocus: () => void;
  onBlur: () => void;
  dragDisabled: boolean;
}

export const SortableContactField = ({ field, index, onUpdate, onRemove, onFocus, onBlur, dragDisabled }: SortableContactFieldProps) => {
    const { t } = useI18n();
    return (
        <SortableKeyValueRow
            field={field}
            index={index}
            onUpdate={(i, key, value) => onUpdate(field.id, key, value)}
            onRemove={onRemove}
            onFocus={onFocus}
            onBlur={onBlur}
            dragDisabled={dragDisabled}
            dragSortAriaLabel={t("sortableContactField.dragSortAria")}
            keyAriaLabel={t("sortableContactField.contactTypeAria")}
            keyPlaceholder={t("sortableContactField.typePlaceholder")}
            valueAriaLabel={t("sortableContactField.contactValueAria")}
            valuePlaceholder={t("sortableContactField.valuePlaceholder")}
        />
    );
};
