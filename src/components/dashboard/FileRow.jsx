import React from "react";
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
                ? React.cloneElement(props.children, { dragListeners: props.disableDrag ? null : listeners })
                : props.children
            }
        </div>
    );
};

export const FileRow = ({ icon, title, meta, actions, onClick, onDoubleClick, isFolder, tags = [], dragListeners, style, className = "" }) => {
    const resolveTagSwatch = (rawColor) => {
        const value = String(rawColor || "").trim();
        if (!value) return { className: "bg-primary/60", style: undefined };
        if (value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl") || value.startsWith("var(")) {
            return { className: "", style: { backgroundColor: value } };
        }
        return { className: value, style: undefined };
    };
    const normalizedTags = (tags || [])
        .map((tag, idx) => {
            if (typeof tag === "string") {
                return { id: `tag-${idx}-${tag}`, name: tag, color: "" };
            }
            return {
                id: tag?.id ?? `tag-${idx}-${tag?.name || ""}`,
                name: tag?.name || "",
                color: tag?.color || "",
            };
        })
        .filter((tag) => Boolean(tag.name));
    const visibleTags = normalizedTags.slice(0, 3);
    const hiddenCount = Math.max(0, normalizedTags.length - visibleTags.length);
    const hiddenTagsLabel = normalizedTags
        .slice(3)
        .map((tag) => tag.name)
        .filter(Boolean)
        .join("、");

    return (
    <div 
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        style={style}
        className={`group flex cursor-pointer items-center justify-between border-b border-border/40 bg-[hsl(var(--surface-1))] p-3 transition-colors hover:bg-[hsl(var(--surface-2))] ${className}`}
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
            <div className={`p-2 rounded-md ${isFolder ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'} group-hover:bg-primary/10 group-hover:text-primary transition-colors`}>
                {icon}
            </div>
            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                <div className="font-medium truncate text-sm">{title}</div>
                <div className="flex items-start gap-2 min-w-0">
                    {visibleTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 max-w-full min-w-0">
                            {visibleTags.map((tag) => (
                                <Badge
                                    key={tag.id}
                                    variant="outline"
                                    className="flex h-4 max-w-[120px] items-center gap-1 border-[color:var(--license-filter-border)] bg-[color:var(--license-filter-bg)] px-1 py-0 text-[10px] text-[color:var(--license-filter-fg)]"
                                    title={tag.name}
                                >
                                    {(() => {
                                        const swatch = resolveTagSwatch(tag.color);
                                        return (
                                            <span
                                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${swatch.className}`}
                                                style={swatch.style}
                                            />
                                        );
                                    })()}
                                    <span className="truncate">{tag.name}</span>
                                </Badge>
                            ))}
                            {hiddenCount > 0 && (
                                <Badge
                                    variant="outline"
                                    className="text-[10px] px-1 py-0 h-4 text-muted-foreground"
                                    title={hiddenTagsLabel || `還有 ${hiddenCount} 個標籤`}
                                >
                                    +{hiddenCount}
                                </Badge>
                            )}
                        </div>
                    )}
                    {meta && <div className="text-xs text-muted-foreground truncate opacity-70 font-mono min-w-0">{meta}</div>}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {actions}
        </div>
    </div>
    );
};
