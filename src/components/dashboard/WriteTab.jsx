import React, { useMemo, useState, useCallback } from "react";
import { useWriteTab } from "../../hooks/useWriteTab";
import { ScriptToolbar } from "./write/ScriptToolbar";
import { ScriptList } from "./write/ScriptList";
import { CreateScriptDialog } from "./write/CreateScriptDialog";
import { RenameScriptDialog } from "./write/RenameScriptDialog";
import { ImportScriptDialog } from "./write/ImportScriptDialog";
import { createScript, updateScript, getScript, exportScripts } from "../../lib/db";
import { downloadBlob } from "../../lib/download";

export function WriteTab({ onSelectScript, readOnly = false, refreshTrigger }) {
    // Hooks
    const manager = useWriteTab(refreshTrigger, {
        onScriptCreated: onSelectScript
    });
    
    // Import Dialog State
    const [isImportOpen, setIsImportOpen] = useState(false);
    
    // Breadcrumbs Logic
    const breadcrumbs = useMemo(() => {
        const parts = manager.currentPath.split("/").filter(Boolean);
        let path = "";
        return parts.map(part => {
             path += "/" + part;
             return { name: part, path };  
        });
    }, [manager.currentPath]);

    const handleExport = async () => {
         if(!manager.currentUser) return;
         try {
             const blob = await exportScripts();
             downloadBlob(blob, "scripts_backup.zip");
         } catch(e) {
             console.error(e);
             alert("匯出失敗");
         }
    };

    // Handle import script
    const handleImport = useCallback(async ({ title, content, folder }) => {
        try {
            // 1. Create Script Shell
            const id = await createScript(title, 'script', folder || manager.currentPath);
            
            // 2. Update Content
            await updateScript(id, {
                content,
                isPublic: false
            });
            
            // 3. Refresh the script list
            manager.refresh?.();
            
            // 4. Return new script
            return await getScript(id);
        } catch (err) {
            console.error("匯入失敗:", err);
            throw err;
        }
    }, [manager]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <ScriptToolbar 
                currentPath={manager.currentPath}
                breadcrumbs={breadcrumbs}
                onSelectScript={onSelectScript}
                currentUser={manager.currentUser}
                readOnly={readOnly}
                goUp={manager.goUp}
                navigateTo={manager.navigateTo}
                onExport={handleExport}
                onImport={() => setIsImportOpen(true)}
                onCreateFolder={() => { manager.setNewType('folder'); manager.setIsCreateOpen(true); }}
                onCreateScript={() => { manager.setNewType('script'); manager.setIsCreateOpen(true); }}
            />

            {/* File List */}
            <div className="border rounded-lg bg-card flex-1 min-h-0 overflow-y-auto">
                 <ScriptList 
                    loading={manager.loading}
                    visibleItems={manager.visibleItems}
                    readOnly={readOnly}
                    currentPath={manager.currentPath}
                    expandedPaths={manager.expandedPaths}
                    activeDragId={manager.activeDragId}
                    markerThemes={manager.markerThemes}
                    sensors={manager.sensors}
                    
                    // Actions
                    onSelectScript={onSelectScript}
                    onToggleExpand={manager.toggleExpand}
                    onDelete={manager.handleDelete}
                    onTogglePublic={manager.handleTogglePublic}
                    onRename={manager.openRenameDialog}
                    onGoUp={manager.goUp}
                    onDragStart={manager.handleDragStart}
                    onDragEnd={manager.handleDragEnd}
                    
                    // Setters
                    setScripts={manager.setScripts}
                 />
            </div>

            {/* Create Dialog */}
            <CreateScriptDialog 
                open={manager.isCreateOpen}
                onOpenChange={manager.setIsCreateOpen}
                newType={manager.newType}
                newTitle={manager.newTitle}
                setNewTitle={manager.setNewTitle}
                handleCreate={manager.handleCreate}
                creating={manager.creating}
                currentPath={manager.currentPath}
            />

            {/* Rename Dialog */}
            <RenameScriptDialog
                open={manager.isRenameOpen}
                onOpenChange={manager.setIsRenameOpen}
                type={manager.renameType}
                oldName={manager.oldRenameTitle} 
                newName={manager.renameTitle}
                setNewName={manager.setRenameTitle}
                handleRename={manager.handleRename}
                renaming={manager.renaming}
            />

            {/* Import Dialog */}
            <ImportScriptDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                onImport={handleImport}
                currentPath={manager.currentPath}
                existingMarkerConfigs={[]}
                cloudConfigs={manager.markerThemes || []}
            />
        </div>
    );
}
