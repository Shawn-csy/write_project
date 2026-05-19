import React from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";
import type { MarkerConfig } from "../../../types/script";

interface SortableMarkerItemProps {
    id: string;
    config: MarkerConfig;
    idx: number;
    updateMarker: (idx: number, field: string, value: unknown) => void;
    removeMarker: (idx: number) => void;
    selectedId: string | number | null;
    onSelect: (id: string | number) => void;
    readOnly?: boolean;
}

// --- Sortable Item Component (Row Only) ---
export function SortableMarkerItem({ id, config, idx, updateMarker, removeMarker, selectedId, onSelect, readOnly = false }: SortableMarkerItemProps): React.JSX.Element {
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
        position: 'relative' as const,
    };

    const isSelected = selectedId === (config.id || idx);
    const isBlock = config.type === 'block' || config.isBlock; 
    const typeLabel = config.matchMode === 'range' ? 'Range' : config.matchMode === 'regex' ? 'Regex' : isBlock ? 'Block' : 'Inline';
    const symbolText = config.matchMode === 'regex'
        ? String(config.regex || 'regex')
        : [config.start, config.end].filter(Boolean).join(' ... ') || String(config.id || '');
    const routeText = typeof config.v2TrackId === 'string' && config.v2TrackId.trim()
        ? config.v2TrackId.trim()
        : '';
    
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
                    {...(readOnly ? {} : attributes)} 
                    {...(readOnly ? {} : listeners)} 
                    className={cn(
                      "text-muted-foreground/50 p-1 rounded",
                      readOnly ? "cursor-not-allowed opacity-40" : "cursor-grab hover:text-foreground hover:bg-muted active:cursor-grabbing"
                    )}
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()} // Prevent selection when dragging
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
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground/70">
                        <span className="truncate font-mono">{symbolText}</span>
                        {routeText ? <span className="shrink-0 rounded bg-muted px-1 font-mono">{routeText}</span> : null}
                    </div>
                </div>

                {/* Type Badge */}
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium flex-shrink-0">
                   {typeLabel}
                </span>

                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-muted-foreground/40 hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={(e) => {
                        e.stopPropagation();
                        removeMarker(idx);
                    }}
                    disabled={readOnly}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );
}
