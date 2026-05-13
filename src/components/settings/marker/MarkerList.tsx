import React from "react";
import { 
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableMarkerItem } from "./SortableMarkerItem";
import type { MarkerConfig } from "../../../types/script";

interface MarkerListProps {
    localConfigs: MarkerConfig[];
    setLocalConfigs: React.Dispatch<React.SetStateAction<MarkerConfig[]>>;
    updateMarker: (idx: number, field: string, value: unknown) => void;
    removeMarker: (idx: number) => void;
    selectedId: string | number | null;
    onSelect: (id: string | number) => void;
    readOnly?: boolean;
}

export function MarkerList({
    localConfigs,
    setLocalConfigs,
    updateMarker,
    removeMarker,
    selectedId,
    onSelect,
    readOnly = false,
}: MarkerListProps): React.JSX.Element {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
          coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
        if (readOnly) return;
        const { active, over } = event;
        if (!over) return;
        if (active.id !== over.id) {
            setLocalConfigs((items) => {
                const oldIndex = items.findIndex((item) => (item.id || item._tempId) === active.id);
                const newIndex = items.findIndex((item) => (item.id || item._tempId) === over.id);
                
                const newItems = arrayMove(items, oldIndex, newIndex);
                
                // Auto Update Priorities
                return newItems.map((item, index) => ({
                    ...item,
                    priority: 1000 - (index * 10)
                }));
            });
        }
    };

    return (
        <DndContext 
            sensors={readOnly ? undefined : sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={localConfigs.map((c, i) => c.id || `marker-${i}`)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-2">
                    {localConfigs.map((config, idx) => (
                        <SortableMarkerItem 
                            key={config.id || `marker-${idx}`}
                            id={config.id || `marker-${idx}`}
                            idx={idx}
                            config={config}
                            updateMarker={updateMarker}
                            removeMarker={removeMarker}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            readOnly={readOnly}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
