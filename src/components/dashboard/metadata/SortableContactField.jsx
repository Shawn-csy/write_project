import React from "react";
import { useI18n } from "../../../contexts/I18nContext";
import { SortableKeyValueRow } from "./SortableKeyValueRow";

export const SortableContactField = ({ field, index, onUpdate, onRemove, onFocus, onBlur, dragDisabled }) => {
    const { t } = useI18n();
    return (
        <SortableKeyValueRow
            field={field}
            index={index}
            onUpdate={onUpdate}
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
