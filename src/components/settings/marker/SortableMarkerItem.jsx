import React from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";

// --- Sortable Item Component (Row Only) ---
export function SortableMarkerItem({ id, config, idx, updateMarker, removeMarker, selectedId, onSelect }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: config.id || `marker-${idx}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        position: 'relative',
    };

    const isSelected = selectedId === (config.id || idx);
    const isBlock = config.type === 'block' || config.isBlock; 
    
    return (
        <div ref={setNodeRef} style={style} className={cn("mb-2 group relative", isDragging && "opacity-50")}>
            <div 
                className={cn(
                    "flex items-center gap-2 p-2 rounded-md border text-sm transition-all cursor-pointer",
                    isSelected 
                        ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/20" 
                        : "bg-card border-border/40 hover:border-border hover:bg-muted/30"
                )}
                onClick={() => onSelect(config.id || idx)}
            >
                {/* Drag Handle */}
                <div 
                    {...attributes} 
                    {...listeners} 
                    className="cursor-grab text-muted-foreground/50 hover:text-foreground p-1 rounded hover:bg-muted active:cursor-grabbing"
                    onClick={(e) => e.stopPropagation()} // Prevent selection when dragging
                >
                    <GripVertical className="w-4 h-4" />
                </div>

                {/* Color Dot Preview */}
                <div 
                    className="w-3 h-3 rounded-full border shadow-sm flex-shrink-0"
                    style={{ backgroundColor: config.style?.color || '#000000' }}
                />

                <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate text-xs">{config.label || '未命名'}</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate opacity-70">
                        {config.id}
                    </div>
                </div>

                {/* Type Badge */}
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium flex-shrink-0">
                   {config.matchMode === 'regex' ? 'Regex' : (isBlock ? 'Block' : 'Inline')}
                </span>

                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-muted-foreground/40 hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={(e) => {
                        e.stopPropagation();
                        removeMarker(idx);
                    }}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );
}


