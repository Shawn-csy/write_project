import { useState } from "react";
import { createScript, updateScript, deleteScript } from "../../lib/db";

export function useScriptActions({ 
    scripts, 
    setScripts, 
    currentPath, 
    fetchScripts,
    onScriptCreated
}) {
    // Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newType, setNewType] = useState("script");
    const [creating, setCreating] = useState(false);
    
    // Rename State
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [renameId, setRenameId] = useState(null);
    const [renameTitle, setRenameTitle] = useState("");
    const [renameType, setRenameType] = useState("script");
    const [oldRenameTitle, setOldRenameTitle] = useState(""); // Track old name for folder rename
    const [oldRenameFolder, setOldRenameFolder] = useState(""); // Track old folder path
    const [renaming, setRenaming] = useState(false);

    const openRenameDialog = (item) => {
        setRenameId(item.id);
        setRenameTitle(item.title);
        setOldRenameTitle(item.title);
        setOldRenameFolder(item.folder); // We need this for folder rename logic
        setRenameType(item.type || 'script');
        setIsRenameOpen(true);
    };

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            const id = await createScript(newTitle, newType, currentPath);
            setNewTitle("");
            setIsCreateOpen(false);
            fetchScripts();
            if (newType === "script" && typeof onScriptCreated === "function") {
                onScriptCreated({
                    id,
                    title: newTitle,
                    type: "script",
                    folder: currentPath,
                    content: "",
                    isPublic: false
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    const handleRename = async () => {
        if (!renameTitle.trim() || renameTitle === oldRenameTitle) {
            setIsRenameOpen(false);
            return;
        }
        setRenaming(true);
        try {
            // 1. Rename the item itself
            await updateScript(renameId, { title: renameTitle });

            // 2. If it's a folder, update all children
            if (renameType === 'folder') {
                const oldPrefix = (oldRenameFolder === '/' ? '' : oldRenameFolder) + '/' + oldRenameTitle;
                const newPrefix = (oldRenameFolder === '/' ? '' : oldRenameFolder) + '/' + renameTitle;
                
                // Find all scripts that are in this folder or subfolders
                const children = scripts.filter(s => s.folder === oldPrefix || s.folder.startsWith(oldPrefix + '/'));
                
                // Update their folder path
                await Promise.all(children.map(c => {
                    const newFolder = c.folder.replace(oldPrefix, newPrefix);
                    return updateScript(c.id, { folder: newFolder });
                }));
            }

            // Update local state optimistic (optional, but fetchScripts handles it)
            setScripts(prev => prev.map(s => {
                if (s.id === renameId) return { ...s, title: renameTitle };
                if (renameType === 'folder') {
                    const oldPrefix = (oldRenameFolder === '/' ? '' : oldRenameFolder) + '/' + oldRenameTitle;
                    const newPrefix = (oldRenameFolder === '/' ? '' : oldRenameFolder) + '/' + renameTitle;
                    if (s.folder === oldPrefix || s.folder.startsWith(oldPrefix + '/')) {
                        return { ...s, folder: s.folder.replace(oldPrefix, newPrefix) };
                    }
                }
                return s;
            }));

            setIsRenameOpen(false);
            fetchScripts();
        } catch (error) {
            console.error("Rename failed", error);
        } finally {
            setRenaming(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("確定要刪除嗎？")) return;
        try {
            await deleteScript(id);
            setScripts(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const handleTogglePublic = async (e, item) => {
        e.stopPropagation();
        const newStatus = !item.isPublic;
        // Logic for folder confirmation
        if (item.type === 'folder' && !confirm(newStatus ? "確定要將此資料夾內所有內容設為公開嗎？" : "確定要將此資料夾內所有內容設為私有嗎？")) {
             return;
        }

        setScripts(prev => prev.map(s => {
             if (s.id === item.id) return { ...s, isPublic: newStatus };
             if (item.type === 'folder') {
                  const prefix = (item.folder === '/' ? '' : item.folder) + '/' + item.title;
                  if (s.folder === prefix || s.folder.startsWith(prefix + '/')) {
                       return { ...s, isPublic: newStatus };
                  }
             }
             return s;
        }));

        try {
            await updateScript(item.id, { isPublic: newStatus });
             if (item.type === 'folder') {
                  const prefix = (item.folder === '/' ? '' : item.folder) + '/' + item.title;
                  const children = scripts.filter(s => s.folder === prefix || s.folder.startsWith(prefix + '/'));
                  await Promise.all(children.map(c => updateScript(c.id, { isPublic: newStatus })));
             }
        } catch(err) {
            console.error(err);
             fetchScripts(); // Reload on error
        }
    };

    return {
        isCreateOpen, setIsCreateOpen,
        newTitle, setNewTitle,
        newType, setNewType,
        creating,
        handleCreate,
        handleDelete,
        handleTogglePublic,
        // Rename Exports
        isRenameOpen, setIsRenameOpen,
        renameTitle, setRenameTitle,
        renameType,
        openRenameDialog,
        handleRename,
        renaming
    };
}
