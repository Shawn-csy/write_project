import React from "react";
import { GripVertical, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";

import { MarkerGeneralSettings } from "./configs/MarkerGeneralSettings";
import { MarkerLogicSettings } from "./configs/MarkerLogicSettings";
import { MarkerStyleSettings } from "./configs/MarkerStyleSettings";

// --- Sortable Item Component ---
export function SortableMarkerItem({ id, config, idx, updateMarker, removeMarker, expandedId, setExpandedId }) {
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

    const isExpanded = expandedId === (config.id || idx);
    const isBlock = config.type === 'block' || config.isBlock; 
    
    const toggleExpand = () => {
        setExpandedId(isExpanded ? null : (config.id || idx));
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("mb-2 group", isDragging && "opacity-50")}>
            <div className={cn(
                "border rounded-lg bg-card transition-all overflow-hidden shadow-sm",
                isExpanded ? "border-primary/40 ring-1 ring-primary/10" : "border-border/40 hover:border-border"
            )}>
                {/* Header Row (Always Visible) */}
                <div className="flex items-center gap-2 p-2 bg-muted/20">
                    <div 
                        {...attributes} 
                        {...listeners} 
                        className="cursor-grab hover:text-foreground text-muted-foreground p-1 rounded hover:bg-muted active:cursor-grabbing"
                        title="拖動以重新排序 (改變優先權)"
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>

                    <button className="flex-1 flex items-center gap-2 text-left" onClick={toggleExpand}>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold truncate max-w-[150px]">{config.label || '未命名'}</span>
                            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                {config.matchMode === 'regex' ? 'Regex' : (isBlock ? 'Block' : 'Inline')}
                                <span className="bg-muted px-1 rounded text-[9px]">{config.id}</span>
                            </span>
                        </div>
                    </button>

                    {/* Quick Preview Badge */}
                    <div 
                        className="hidden sm:block px-2 py-0.5 text-xs rounded border max-w-[100px] truncate"
                        style={{
                            ...config.style,
                            borderColor: 'transparent',
                            backgroundColor: config.style?.backgroundColor || 'transparent'
                        }}
                    >
                        {config.start}預覽{config.end}
                    </div>

                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/50 hover:text-destructive" onClick={() => removeMarker(idx)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="p-3 bg-background/50 space-y-4 border-t border-border/10">
                        {/* 1. General Settings */}
                        <MarkerGeneralSettings 
                            config={config} 
                            idx={idx} 
                            updateMarker={updateMarker} 
                            setExpandedId={setExpandedId} 
                        />

                        {/* 2. Logic Settings */}
                        <MarkerLogicSettings 
                            config={config} 
                            idx={idx} 
                            updateMarker={updateMarker} 
                        />

                        {/* 3. Appearance Toolbar */}
                        <MarkerStyleSettings 
                             config={config} 
                             idx={idx} 
                             updateMarker={updateMarker} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
}


