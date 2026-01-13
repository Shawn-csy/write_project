import { useState } from "react";
import { createScript, updateScript, deleteScript } from "../../lib/db";

export function useScriptActions({ 
    scripts, 
    setScripts, 
    currentPath, 
    fetchScripts 
}) {
    // Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newType, setNewType] = useState("script");
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            await createScript(newTitle, newType, currentPath);
            setNewTitle("");
            setIsCreateOpen(false);
            fetchScripts();
        } catch (error) {
            console.error(error);
        } finally {
            setCreating(false);
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
        handleTogglePublic
    };
}
