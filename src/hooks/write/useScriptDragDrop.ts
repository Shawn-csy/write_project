import { useState, useCallback } from "react";
import type React from "react";
import { updateScript, reorderScripts } from "../../lib/api/scripts";
import { useAuth } from "../../contexts/AuthContext";
import { 
    useSensor, 
    useSensors, 
    PointerSensor, 
    KeyboardSensor, 
} from '@dnd-kit/core';
import { 
    arrayMove, 
    sortableKeyboardCoordinates 
} from '@dnd-kit/sortable';
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

interface ScriptItem {
    id: string;
    title: string;
    type?: string;
    folder: string;
    sortOrder?: number;
    isPublic?: boolean;
    [key: string]: unknown;
}

export function useScriptDragDrop({
    scripts,
    setScripts,
    visibleItems,
    expandedPaths,
    currentPath,
    fetchScripts
}: {
    scripts: ScriptItem[];
    setScripts: React.Dispatch<React.SetStateAction<ScriptItem[]>>;
    visibleItems: ScriptItem[];
    expandedPaths: Set<string>;
    currentPath: string;
    fetchScripts: () => void;
}) {
    const { currentUser } = useAuth();
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveDragId(String(event.active.id));
    }, []);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);
        const activeItem = scripts.find((s) => s.id === activeId);
        const overItem = scripts.find((s) => s.id === overId);

        if (!activeItem || !overItem) return;

        // 1. Drag INTO Folder
        if (overItem.type === 'folder' && overItem.id !== activeItem.id && activeItem.folder !== ((overItem.folder === '/' ? '' : overItem.folder) + '/' + overItem.title)) {
             if (activeItem.folder === overItem.folder) {
                // Sibling folder, assume move in
             }
            
             if (activeItem.type !== 'folder') { 
                const newFolder = (overItem.folder === '/' ? '' : overItem.folder) + '/' + overItem.title;
                if (activeItem.folder !== newFolder) {
                     setScripts((prev) => prev.map((s) => s.id === activeId ? { ...s, folder: newFolder } : s));
                     try {
                        await updateScript(activeItem.id, { folder: newFolder });
                     } catch (e) { console.error(e); fetchScripts(); }
                     return;
                }
            }
        }

        // 2. Reorder / Move
        if (activeId !== overId) {
            setScripts((items) => {
                const oldIndex = visibleItems.findIndex((item) => item.id === activeId);
                const newIndex = visibleItems.findIndex((item) => item.id === overId);
                
                if (oldIndex === -1 || newIndex === -1) return items;

                const newVisible = arrayMove(visibleItems, oldIndex, newIndex);
                const movedItem = newVisible[newIndex];
                
                let newFolder = movedItem.folder;
                const prev = newVisible[newIndex - 1];

                if (prev) {
                    if (prev.type === 'folder' && expandedPaths.has((prev.folder === '/' ? '' : prev.folder) + '/' + prev.title)) {
                        newFolder = (prev.folder === '/' ? '' : prev.folder) + '/' + prev.title;
                    } else {
                        newFolder = prev.folder;
                    }
                } else {
                    newFolder = currentPath; 
                }

                movedItem.folder = newFolder;
                
                const siblings = newVisible.filter(i => i.folder === newFolder);
                const updates = siblings.map((item, idx) => ({
                    id: item.id,
                    sortOrder: idx * 1000.0,
                    folder: newFolder 
                }));
                
                const updateMap = new Map(updates.map(u => [u.id, u]));
                
                 if (movedItem.id === activeId) {
                     const originalFolder = scripts.find((s) => s.id === activeId)?.folder;
                     if (originalFolder !== newFolder) {
                         updateScript(activeId, { folder: newFolder }).catch(console.error);
                     }
                 }
                 
                 reorderScripts(updates.map(({id, sortOrder}) => ({id, sortOrder}))).catch(console.error);

                 return items.map(s => {
                     let newS = s;
                     if (s.id === activeId) {
                         newS = { ...newS, folder: newFolder };
                     }
                     if (updateMap.has(s.id)) {
                         const next = updateMap.get(s.id);
                         if (next) newS = { ...newS, sortOrder: next.sortOrder };
                     }
                     return newS;
                 });
            });
        }
    }, [scripts, setScripts, visibleItems, expandedPaths, currentPath, fetchScripts]);

    return {
        sensors,
        activeDragId,
        handleDragStart,
        handleDragEnd
    };
}
