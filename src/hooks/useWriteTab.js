import { useSettings } from "../contexts/SettingsContext";
import { useScriptData } from "./write/useScriptData";
import { useScriptActions } from "./write/useScriptActions";
import { useScriptDragDrop } from "./write/useScriptDragDrop";

export function useWriteTab(refreshTrigger) {
    const { markerThemes } = useSettings();
    
    // 1. Data & Navigation
    const data = useScriptData(refreshTrigger);
    
    // 2. Actions
    const actions = useScriptActions({ 
        scripts: data.scripts, 
        setScripts: data.setScripts, 
        currentPath: data.currentPath, 
        fetchScripts: data.fetchScripts 
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
