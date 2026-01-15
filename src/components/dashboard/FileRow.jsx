import React, { useState } from "react";
import { Badge } from "../ui/badge";
import { GripVertical } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const SortableFileRow = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ 
        id: props.id,
        data: {
            type: props.isFolder ? 'folder' : 'script',
            item: props.item
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {React.isValidElement(props.children) 
                ? React.cloneElement(props.children, { dragListeners: listeners })
                : props.children
            }
        </div>
    );
};

export const FileRow = ({ icon, title, meta, actions, onClick, isFolder, tags = [], dragListeners, style }) => (
    <div 
        onClick={onClick}
        style={style}
        className="group flex items-center justify-between p-3 hover:bg-muted/50 border-b border-border/40 cursor-pointer transition-colors bg-card"
    >
        {/* Drag Handle */}
        {dragListeners && (
             <div 
                {...dragListeners}
                className="mr-2 text-muted-foreground/30 hover:text-foreground cursor-grab active:cursor-grabbing p-1"
                onClick={e => e.stopPropagation()}
            >
                <GripVertical className="w-4 h-4" />
            </div>
        )}

        <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-md ${isFolder ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'} group-hover:bg-primary/10 group-hover:text-primary transition-colors`}>
                {icon}
            </div>
            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                <div className="font-medium truncate text-sm">{title}</div>
                <div className="flex items-center gap-2">
                    {tags && tags.length > 0 && (
                        <div className="flex gap-1">
                            {tags.map(tag => (
                                <Badge key={tag.id} className={`${tag.color} text-[10px] px-1 py-0 h-4 text-white`}>
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                    {meta && <div className="text-xs text-muted-foreground truncate opacity-70 font-mono">{meta}</div>}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {actions}
        </div>
    </div>
);
