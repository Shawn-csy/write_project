import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { AlertTriangle, X, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "../ui/select";
import { Textarea } from "../ui/textarea"; 
import { updateScript, addTagToScript, removeTagFromScript, getTags, createTag, getScript, getPersonas, getOrganizations } from "../../lib/db";
import { useAuth } from "../../contexts/AuthContext";
import { extractMetadataWithRaw, rewriteMetadata } from "../../lib/metadataParser";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


const SortableField = ({ field, index, onUpdate, onRemove, onFocus, onBlur, dragDisabled }) => {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id: field.id, disabled: dragDisabled });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div ref={setNodeRef} style={style} className="flex gap-2 items-start">
            <button
                type="button"
                className="mt-2 h-8 w-8 rounded-md border bg-muted/30 text-muted-foreground cursor-grab"
                ref={setActivatorNodeRef}
                {...listeners}
                {...attributes}
                aria-label="拖拉排序"
            >
                ≡
            </button>
            <div className="w-1/3">
                <Input
                    value={field.key}
                    onChange={(e) => onUpdate(index, "key", e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onPointerDown={(e) => e.stopPropagation()}
                    placeholder="鍵"
                />
            </div>
            <div className="w-2/3">
                <Textarea
                    value={field.value}
                    onChange={(e) => onUpdate(index, "value", e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onPointerDown={(e) => e.stopPropagation()}
                    placeholder="值"
                />
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
            >
                <X className="w-4 h-4" />
            </Button>
        </div>
    );
};

const SortableContactField = ({ field, index, onUpdate, onRemove, onFocus, onBlur, dragDisabled }) => {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id: field.id, disabled: dragDisabled });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div ref={setNodeRef} style={style} className="flex gap-2 items-start">
            <button
                type="button"
                className="mt-1 h-8 w-8 rounded-md border bg-muted/30 text-muted-foreground cursor-grab"
                ref={setActivatorNodeRef}
                {...listeners}
                {...attributes}
                aria-label="拖拉排序"
            >
                ≡
            </button>
            <Input
                value={field.key}
                onChange={(e) => onUpdate(index, "key", e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="種類"
                className="w-1/3"
            />
            <Input
                value={field.value}
                onChange={(e) => onUpdate(index, "value", e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="內容"
                className="w-2/3"
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
            >
                <X className="w-4 h-4" />
            </Button>
        </div>
    );
};

export function ScriptMetadataDialog({ script, scriptId, open, onOpenChange, onSave }) {
    const [title, setTitle] = useState("");
    const [coverUrl, setCoverUrl] = useState("");
    const [status, setStatus] = useState("Private");
    
    // Extended Metadata Strings
    const [author, setAuthor] = useState("");
    const [date, setDate] = useState("");
    const [contact, setContact] = useState("");
    const [contactFields, setContactFields] = useState([]);
    const [source, setSource] = useState("");
    const [synopsis, setSynopsis] = useState("");
    // const [description, setDescription] = useState(""); // Merged into synopsis
    const [customFields, setCustomFields] = useState([]);
    const [jsonMode, setJsonMode] = useState(false);
    const [jsonText, setJsonText] = useState("");
    const [jsonError, setJsonError] = useState("");
    const customIdRef = useRef(0);
    const initializedRef = useRef(false);
    const userEditedRef = useRef(false);
    const [localScript, setLocalScript] = useState(null);
    const activeScript = scriptId ? localScript : script;
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
    );
    const [dragDisabled, setDragDisabled] = useState(false);
    const activeSensors = dragDisabled ? [] : sensors;

    const handleCustomFieldUpdate = (index, field, value) => {
        userEditedRef.current = true;
        setCustomFields((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleContactFieldUpdate = (index, field, value) => {
        userEditedRef.current = true;
        setContactFields((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const addCustomField = (key = "", value = "") => {
        customIdRef.current += 1;
        setCustomFields((prev) => [...prev, { id: `cf-${customIdRef.current}`, key, value }]);
    };

    const applyJson = async () => {
        try {
            const parsed = JSON.parse(jsonText);
            setJsonError("");
            if (parsed.title !== undefined) setTitle(parsed.title);
            if (parsed.author !== undefined) setAuthor(parsed.author);
            if (parsed.authors !== undefined && !parsed.author) setAuthor(parsed.authors);
            if (parsed.date !== undefined) setDate(parsed.date);
            if (parsed.draftDate !== undefined) setDate(parsed.draftDate);
            if (parsed.synopsis !== undefined) setSynopsis(parsed.synopsis);
            if (parsed.description !== undefined && !parsed.synopsis) setSynopsis(parsed.description);
            if (parsed.contact !== undefined) setContact(parsed.contact);
            if (parsed.contactFields !== undefined || parsed.contactInfo !== undefined || parsed.contact !== undefined) {
                const cf = parsed.contactFields || parsed.contactInfo || parsed.contact;
                const next = Array.isArray(cf)
                    ? cf.map((f, idx) => ({ id: `ct-${idx + 1}`, key: f.key || "", value: f.value || "" }))
                    : Object.entries(cf || {}).map(([k, v], idx) => ({ id: `ct-${idx + 1}`, key: k, value: String(v ?? "") }));
                setContactFields(next);
            }
            if (parsed.source !== undefined) setSource(parsed.source);
            if (parsed.cover !== undefined) setCoverUrl(parsed.cover);
            if (parsed.status !== undefined) setStatus(parsed.status);
            if (parsed.publishAs !== undefined) setIdentity(parsed.publishAs);
            if (parsed.personaId && !parsed.publishAs) setIdentity(`persona:${parsed.personaId}`);
            if (parsed.organizationId && !parsed.publishAs) setIdentity(`org:${parsed.organizationId}`);
            if (parsed.selectedOrgId !== undefined) setSelectedOrgId(parsed.selectedOrgId);
            if (parsed.orgId !== undefined) setSelectedOrgId(parsed.orgId);
            const custom = parsed.custom || parsed.customFields || {};
            const next = Array.isArray(custom)
                ? custom.map((f, idx) => ({ id: `cf-${idx + 1}`, key: f.key || "", value: f.value || "" }))
                : Object.entries(custom).map(([k, v], idx) => ({ id: `cf-${idx + 1}`, key: k, value: String(v ?? "") }));
            setCustomFields(next);
            if (parsed.tags) {
                const raw = Array.isArray(parsed.tags) ? parsed.tags : String(parsed.tags).split(/,|，/).map(t => t.trim()).filter(Boolean);
                const entries = raw.map((t) => (typeof t === "string" ? { name: t } : t));
                const byName = new Map((availableTags || []).map(t => [t.name.toLowerCase(), t]));
                const resolved = [];
                for (const entry of entries) {
                    const name = String(entry.name || "").trim();
                    if (!name) continue;
                    const existing = byName.get(name.toLowerCase());
                    if (existing) {
                        resolved.push(existing);
                    } else {
                        const created = await createTag(name, entry.color || "bg-slate-500");
                        resolved.push(created);
                    }
                }
                setCurrentTags(resolved);
            }
        } catch (e) {
            setJsonError("JSON 格式錯誤，請檢查。");
        }
    };
    
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [currentTags, setCurrentTags] = useState([]); 
    const [availableTags, setAvailableTags] = useState([]);
    const [newTagInput, setNewTagInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Identity Selection
    const { currentUser } = useAuth();
    const [identity, setIdentity] = useState("user"); // user, persona:ID, org:ID
    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [personas, setPersonas] = useState([]);
    const [orgs, setOrgs] = useState([]);

    useEffect(() => {
        if (open && currentUser) {
            Promise.all([
                getPersonas(),
                getOrganizations()
            ]).then(([pData, oData]) => {
                setPersonas(pData || []);
                setOrgs(oData || []);
            });
            loadTags();
        }
    }, [open, currentUser]);

    useEffect(() => {
        if (!open) {
            initializedRef.current = false;
            userEditedRef.current = false;
            setLocalScript(null);
            return;
        }
        if (initializedRef.current) return;
        if (scriptId) {
            initializedRef.current = true;
            userEditedRef.current = false;
            getScript(scriptId)
                .then((full) => setLocalScript(full))
                .catch((e) => console.error("Failed to load script", e));
            return;
        }
        if (!script) return;
        initializedRef.current = true;
        userEditedRef.current = false;

        if (script) {
            // Initial Basics
            setTitle(script.title || "");
            setCoverUrl(script.coverUrl || "");
            setStatus(script.status || (script.isPublic ? "Public" : "Private"));
            setCurrentTags(script.tags || []);
            
            // Determine Identity
            if (script.organizationId) {
                setIdentity(`org:${script.organizationId}`);
                setSelectedOrgId(script.organizationId);
            } else if (script.personaId) {
                setIdentity(`persona:${script.personaId}`);
            } else {
                const preferredPersonaId = localStorage.getItem("preferredPersonaId");
                setIdentity(preferredPersonaId ? `persona:${preferredPersonaId}` : "user");
            }
            
            // Extract from content for extended fields
            // Function to safely load content if missing
            const loadContent = async () => {
                let content = script.content;
                // If content is not loaded, we might need to fetch it? 
                // Using db.getScript if content is undefined/null and script.id exists
                if (!content && script.id) {
                     try {
                        const full = await getScript(script.id);
                        content = full.content;
                     } catch(e) { console.error(e); }
                }
                
                if (content) {
                    const { meta, rawEntries } = extractMetadataWithRaw(content);
                    // Prioritize explicit DB field, fallback to Meta
                    setTitle(prev => prev || meta.title || "");
                    setAuthor(script.author || meta.author || meta.authors || "");
                    setDate(script.draftDate || meta.date || meta.draftdate || "");
                    setContact(meta.contact || "");
                    setSource(meta.source || "");
                    setSynopsis(meta.synopsis || meta.summary || meta.description || meta.notes || "");
                    // setDescription(meta.description || meta.notes || "");
                    
                    if (!script.coverUrl && (meta.cover || meta.coverurl)) {
                        setCoverUrl(meta.cover || meta.coverurl);
                    }

                    const reserved = new Set([
                        "title", "credit", "author", "authors", "source",
                        "draftdate", "date", "contact", "copyright",
                        "notes", "description", "synopsis", "summary",
                        "cover", "coverurl"
                    ]);
                    if (!userEditedRef.current && (customFields || []).length === 0) {
                        const custom = rawEntries
                            .map(({ key, value }, idx) => ({ id: `${Date.now()}-${idx}`, key, value }))
                            .filter((entry) => {
                                const norm = entry.key.toLowerCase().replace(/\s/g, "");
                                return !reserved.has(norm);
                            });
                        setCustomFields(custom);
                    }
                }
            };
            loadContent();
        }
    }, [open, scriptId, script?.id]);

    useEffect(() => {
        if (!open) return;
        if (!scriptId || !localScript || userEditedRef.current) return;
        // Initialize from fetched script once
        setTitle(localScript.title || "");
        setCoverUrl(localScript.coverUrl || "");
        setStatus(localScript.status || (localScript.isPublic ? "Public" : "Private"));
        setCurrentTags(localScript.tags || []);

        if (localScript.organizationId) {
            setIdentity(`org:${localScript.organizationId}`);
            setSelectedOrgId(localScript.organizationId);
        } else if (localScript.personaId) {
            setIdentity(`persona:${localScript.personaId}`);
        } else {
            const preferredPersonaId = localStorage.getItem("preferredPersonaId");
            setIdentity(preferredPersonaId ? `persona:${preferredPersonaId}` : "user");
        }

        const loadContent = async () => {
            let content = localScript.content;
            if (!content && localScript.id) {
                try {
                    const full = await getScript(localScript.id);
                    content = full.content;
                } catch (e) {
                    console.error(e);
                }
            }
            if (content) {
                const { meta, rawEntries } = extractMetadataWithRaw(content);
                setTitle(prev => prev || meta.title || "");
                setAuthor(localScript.author || meta.author || meta.authors || "");
                setDate(localScript.draftDate || meta.date || meta.draftdate || "");
                setContact(meta.contact || "");
                setSource(meta.source || "");
                setSynopsis(meta.synopsis || meta.summary || meta.description || meta.notes || "");
                // setDescription(meta.description || meta.notes || "");

                if (!localScript.coverUrl && (meta.cover || meta.coverurl)) {
                    setCoverUrl(meta.cover || meta.coverurl);
                }

                const reserved = new Set([
                    "title", "credit", "author", "authors", "source",
                    "draftdate", "date", "contact", "copyright",
                    "notes", "description", "synopsis", "summary",
                    "cover", "coverurl"
                ]);
                if (!userEditedRef.current && (customFields || []).length === 0) {
                    const custom = rawEntries
                        .map(({ key, value }, idx) => ({ id: `${Date.now()}-${idx}`, key, value }))
                        .filter((entry) => {
                            const norm = entry.key.toLowerCase().replace(/\s/g, "");
                            return !reserved.has(norm);
                        });
                    setCustomFields(custom);
                }
            }
        };
        loadContent();
    }, [open, scriptId, localScript]);

    useEffect(() => {
        if (jsonMode) return;
        const customObject = {};
        (customFields || []).forEach(({ key, value }) => {
            if (key) customObject[key] = value;
        });
        const contactObject = {};
        (contactFields || []).forEach(({ key, value }) => {
            if (key) contactObject[key] = value;
        });
        const payload = {
            title,
            credit: "",
            author,
            authors: "",
            draftDate: date,
            synopsis,
            // description,
            contact,
            source,
            cover: coverUrl,
            status,
            publishAs: identity,
            selectedOrgId: selectedOrgId || "",
            tags: (currentTags || []).map(t => ({ name: t.name, color: t.color })),
            contactFields: contactObject,
            custom: customObject
        };
        setJsonText(JSON.stringify(payload, null, 2));
    }, [
        date,
        synopsis,
        // description,
        contact,
        source,
        coverUrl,
        status,
        identity,
        selectedOrgId,
        currentTags,
        contactFields,
        customFields,
        jsonMode
    ]);

    useEffect(() => {
        if (open) {
            loadTags();
        }
    }, [open]);

    useEffect(() => {
        if (identity === "user") {
            setSelectedOrgId("");
            return;
        }
        if (identity.startsWith("org:")) {
            setSelectedOrgId(identity.split(":")[1]);
            return;
        }
        if (identity.startsWith("persona:")) {
            const personaId = identity.split(":")[1];
            const persona = personas.find(p => p.id === personaId);
            if (!persona) {
                setIdentity("user");
                setSelectedOrgId("");
                return;
            }
            const orgIds = persona?.organizationIds || [];
            if (orgIds.length === 0) {
                setSelectedOrgId("");
                return;
            }
            if (!orgIds.includes(selectedOrgId)) {
                setSelectedOrgId(orgIds[0]);
            }
        }
    }, [identity, personas, selectedOrgId]);

    const loadTags = async () => {
        try {
            const tags = await getTags();
            setAvailableTags(tags || []);
        } catch (e) {
            console.error("Failed to load tags", e);
        }
    };

    const handleAddTag = async () => {
        if (!newTagInput.trim()) return;
        const tagName = newTagInput.trim();
        
        if (currentTags.find(t => t.name === tagName)) {
            setNewTagInput("");
            return;
        }

        let tagToAdd = availableTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

        try {
            if (!tagToAdd) {
                const newTag = await createTag(tagName, "bg-gray-500");
                tagToAdd = newTag; 
                setAvailableTags([...availableTags, newTag]);
            }
            setCurrentTags([...currentTags, tagToAdd]);
            setNewTagInput("");
        } catch (e) {
            console.error("Error adding tag", e);
        }
    };

    const handleRemoveTag = (tagId) => {
        setCurrentTags(currentTags.filter(t => t.id !== tagId));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Prepare Content Update
            // Fetch latest content first to ensure we don't overwrite concurrent edits if possible?
            // For now assuming script.content is mostly fresh or we fetch it.
            const workingScript = activeScript || script;
            let content = workingScript?.content;
            if (!content && workingScript?.id) {
                 const full = await getScript(workingScript.id);
                 content = full.content;
            }

            const newContent = rewriteMetadata(content, {
                title,
                author,
                date, // Standard Fountain key
                contact: contactFields && contactFields.length > 0 ? JSON.stringify(Object.fromEntries(contactFields.filter(f => f.key).map(f => [f.key, f.value]))) : contact,
                source,
                synopsis,
                // description, // Removed
                cover: coverUrl // Save cover to fountain as well for portability
            });

            const customUpdates = {};
            (customFields || []).forEach(({ key, value }) => {
                if (key && value) customUpdates[key] = value;
            });
            const finalContent = rewriteMetadata(newContent, customUpdates);

            // 2. Batch Update to DB
            // Passing explicit known columns for DB optimization (if backend supported)
            // AND the content containing the truth.
            // 2. Batch Update to DB
            // Parse Identity
            let updatePayload = {
                title,
                coverUrl,
                status,
                content: finalContent,
                author, // Text author fallback
                draftDate: date,
                isPublic: status === "Public",
                personaId: null,
                organizationId: null
            };

            if (identity.startsWith("persona:")) {
                updatePayload.personaId = identity.split(":")[1];
                updatePayload.organizationId = selectedOrgId || null;
            } else if (identity.startsWith("org:")) {
                updatePayload.organizationId = identity.split(":")[1];
            }

            await updateScript(workingScript.id, updatePayload);

            // 3. Handle Tags Diff
            const originalTagIds = new Set(((workingScript && workingScript.tags) || []).map(t => t.id));
            const currentTagIds = new Set(currentTags.map(t => t.id));
            const addedTags = currentTags.filter(t => !originalTagIds.has(t.id));
            const removedTags = ((workingScript && workingScript.tags) || []).filter(t => !currentTagIds.has(t.id));

            await Promise.all([
                ...addedTags.map(t => addTagToScript(workingScript.id, t.id)),
                ...removedTags.map(t => removeTagFromScript(workingScript.id, t.id))
            ]);

            onSave({ 
                ...(workingScript || script), 
                title, coverUrl, status, 
                content: finalContent, 
                author, draftDate: date,
                tags: currentTags 
            }); 
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save script metadata", error);
            alert("儲存失敗");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>編輯劇本資訊</DialogTitle>
                    <DialogDescription>
                        設定劇本的元數據 (Metadata)。這些資訊將會寫入劇本檔案的標頭中。
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">標題 (Title)</label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="劇本標題" />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">發布身分 (Publish As)</label>
                            <Select value={identity} onValueChange={setIdentity}>
                                <SelectTrigger>
                                    <SelectValue placeholder="選擇身分" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">{currentUser?.displayName || "個人 (Me)"}</SelectItem>
                                    {personas.length > 0 && (
                                        <SelectGroup>
                                            <SelectLabel>作者身分 (Personas)</SelectLabel>
                                            {personas.map(p => (
                                                <SelectItem key={p.id} value={`persona:${p.id}`}>{p.displayName}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    )}
                                    {orgs.length > 0 && (
                                        <SelectGroup>
                                            <SelectLabel>組織 (Organizations)</SelectLabel>
                                            {orgs.map(o => (
                                                <SelectItem key={o.id} value={`org:${o.id}`}>{o.name}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {identity.startsWith("persona:") && (
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">所屬組織 (From Persona)</label>
                            <Select value={selectedOrgId || "none"} onValueChange={(val) => setSelectedOrgId(val === "none" ? "" : val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="不選擇" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">不選擇</SelectItem>
                                    {(() => {
                                        const personaId = identity.split(":")[1];
                                        const persona = personas.find(p => p.id === personaId);
                                        const orgIds = persona?.organizationIds || [];
                                        return orgs
                                            .filter(o => orgIds.includes(o.id))
                                            .map(o => (
                                                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                            ));
                                    })()}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <label className="text-sm font-medium">發布狀態</label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="選擇狀態" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Private">私有 (Private)</SelectItem>
                                    <SelectItem value="Public">公開 (Public)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="grid gap-2">
                            <label className="text-sm font-medium">日期 (Date)</label>
                            <Input value={date} onChange={e => setDate(e.target.value)} placeholder="e.g. 2024-01-01 or Draft 1" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">簡介 (Synopsis)</label>
                            <Textarea
                                value={synopsis}
                                onChange={(e) => setSynopsis(e.target.value)}
                                placeholder="劇本的簡介或摘要..."
                                className="h-32"
                            />
                        </div>
                    </div>
                
                    {/* Status Alert */}
                    {status === "Public" && (!coverUrl || currentTags.length === 0) && (
                        <div className="flex w-full items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div className="grid gap-1">
                                <h5 className="font-medium text-yellow-900 leading-none tracking-tight">建議補充資訊</h5>
                                <div className="text-yellow-700 opacity-90 leading-relaxed">
                                    建議補充
                                    {!coverUrl && " 封面"}
                                    {!coverUrl && currentTags.length === 0 && " 與"}
                                    {currentTags.length === 0 && " 標籤"}
                                    以增加曝光。
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Advanced Toggle */}
                    <div className="flex items-center justify-between mt-2">
                        <div 
                            className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground select-none"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                        >
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            <span>更多資訊 (封面、聯絡方式、自訂欄位)</span>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => setJsonMode(!jsonMode)}>
                            {jsonMode ? "表單模式" : "JSON 模式"}
                        </Button>
                    </div>

                    {showAdvanced && !jsonMode && (
                        <div className="grid gap-4 p-4 border rounded-lg bg-muted/20 animate-in slide-in-from-top-2 duration-200">
                             <div className="grid gap-2">
                                <label className="text-sm font-medium">作者名稱 (Author Text)</label>
                                <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="覆蓋顯示的作者名稱..." />
                                <div className="text-xs text-muted-foreground">若留空則顯示發布身分的名稱。此欄位會寫入劇本標頭。</div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">封面圖片 URL (Cover)</label>
                                <Input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." />
                            </div>
                             <div className="grid gap-2">
                                <label className="text-sm font-medium">聯絡方式 (Contact)</label>
                                <div className="flex flex-wrap gap-2">
                                    {["Email", "手機", "Discord", "IG"].map((preset) => (
                                        <Button
                                            key={preset}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                customIdRef.current += 1;
                                                setContactFields((prev) => [...prev, { id: `ct-${customIdRef.current}`, key: preset, value: "" }]);
                                            }}
                                        >
                                            + {preset}
                                        </Button>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            customIdRef.current += 1;
                                            setContactFields((prev) => [...prev, { id: `ct-${customIdRef.current}`, key: "", value: "" }]);
                                        }}
                                    >
                                        + 新增
                                    </Button>
                                </div>
                                <DndContext
                                    sensors={activeSensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={({ active, over }) => {
                                        if (!over || active.id === over.id) return;
                                        const items = contactFields.map((f) => f.id);
                                        const oldIndex = items.indexOf(active.id);
                                        const newIndex = items.indexOf(over.id);
                                        setContactFields(arrayMove(contactFields, oldIndex, newIndex));
                                    }}
                                >
                                    <SortableContext
                                        items={contactFields.map((f) => f.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {contactFields.map((field, idx) => (
                                                <SortableContactField 
                                                    key={field.id} 
                                                    field={field} 
                                                    index={idx}
                                                    onUpdate={handleContactFieldUpdate}
                                                    onRemove={(i) => setContactFields(prev => prev.filter((_, idx) => idx !== i))}
                                                    onFocus={() => setDragDisabled(true)}
                                                    onBlur={() => setDragDisabled(false)}
                                                    dragDisabled={dragDisabled}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                                <div className="text-xs text-muted-foreground">可自行新增欄位，例如 Email、手機、Discord。</div>
                            </div>
                             <div className="grid gap-2">
                                <label className="text-sm font-medium">來源 (Source)</label>
                                <Input value={source} onChange={e => setSource(e.target.value)} placeholder="改編來源或其他" />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">自訂欄位</label>
                                <div className="flex flex-wrap gap-2">
                                    {["角色設定", "世界觀", "備註"].map((preset) => (
                                        <Button
                                            key={preset}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addCustomField(preset, "")}
                                        >
                                            + {preset}
                                        </Button>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => addCustomField("", "")}
                                    >
                                        + 新增欄位
                                    </Button>
                                </div>
                                <DndContext
                                    sensors={activeSensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={({ active, over }) => {
                                        if (!over || active.id === over.id) return;
                                        const items = customFields.map((f) => f.id);
                                        const oldIndex = items.indexOf(active.id);
                                        const newIndex = items.indexOf(over.id);
                                        setCustomFields(arrayMove(customFields, oldIndex, newIndex));
                                    }}
                                >
                                    <SortableContext
                                        items={customFields.map((f) => f.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {customFields.map((field, idx) => (
                                                <SortableField 
                                                    key={field.id} 
                                                    field={field} 
                                                    index={idx}
                                                    onUpdate={handleCustomFieldUpdate}
                                                    onRemove={(i) => setCustomFields(prev => prev.filter((_, idx) => idx !== i))}
                                                    onFocus={() => setDragDisabled(true)}
                                                    onBlur={() => setDragDisabled(false)}
                                                    dragDisabled={dragDisabled}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                                <div className="text-xs text-muted-foreground">
                                    這些欄位會寫入劇本標頭，可自由新增。
                                </div>
                            </div>
                        </div>
                    )}

                    {showAdvanced && jsonMode && (
                        <div className="grid gap-3 p-4 border rounded-lg bg-muted/20">
                            <Textarea
                                value={jsonText}
                                onChange={(e) => setJsonText(e.target.value)}
                                className="min-h-[240px] font-mono text-xs"
                            />
                            {jsonError && (
                                <div className="text-xs text-destructive">{jsonError}</div>
                            )}
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={applyJson}>
                                    套用 JSON
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-2 mt-2">
                        <label className="text-sm font-medium">標籤 (Tags)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {currentTags.map(tag => (
                                <Badge key={tag.id} variant="secondary" className="pl-2 pr-1 h-7 flex items-center gap-1">
                                    {tag.name}
                                    <X 
                                        className="w-3 h-3 cursor-pointer hover:text-destructive" 
                                        onClick={() => handleRemoveTag(tag.id)}
                                    />
                                </Badge>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input 
                                value={newTagInput} 
                                onChange={e => setNewTagInput(e.target.value)} 
                                placeholder="輸入標籤名稱..." 
                                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                            />
                            <Button size="icon" variant="outline" onClick={handleAddTag} disabled={!newTagInput}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        確認儲存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
