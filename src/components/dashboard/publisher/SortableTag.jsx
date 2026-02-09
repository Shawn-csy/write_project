import React from 'react';
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const SortableTag = ({ id, onRemove, style }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const computedStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        ...style,
    };
    return (
        <span
            ref={setNodeRef}
            style={computedStyle}
            className="text-xs px-2 py-1 rounded-full flex items-center gap-1 cursor-grab"
            {...attributes}
            {...listeners}
        >
            {id}
            <button type="button" className="opacity-80 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onRemove(); }}>×</button>
        </span>
    );
};
