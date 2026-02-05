import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { AlertTriangle, X, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "../ui/select";
import { Textarea } from "../ui/textarea"; 
import { updateScript, addTagToScript, removeTagFromScript, getTags, createTag, getScript, getPersonas, getOrganizations } from "../../lib/db";
import { useAuth } from "../../contexts/AuthContext";
import { extractMetadataWithRaw, rewriteMetadata, writeMetadata } from "../../lib/metadataParser";
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { fetchUserThemes } from "../../services/settingsApi";
import { defaultMarkerConfigs } from "../../constants/defaultMarkers";
import { MetadataBasicTab } from "./metadata/MetadataBasicTab";
import { MetadataDetailsTab } from "./metadata/MetadataDetailsTab";
import { MetadataAdvancedTab } from "./metadata/MetadataAdvancedTab";
import { MetadataLicenseTab } from "./metadata/MetadataLicenseTab";






export function ScriptMetadataDialog({ script, scriptId, open, onOpenChange, onSave }) {
    const [title, setTitle] = useState("");
    const [coverUrl, setCoverUrl] = useState("");
    const [status, setStatus] = useState("Private");
    
    // Extended Metadata Strings
    const [author, setAuthor] = useState("");
    const [date, setDate] = useState("");
    const [contact, setContact] = useState("");
    const [contactFields, setContactFields] = useState([]);
    const [license, setLicense] = useState("");
    const [licenseUrl, setLicenseUrl] = useState("");
    const [licenseTerms, setLicenseTerms] = useState([]);
    const [copyright, setCopyright] = useState("");
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
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
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
        setCustomFields((prev) => [...prev, { id: `cf-${customIdRef.current}`, key, value, type: 'text' }]);
    };

    const addDivider = () => {
        customIdRef.current += 1;
        setCustomFields((prev) => [...prev, { id: `cf-${customIdRef.current}`, key: `_sep_${Date.now()}`, value: 'SECTION', type: 'divider' }]);
    };

    const handleAddContactField = (preset) => {
        customIdRef.current += 1;
        setContactFields((prev) => [...prev, { id: `ct-${customIdRef.current}`, key: preset, value: "" }]);
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
            if (parsed.license !== undefined) setLicense(parsed.license);
            if (parsed.licenseUrl !== undefined) setLicenseUrl(parsed.licenseUrl);
            if (parsed.licenseTerms !== undefined) {
                try {
                    setLicenseTerms(JSON.parse(parsed.licenseTerms));
                } catch {
                     setLicenseTerms([]);
                }
            }
            if (parsed.copyright !== undefined) setCopyright(parsed.copyright);
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
    
    // const [showAdvanced, setShowAdvanced] = useState(false); // Deprecated by Tabs

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
    
    // Marker Themes
    const [markerThemes, setMarkerThemes] = useState([]);
    const [markerThemeId, setMarkerThemeId] = useState("default");
    const [showMarkerLegend, setShowMarkerLegend] = useState(false);
    const [disableCopy, setDisableCopy] = useState(false);

    useEffect(() => {
        if (open && currentUser) {
            Promise.all([
                getPersonas(),
                getOrganizations(),
                fetchUserThemes(currentUser)
            ]).then(([pData, oData, tData]) => {
                setPersonas(pData || []);
                setOrgs(oData || []);
                
                const userThemes = tData || [];
                // Ensure default is always there as option if API doesn't return it (it usually doesn't return built-ins)
                const allThemes = [
                    { id: 'default', name: '預設主題 (Default)' },
                    ...userThemes
                ];
                setMarkerThemes(allThemes);
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
            setMarkerThemeId(script.markerThemeId || "default");
            setShowMarkerLegend(false);
            setDisableCopy(script.disableCopy || false);
            
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
                    
                    if (meta.marker_legend !== undefined) setShowMarkerLegend(String(meta.marker_legend) === 'true');
                    else if (meta.show_legend !== undefined) setShowMarkerLegend(String(meta.show_legend) === 'true');
                    
                    if (!script.coverUrl && (meta.cover || meta.coverurl)) {
                        setCoverUrl(meta.cover || meta.coverurl);
                    }
                    
                    setLicense(meta.license || "");
                    setLicenseUrl(meta.licenseUrl || meta.licenseurl || "");
                    setLicenseTerms(ensureList(meta.licenseTerms));

                    setCopyright(meta.copyright || "");

                    const reserved = new Set([
                        "title", "credit", "author", "authors", "source",
                        "draftdate", "date", "contact", "copyright",
                        "notes", "description", "synopsis", "summary",
                        "notes", "description", "synopsis", "summary",
                        "cover", "coverurl", "marker_legend", "show_legend",
                        "license", "licenseurl", "licenseterms", "copyright"
                    ]);
                    if (!userEditedRef.current && (customFields || []).length === 0) {
                        const custom = rawEntries
                            .map(({ key, value }, idx) => {
                                const type = key.startsWith('_sep_') ? 'divider' : 'text';
                                return { id: `${Date.now()}-${idx}`, key, value, type };
                            })
                            .filter((entry) => {
                                // Allow dividers through
                                if (entry.type === 'divider') return true;
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
        setMarkerThemeId(localScript.markerThemeId || "default");
        setShowMarkerLegend(false);
        setDisableCopy(localScript.disableCopy || false);

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
                
                if (meta.marker_legend !== undefined) setShowMarkerLegend(String(meta.marker_legend) === 'true');
                else if (meta.show_legend !== undefined) setShowMarkerLegend(String(meta.show_legend) === 'true');

                if (!localScript.coverUrl && (meta.cover || meta.coverurl)) {
                    setCoverUrl(meta.cover || meta.coverurl);
                }

                setLicense(meta.license || "");
                setLicenseUrl(meta.licenseUrl || meta.licenseurl || "");
                setLicenseTerms(meta.licenseTerms ? ensureList(meta.licenseTerms) : []);

                setCopyright(meta.copyright || "");

                const reserved = new Set([
                    "title", "credit", "author", "authors", "source",
                    "draftdate", "date", "contact", "copyright",
                    "notes", "description", "synopsis", "summary",
                    "cover", "coverurl"
                ]);
                if (!userEditedRef.current && (customFields || []).length === 0) {
                    const custom = rawEntries
                        .map(({ key, value }, idx) => {
                             const type = key.startsWith('_sep_') ? 'divider' : 'text';
                             return { id: `${Date.now()}-${idx}`, key, value, type };
                        })
                        .filter((entry) => {
                             if (entry.type === 'divider') return true;
                            const norm = entry.key.toLowerCase().replace(/\s/g, "");
                            return !reserved.has(norm);
                        });
                    setCustomFields(custom);
                }
            }
        };
        loadContent();
    }, [open, scriptId, localScript]);

    // Auto-fill license defaults when identity changes
    useEffect(() => {
        if (!license && (!licenseTerms || licenseTerms.length === 0) && identity.startsWith("persona:")) {
            const personaId = identity.split(":")[1];
            const persona = personas.find(p => p.id === personaId);
            if (persona && (persona.defaultLicense || (persona.defaultLicenseTerms && persona.defaultLicenseTerms.length > 0))) {
                if (persona.defaultLicense) setLicense(persona.defaultLicense);
                if (persona.defaultLicenseUrl) setLicenseUrl(persona.defaultLicenseUrl);
                if (persona.defaultLicenseTerms) setLicenseTerms(ensureList(persona.defaultLicenseTerms));
            }

        }
    }, [identity, personas]); // Only run when identity or personas list changes
    
    // Initial Load Logic
    useEffect(() => {
        if (!script) return;
        const load = async () => {};
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
            license,
            licenseUrl,
            licenseTerms,
            copyright,
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
        license,
        licenseUrl,
        licenseTerms,
        copyright,
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


    // Helper for robust parsing with flattening
    const ensureList = (val) => {
        if (!val) return [];
        let parsed = val;
        
        // 1. Input string? Parse it.
        if (typeof parsed === 'string') {
            try {
                parsed = JSON.parse(parsed);
            } catch {
                // If simple string that fails JSON.parse (e.g. "Some Term"), wrap it
                return [parsed];
            }
        }
        
        // 2. Still string? (Double encoded)
        if (typeof parsed === 'string') {
             try { parsed = JSON.parse(parsed); } catch { return [parsed]; }
        }

        // 3. Now we should have an array
        if (Array.isArray(parsed)) {
            // Check elements. If an element is a string that looks like an array, parse it and flatten.
            // This handles the case ['["a","b"]'] -> ['a', 'b']
            return parsed.flatMap(item => {
                if (typeof item === 'string' && item.trim().startsWith('[') && item.trim().endsWith(']')) {
                    try {
                        const inner = JSON.parse(item);
                        if (Array.isArray(inner)) return inner;
                    } catch {}
                }
                return item;
            });
        }
        
        return [];
    };

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
            // Wait for personas to load before resetting
            if (personas.length === 0) return; 

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

            // 2. Batch Update to DB
            // We use writeMetadata to ensure ORDER is preserved for dividers
            const orderedEntries = [];
            
            // Standard Fields Order
            if (title) orderedEntries.push({ key: "Title", value: title });
            // Credit skipped if empty
            if (author) orderedEntries.push({ key: "Author", value: author });
            if (source) orderedEntries.push({ key: "Source", value: source });
            if (license) orderedEntries.push({ key: "License", value: license });
            if (licenseUrl) orderedEntries.push({ key: "LicenseUrl", value: licenseUrl });
            if (licenseTerms && licenseTerms.length > 0) orderedEntries.push({ key: "LicenseTerms", value: JSON.stringify(licenseTerms) });
            if (copyright) orderedEntries.push({ key: "Copyright", value: copyright });
            if (date) orderedEntries.push({ key: "Draft date", value: date });
            if (contact || (contactFields && contactFields.length > 0)) {
                 const contactVal = contactFields && contactFields.length > 0 
                    ? JSON.stringify(Object.fromEntries(contactFields.filter(f => f.key).map(f => [f.key, f.value]))) 
                    : contact;
                 orderedEntries.push({ key: "Contact", value: contactVal });
            }
            if (coverUrl) orderedEntries.push({ key: "Cover", value: coverUrl });
            if (synopsis) orderedEntries.push({ key: "Synopsis", value: synopsis });

            // Custom Fields (In Order)
            (customFields || []).forEach(({ key, value, type }) => {
                if (type === 'divider') {
                    // Use user's value as section title
                     orderedEntries.push({ key, value: value || 'SECTION' });
                } else if (key && value) {
                    orderedEntries.push({ key, value });
                }
            });

            if (showMarkerLegend) {
                orderedEntries.push({ key: "marker_legend", value: "true" });
            }

            const finalContent = writeMetadata(content, orderedEntries);

            let updatePayload = {
                title,
                coverUrl,
                status,
                content: finalContent,
                author,
                draftDate: date,
                isPublic: status === "Public",
                personaId: null,
                organizationId: null,
                markerThemeId: markerThemeId,
                showMarkerLegend: showMarkerLegend,
                disableCopy: disableCopy
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
                tags: currentTags,
                markerThemeId
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
                
                <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="basic">基本資訊</TabsTrigger>
                        <TabsTrigger value="details">詳細設定</TabsTrigger>
                        <TabsTrigger value="license">授權</TabsTrigger>
                        <TabsTrigger value="advanced">進階</TabsTrigger>
                    </TabsList>
                    
                    <div className="flex-1 overflow-y-auto py-4 px-1">
                        <TabsContent value="basic" className="space-y-4 mt-0 h-full">
                            <MetadataBasicTab 
                                title={title} setTitle={setTitle}
                                identity={identity} setIdentity={setIdentity}
                                currentUser={currentUser}
                                personas={personas}
                                orgs={orgs}
                                selectedOrgId={selectedOrgId} setSelectedOrgId={setSelectedOrgId}
                                status={status} setStatus={setStatus}
                                date={date} setDate={setDate}
                                source={source} setSource={setSource}
                                synopsis={synopsis} setSynopsis={setSynopsis}
                            />
                        </TabsContent>

                        <TabsContent value="details" className="space-y-6 mt-0">
                            <MetadataDetailsTab 
                                status={status}
                                coverUrl={coverUrl} setCoverUrl={setCoverUrl}
                                currentTags={currentTags}
                                author={author} setAuthor={setAuthor}
                                availableTags={availableTags}
                                newTagInput={newTagInput} setNewTagInput={setNewTagInput}
                                handleAddTag={handleAddTag}
                                handleRemoveTag={handleRemoveTag}
                                contactFields={contactFields} setContactFields={setContactFields}
                                onAddContactField={handleAddContactField}
                                handleContactFieldUpdate={handleContactFieldUpdate}
                                activeSensors={activeSensors}
                                dragDisabled={dragDisabled} setDragDisabled={setDragDisabled}
                                customFields={customFields} setCustomFields={setCustomFields}
                                addCustomField={addCustomField}
                                addDivider={addDivider}
                                handleCustomFieldUpdate={handleCustomFieldUpdate}
                            />
                        </TabsContent>

                        <TabsContent value="license" className="space-y-4 mt-0">
                            <MetadataLicenseTab
                                license={license} setLicense={setLicense}
                                licenseUrl={licenseUrl} setLicenseUrl={setLicenseUrl}
                                licenseTerms={licenseTerms} setLicenseTerms={setLicenseTerms}
                                copyright={copyright} setCopyright={setCopyright}
                            />
                        </TabsContent>

                        <TabsContent value="advanced" className="space-y-4 mt-0">
                            <MetadataAdvancedTab
                                markerThemeId={markerThemeId} setMarkerThemeId={setMarkerThemeId}
                                markerThemes={markerThemes}
                                showMarkerLegend={showMarkerLegend} setShowMarkerLegend={setShowMarkerLegend}
                                disableCopy={disableCopy} setDisableCopy={setDisableCopy}
                                jsonMode={jsonMode} setJsonMode={setJsonMode}
                                jsonText={jsonText} setJsonText={setJsonText}
                                jsonError={jsonError}
                                applyJson={applyJson}
                            />
                        </TabsContent>
                    </div>
                </Tabs>

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
