import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { X } from "lucide-react";
import { useI18n } from "../../../contexts/I18nContext";

export const SortableContactField = ({ field, index, onUpdate, onRemove, onFocus, onBlur, dragDisabled }) => {
    const { t } = useI18n();
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id: field.id, disabled: dragDisabled });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div ref={setNodeRef} style={style} className="flex gap-2 items-start">
            <button
                type="button"
                className="mt-1 h-8 w-8 rounded-md border bg-muted/30 text-muted-foreground cursor-grab touch-none"
                ref={setActivatorNodeRef}
                {...listeners}
                {...attributes}
                aria-label={t("sortableContactField.dragSortAria")}
            >
                ≡
            </button>
            <Input
                id={`contact-key-${field.id}`}
                name={`contactKey-${field.id}`}
                aria-label={t("sortableContactField.contactTypeAria")}
                value={field.key}
                onChange={(e) => onUpdate(index, "key", e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder={t("sortableContactField.typePlaceholder")}
                className="w-1/3"
            />
            <Input
                id={`contact-value-${field.id}`}
                name={`contactValue-${field.id}`}
                aria-label={t("sortableContactField.contactValueAria")}
                value={field.value}
                onChange={(e) => onUpdate(index, "value", e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder={t("sortableContactField.valuePlaceholder")}
                className="w-2/3"
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
            >
                <X className="w-4 h-4" />
            </Button>
        </div>
    );
};
