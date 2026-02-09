import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { X } from "lucide-react";

export const SortableField = ({ field, index, onUpdate, onRemove, onFocus, onBlur, dragDisabled }) => {
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
                        aria-label="分隔線標題"
                        className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest bg-transparent border-none text-center focus:outline-none focus:text-foreground w-20 hover:text-foreground transition-colors"
                        value={field.value}
                        onChange={(e) => onUpdate(index, "value", e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()} 
                        onMouseDown={(e) => e.stopPropagation()} // Fix for DnD focus
                        placeholder="SECTION" 
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
        <div ref={setNodeRef} style={style} className="flex gap-2 items-start">
            <button
                type="button"
                className="mt-2 h-8 w-8 rounded-md border bg-muted/30 text-muted-foreground cursor-grab flex items-center justify-center touch-none"
                ref={setActivatorNodeRef}
                {...listeners}
                {...attributes}
                aria-label="拖拉排序"
            >
                ≡
            </button>
            <div className="w-1/3">
                <Input
                    id={`custom-field-key-${field.id}`}
                    name={`customFieldKey-${field.id}`}
                    aria-label="自訂欄位名稱"
                    value={field.key}
                    onChange={(e) => onUpdate(index, "key", e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onPointerDown={(e) => e.stopPropagation()}
                    placeholder="鍵"
                />
            </div>
            <div className="w-2/3">
                <Textarea
                    id={`custom-field-value-${field.id}`}
                    name={`customFieldValue-${field.id}`}
                    aria-label="自訂欄位內容"
                    value={field.value}
                    onChange={(e) => onUpdate(index, "value", e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onPointerDown={(e) => e.stopPropagation()}
                    placeholder="值"
                />
            </div>
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
