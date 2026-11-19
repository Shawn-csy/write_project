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

const KIND_LABELS: Record<string, string> = {
    enclosure: '包圍',
    prefix: '行首',
    range: '多行',
    regex: '正規式',
    none: '內文',
};

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
    const kindLabel = KIND_LABELS[String(config.matchMode || "enclosure")] || KIND_LABELS.enclosure;
    const symbolText = config.matchMode === 'regex'
        ? String(config.regex || 'regex')
        : [config.start, config.end].filter(Boolean).join(' … ') || String(config.id || '');
    const routeText = typeof config.v2TrackId === 'string' && config.v2TrackId.trim()
        ? config.v2TrackId.trim()
        : '';

    return (
        <div ref={setNodeRef} style={style} className={cn("group relative", isDragging && "opacity-50")}>
            <div
                role="button"
                tabIndex={0}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                        ? "bg-muted shadow-[inset_3px_0_0_hsl(var(--primary))]"
                        : "hover:bg-muted/60"
                )}
                onClick={() => onSelect(config.id || idx)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(config.id || idx);
                    }
                }}
            >
                <div
                    {...(readOnly ? {} : attributes)}
                    {...(readOnly ? {} : listeners)}
                    className={cn(
                      "rounded p-0.5 text-muted-foreground/50",
                      readOnly ? "cursor-not-allowed opacity-40" : "cursor-grab hover:bg-background hover:text-foreground active:cursor-grabbing"
                    )}
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                    aria-label="拖曳排序"
                >
                    <GripVertical className="h-4 w-4" />
                </div>

                <span
                    className="h-3 w-3 shrink-0 rounded-[3px] border border-border"
                    style={{ backgroundColor: String(config.style?.color || 'hsl(var(--foreground))') }}
                    aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                    <div className={cn("truncate text-[13px]", isSelected ? "font-semibold" : "font-medium")}>{config.label || '未命名'}</div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                        <code className="truncate rounded bg-muted px-1.5 font-mono text-[11px] text-foreground/80">{symbolText}</code>
                        {routeText ? <span className="shrink-0 text-[11px] text-muted-foreground">→ {routeText}</span> : null}
                    </div>
                </div>

                <span className="shrink-0 text-[11px] text-muted-foreground">{kindLabel}</span>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                    onClick={(e) => {
                        e.stopPropagation();
                        removeMarker(idx);
                    }}
                    disabled={readOnly}
                    aria-label={`刪除 ${config.label || '未命名'}`}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
