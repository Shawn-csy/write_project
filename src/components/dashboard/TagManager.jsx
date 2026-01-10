import React, { useState, useEffect } from 'react';
import { Plus, X, Tag as TagIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { getTags, createTag, deleteTag } from '../../lib/db';

const PRESET_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", 
  "bg-green-500", "bg-emerald-500", "bg-teal-500",
  "bg-cyan-500", "bg-blue-500", "bg-indigo-500",
  "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", 
  "bg-pink-500", "bg-rose-500", "bg-slate-500"
];

export default function TagManager({ onChange }) {
    const [tags, setTags] = useState([]);
    const [newTagName, setNewTagName] = useState("");
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
    const [loading, setLoading] = useState(false);

    const fetchTags = async () => {
        try {
            const data = await getTags();
            setTags(data);
            if (onChange) onChange(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchTags();
    }, []);

    const handleCreate = async () => {
        if (!newTagName.trim()) return;
        setLoading(true);
        try {
            await createTag(newTagName, selectedColor);
            setNewTagName("");
            fetchTags();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("確定刪除此標籤？")) return;
        try {
            await deleteTag(id);
            fetchTags();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
                <TagIcon className="w-4 h-4" /> 標籤管理 (Tags)
            </h3>
            
            {/* Create Tag */}
            <div className="flex gap-2">
                <Input 
                    placeholder="新標籤名稱..." 
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    className="flex-1"
                />
                <Button onClick={handleCreate} disabled={loading || !newTagName.trim()} size="icon">
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
            
            {/* Color Picker */}
            <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/20">
                {PRESET_COLORS.map(color => (
                    <button
                        key={color}
                        className={`w-5 h-5 rounded-full ${color} ring-2 ring-offset-1 transition-all ${selectedColor === color ? 'ring-foreground' : 'ring-transparent opacity-70 hover:opacity-100'}`}
                        onClick={() => setSelectedColor(color)}
                    />
                ))}
            </div>

            {/* Tag List */}
            <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                    <Badge 
                        key={tag.id} 
                        className={`${tag.color} text-white hover:${tag.color} flex items-center gap-1 pl-2 pr-1 py-1`}
                    >
                        {tag.name}
                        <div 
                            className="cursor-pointer hover:bg-black/20 rounded-full p-0.5"
                            onClick={() => handleDelete(tag.id)}
                        >
                            <X className="w-3 h-3" />
                        </div>
                    </Badge>
                ))}
                {tags.length === 0 && (
                    <p className="text-xs text-muted-foreground">尚未建立標籤</p>
                )}
            </div>
        </div>
    );
}
