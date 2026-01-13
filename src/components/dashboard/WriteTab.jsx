import React, { useMemo } from "react";
import { useWriteTab } from "../../hooks/useWriteTab";
import { ScriptToolbar } from "./write/ScriptToolbar";
import { ScriptList } from "./write/ScriptList";
import { CreateScriptDialog } from "./write/CreateScriptDialog";

export function WriteTab({ onSelectScript, readOnly = false }) {
    // Hooks
    const manager = useWriteTab();
    
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
              const res = await fetch("/api/export/all", {
                  headers: { "X-User-ID": manager.currentUser.uid }
              });
              if(!res.ok) throw new Error("Export failed");
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = "scripts_backup.zip";
              document.body.appendChild(a);
              a.click();
              a.remove();
         } catch(e) {
             console.error(e);
             alert("匯出失敗");
         }
    };

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
        </div>
    );
}
