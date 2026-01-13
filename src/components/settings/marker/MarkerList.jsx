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

export function MarkerList({
    localConfigs,
    setLocalConfigs,
    updateMarker,
    removeMarker,
    expandedId,
    setExpandedId
}) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
          coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        
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
            sensors={sensors}
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
                            expandedId={expandedId}
                            setExpandedId={setExpandedId}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
