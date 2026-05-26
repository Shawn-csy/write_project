import { useSettings } from "../contexts/SettingsContext";
import { useScriptData } from "./write/useScriptData";
import { useWriteScriptActions } from "./write/useScriptActions";
import { useScriptDragDrop } from "./write/useScriptDragDrop";
import type { WriteScriptItem } from "../types/write";

interface UseWriteTabOptions {
    onScriptCreated?: (script: WriteScriptItem) => void;
}

type UseScriptDataReturn = ReturnType<typeof useScriptData>;
type UseWriteScriptActionsReturn = ReturnType<typeof useWriteScriptActions>;
type UseScriptDragDropReturn = ReturnType<typeof useScriptDragDrop>;

type UseWriteTabResult = UseScriptDataReturn & UseWriteScriptActionsReturn & UseScriptDragDropReturn & {
    markerThemes: Array<{ id: string; [key: string]: unknown }>;
};

export function useWriteTab(refreshTrigger: number, options: UseWriteTabOptions = {}): UseWriteTabResult {
    const { markerThemes } = useSettings();
    
    // 1. Data & Navigation
    const data = useScriptData(refreshTrigger);
    
    // 2. Actions
    const actions = useWriteScriptActions({
        scripts: data.scripts,
        setScripts: data.setScripts,
        currentPath: data.currentPath,
        createPath: data.createPath,
        fetchScripts: data.fetchScripts,
        onScriptCreated: options.onScriptCreated
    });

    // 3. Drag & Drop
    const dnd = useScriptDragDrop({
        scripts: data.scripts,
        setScripts: data.setScripts,
        visibleItems: data.visibleItems,
        expandedPaths: data.expandedPaths,
        currentPath: data.currentPath,
        fetchScripts: data.fetchScripts
    });

    return {
        // Data
        ...data,
        
        // Actions
        ...actions,
        
        // Drag
        ...dnd,
        
        // Settings
        markerThemes
    };
}
