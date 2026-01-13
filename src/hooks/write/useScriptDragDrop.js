import { useState } from "react";
import { updateScript } from "../../lib/db";
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

export function useScriptDragDrop({
    scripts,
    setScripts,
    visibleItems,
    expandedPaths,
    currentPath,
    fetchScripts
}) {
    const { currentUser } = useAuth();
    const [activeDragId, setActiveDragId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event) => {
        setActiveDragId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveDragId(null);
        if (!over) return;

        const activeItem = scripts.find(s => s.id === active.id);
        const overItem = scripts.find(s => s.id === over.id);

        if (!activeItem || !overItem) return;

        // 1. Drag INTO Folder
        if (overItem.type === 'folder' && overItem.id !== activeItem.id && activeItem.folder !== ((overItem.folder === '/' ? '' : overItem.folder) + '/' + overItem.title)) {
             if (activeItem.folder === overItem.folder) {
                // Sibling folder, assume move in
             }
            
             if (activeItem.type !== 'folder') { 
                const newFolder = (overItem.folder === '/' ? '' : overItem.folder) + '/' + overItem.title;
                if (activeItem.folder !== newFolder) {
                     setScripts(prev => prev.map(s => s.id === active.id ? { ...s, folder: newFolder } : s));
                     try {
                        await updateScript(activeItem.id, { folder: newFolder });
                     } catch (e) { console.error(e); fetchScripts(); }
                     return;
                }
            }
        }

        // 2. Reorder / Move
        if (active.id !== over.id) {
            setScripts((items) => {
                const oldIndex = visibleItems.findIndex((item) => item.id === active.id);
                const newIndex = visibleItems.findIndex((item) => item.id === over.id);
                
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
                
                 if (movedItem.id === active.id) {
                     const originalFolder = scripts.find(s => s.id === active.id)?.folder;
                     if (originalFolder !== newFolder) {
                         updateScript(active.id, { folder: newFolder }).catch(console.error);
                     }
                 }
                 
                 fetch("/api/scripts/reorder", {
                     method: "PUT",
                     headers: { "Content-Type": "application/json", "X-User-ID": currentUser?.uid || "test-user" },
                     body: JSON.stringify(updates.map(({id, sortOrder}) => ({id, sortOrder})))
                 }).catch(console.error);

                 return items.map(s => {
                     if (s.id === active.id) return { ...s, folder: newFolder };
                     if (updateMap.has(s.id)) return { ...s, sortOrder: updateMap.get(s.id).sortOrder };
                     return s;
                 });
            });
        }
    };

    return {
        sensors,
        activeDragId,
        handleDragStart,
        handleDragEnd
    };
}
