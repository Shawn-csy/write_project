import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "../../ui/button";
import { X } from "lucide-react";
import { useI18n } from "../../../contexts/I18nContext";
import { SortableKeyValueRow } from "./SortableKeyValueRow";

export const SortableField = ({ field, index, onUpdate, onRemove, onFocus, onBlur, dragDisabled }) => {
    const { t } = useI18n();
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id: field.id, disabled: dragDisabled });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (field.type === 'divider') {
        return (
             <div ref={setNodeRef} style={style} className="flex gap-2 items-center py-2 group">
                <button
                    type="button"
                    className="h-6 w-8 rounded-md bg-muted/30 text-muted-foreground cursor-grab flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity touch-none"
                    ref={setActivatorNodeRef}
                    {...listeners}
                    {...attributes}
                >
                    ≡
                </button>
                <div className="flex-1 flex items-center gap-2">
                    <div className="h-px bg-border flex-1"></div>
                     <input
                        id={`custom-divider-${field.id}`}
                        name={`customDivider-${field.id}`}
                        aria-label={t("sortableField.dividerAria")}
                        className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest bg-transparent border-none text-center focus:outline-none focus:text-foreground w-20 hover:text-foreground transition-colors"
                        value={field.value}
                        onChange={(e) => onUpdate(index, "value", e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()} 
                        onMouseDown={(e) => e.stopPropagation()} // Fix for DnD focus
                        placeholder={t("sortableField.sectionPlaceholder")}
                     />
                    <div className="h-px bg-border flex-1"></div>
                </div>
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-50 group-hover:opacity-100"
                     onClick={() => onRemove(index)}
                >
                    <X className="w-3 h-3" />
                </Button>
             </div>
        );
    }

    return (
        <SortableKeyValueRow
            field={field}
            index={index}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onFocus={onFocus}
            onBlur={onBlur}
            dragDisabled={dragDisabled}
            dragSortAriaLabel={t("sortableField.dragSortAria")}
            keyAriaLabel={t("sortableField.customFieldNameAria")}
            keyPlaceholder={t("sortableField.keyPlaceholder")}
            valueAriaLabel={t("sortableField.customFieldValueAria")}
            valuePlaceholder={t("sortableField.valuePlaceholder")}
            valueAs="textarea"
            dragButtonClassName="mt-2 h-8 w-8 rounded-md border bg-muted/30 text-muted-foreground cursor-grab flex items-center justify-center touch-none"
            keyContainerClassName="w-1/3"
            valueContainerClassName="w-2/3"
            keyClassName=""
            valueClassName=""
        />
    );
};
