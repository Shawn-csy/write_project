import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";

export function SortableKeyValueRow({
  field,
  index,
  onUpdate,
  onRemove,
  onFocus,
  onBlur,
  dragDisabled,
  dragSortAriaLabel,
  keyAriaLabel,
  keyPlaceholder,
  valueAriaLabel,
  valuePlaceholder,
  valueAs = "input",
  wrapperClassName = "flex gap-2 items-start",
  dragButtonClassName = "mt-1 h-8 w-8 rounded-md border bg-muted/30 text-muted-foreground cursor-grab touch-none",
  keyContainerClassName = "",
  valueContainerClassName = "",
  keyClassName = "w-1/3",
  valueClassName = "w-2/3",
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({
    id: field.id,
    disabled: dragDisabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const ValueComponent = valueAs === "textarea" ? Textarea : Input;

  return (
    <div ref={setNodeRef} style={style} className={wrapperClassName}>
      <button
        type="button"
        className={dragButtonClassName}
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        aria-label={dragSortAriaLabel}
      >
        ≡
      </button>
      <div className={keyContainerClassName}>
        <Input
          id={`sortable-key-${field.id}`}
          name={`sortableKey-${field.id}`}
          aria-label={keyAriaLabel}
          value={field.key}
          onChange={(e) => onUpdate(index, "key", e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={keyPlaceholder}
          className={keyClassName}
        />
      </div>
      <div className={valueContainerClassName}>
        <ValueComponent
          id={`sortable-value-${field.id}`}
          name={`sortableValue-${field.id}`}
          aria-label={valueAriaLabel}
          value={field.value}
          onChange={(e) => onUpdate(index, "value", e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={valuePlaceholder}
          className={valueClassName}
        />
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
