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
import type { UpdateMarkerFn } from "./types";
import { useI18n } from "../../../contexts/I18nContext";
import type { ProductionMarkerMapping } from "../../../lib/productionScriptExport";

import type { LayoutConfig } from "../../../lib/v2";

interface MarkerListProps {
  layoutConfig?: LayoutConfig;
  usePresentationRenderer?: boolean;
    localConfigs: MarkerConfig[];
    visibleEntries?: Array<{ config: MarkerConfig; idx: number }>;
    setLocalConfigs: React.Dispatch<React.SetStateAction<MarkerConfig[]>>;
    updateMarker: UpdateMarkerFn;
    mapping: ProductionMarkerMapping;
    onSelect: (id: string) => void;
    onRemove: (index: number) => void;
    readOnly?: boolean;
}

export function MarkerList({
    localConfigs,
    visibleEntries,
    layoutConfig, usePresentationRenderer,
    setLocalConfigs,
    updateMarker,
    mapping,
    onSelect,
    onRemove,
    readOnly = false,
}: MarkerListProps): React.JSX.Element {
    const { t } = useI18n();
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
                
                if (oldIndex < 0 || newIndex < 0) return items;

                // Auto Update Priorities
                return newItems.map((item, index) => ({
                    ...item,
                    priority: 1000 - (index * 10)
                }));
            });
        }
    };

    const entries = visibleEntries ?? localConfigs.map((config, idx) => ({ config, idx }));

    return (
        <DndContext 
            sensors={readOnly ? undefined : sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={entries.map(({ config, idx }) => config.id || `marker-${idx}`)}
                strategy={verticalListSortingStrategy}
            >
                <div role="region" aria-label={t("markerStudio.rules")} tabIndex={0}
                     className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
                    <table className="marker-mapping-table w-full border-separate border-spacing-0 text-start text-sm">
                        <thead className="sticky top-0 z-20 bg-muted text-xs text-muted-foreground">
                            <tr>
                                {["markerUse", "sourceSymbol", "testInput", "wordResult", "readingPreview"].map(key => (
                                  <th key={key} scope="col">{t(`markerStudio.${key}`)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(({ config, idx }) => (
                                <SortableMarkerItem
                                    layoutConfig={layoutConfig} usePresentationRenderer={usePresentationRenderer}
                                    key={config.id || `marker-${idx}`}
                                    id={config.id || `marker-${idx}`}
                                    idx={idx}
                                    config={config}
                                    updateMarker={updateMarker}
                                    mapping={mapping}
                                    markerConfigs={localConfigs}
                                    onRemove={onRemove}
                                    onSelect={onSelect}
                                    readOnly={readOnly}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </SortableContext>
        </DndContext>
    );
}
