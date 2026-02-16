import React, { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { AlertTriangle, X, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "../ui/select";
import { Textarea } from "../ui/textarea"; 
import { updateScript, addTagToScript, removeTagFromScript, getTags, createTag, getScript, getPersonas, getOrganizations, getUserProfile, getOrganization, getPublicScript } from "../../lib/db";
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
import { useToast } from "../ui/toast";

export function buildPublishChecklist({ title, identity, license, licenseTerms, coverUrl, synopsis, tags }) {
    const required = [
        { key: "title", label: "作品標題", ok: Boolean(title?.trim()) },
        { key: "identity", label: "作者身份", ok: Boolean(identity?.startsWith("persona:")) },
        { key: "license", label: "授權資訊", ok: Boolean(license?.trim()) || (licenseTerms || []).length > 0 },
    ];
    const recommended = [
        { key: "cover", label: "封面圖片", ok: Boolean(coverUrl?.trim()) },
        { key: "synopsis", label: "作品摘要", ok: Boolean(synopsis?.trim()) },
        { key: "tags", label: "作品標籤", ok: Array.isArray(tags) && tags.length > 0 },
    ];
    return {
        required,
        recommended,
        missingRequired: required.filter((item) => !item.ok),
        missingRecommended: recommended.filter((item) => !item.ok),
    };
}





export function ScriptMetadataDialog({ script, scriptId, open, onOpenChange, onSave }) {
    const { toast } = useToast();
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
    const [activeTab, setActiveTab] = useState("basic");
    const [showValidationHints, setShowValidationHints] = useState(false);
    const customIdRef = useRef(0);
    const initializedRef = useRef(false);
    const userEditedRef = useRef(false);
    const contactAutoFilledRef = useRef(false);
    const publicLoadedRef = useRef(null);
    const [localScript, setLocalScript] = useState(null);
    const activeScript = scriptId ? localScript : (localScript || script);
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );
    const [dragDisabled, setDragDisabled] = useState(false);

    const applyPublicInfo = (publicScript) => {
        if (!publicScript) return;
        setStatus(publicScript.status || (publicScript.isPublic ? "Public" : status));
        if (publicScript.personaId) {
            setIdentity(`persona:${publicScript.personaId}`);
            setSelectedOrgId(publicScript.organizationId || "");
        } else if (publicScript.organizationId) {
            setSelectedOrgId(publicScript.organizationId || "");
        }
        if (publicScript.coverUrl) {
            setCoverUrl(publicScript.coverUrl);
        }
        if (publicScript.markerThemeId) {
            setMarkerThemeId(publicScript.markerThemeId);
        }
        if (publicScript.disableCopy !== undefined && publicScript.disableCopy !== null) {
            setDisableCopy(Boolean(publicScript.disableCopy));
        }
        if (publicScript.tags && publicScript.tags.length > 0) {
            setCurrentTags(publicScript.tags);
        }
    };

    const loadPublicInfoIfNeeded = async (baseScript) => {
        if (!baseScript?.id) return;
        if (!(baseScript.isPublic || baseScript.status === "Public")) return;
        if (publicLoadedRef.current === baseScript.id) return;
        try {
            const pub = await getPublicScript(baseScript.id);
            publicLoadedRef.current = baseScript.id;
            applyPublicInfo(pub);
        } catch (e) {
            console.warn("Failed to load public script info", e);
        }
    };

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
            if (parsed.publishAs !== undefined && String(parsed.publishAs).startsWith("persona:")) {
                setIdentity(parsed.publishAs);
            } else if (parsed.personaId) {
                setIdentity(`persona:${parsed.personaId}`);
            }
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
    const { currentUser, profile: currentProfile } = useAuth();
    const [identity, setIdentity] = useState(""); // persona:ID only
    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [personas, setPersonas] = useState([]);
    const [orgs, setOrgs] = useState([]);
    
    // Marker Themes
    const [markerThemes, setMarkerThemes] = useState([]);
    const [markerThemeId, setMarkerThemeId] = useState("default");
    const [showMarkerLegend, setShowMarkerLegend] = useState(false);
    const [disableCopy, setDisableCopy] = useState(false);
    const publishChecklist = useMemo(
        () => buildPublishChecklist({ title, identity, license, licenseTerms, coverUrl, synopsis, tags: currentTags }),
        [title, identity, license, licenseTerms, coverUrl, synopsis, currentTags]
    );
    const requiredErrorMap = useMemo(
        () => ({
            title: showValidationHints && publishChecklist.missingRequired.some((item) => item.key === "title"),
            identity: showValidationHints && publishChecklist.missingRequired.some((item) => item.key === "identity"),
            license: showValidationHints && publishChecklist.missingRequired.some((item) => item.key === "license"),
        }),
        [showValidationHints, publishChecklist.missingRequired]
    );
    const recommendedErrorMap = useMemo(
        () => ({
            cover: showValidationHints && publishChecklist.missingRecommended.some((item) => item.key === "cover"),
            synopsis: showValidationHints && publishChecklist.missingRecommended.some((item) => item.key === "synopsis"),
            tags: showValidationHints && publishChecklist.missingRecommended.some((item) => item.key === "tags"),
        }),
        [showValidationHints, publishChecklist.missingRecommended]
    );

    const getKeyTarget = (key) => {
        if (key === "title") return { tab: "basic", fieldId: "metadata-title" };
        if (key === "identity") return { tab: "basic", fieldId: "metadata-identity-trigger" };
        if (key === "license") return { tab: "license", fieldId: "license-name" };
        if (key === "cover") return { tab: "details", fieldId: "metadata-cover-url" };
        if (key === "synopsis") return { tab: "basic", fieldId: "metadata-synopsis" };
        if (key === "tags") return { tab: "details", fieldId: "metadata-new-tag" };
        return { tab: "basic", fieldId: null };
    };

    const jumpToChecklistItem = (key) => {
        const target = getKeyTarget(key);
        setActiveTab(target.tab);
        window.setTimeout(() => {
            if (!target.fieldId) return;
            const el = document.getElementById(target.fieldId);
            if (el && typeof el.focus === "function") {
                el.focus();
                if (typeof el.scrollIntoView === "function") {
                    el.scrollIntoView({ block: "center", behavior: "smooth" });
                }
            }
        }, 80);
    };

    useEffect(() => {
        if (open && currentUser) {
            Promise.all([
                getPersonas(),
                getOrganizations(),
                fetchUserThemes(currentUser),
            ]).then(async ([pData, oData, tData]) => {
                setPersonas(pData || []);
                let mergedOrgs = oData || [];
                let profile = currentProfile;
                if (!profile) {
                    try {
                        profile = await getUserProfile();
                    } catch {
                        profile = null;
                    }
                }
                const memberOrgId = profile?.organizationId;
                const extraOrgIds = new Set();
                if (memberOrgId && !(oData || []).some(o => o.id === memberOrgId)) {
                    extraOrgIds.add(memberOrgId);
                }
                (pData || []).forEach(p => {
                    (p.organizationIds || []).forEach(oid => {
                        if (!(oData || []).some(o => o.id === oid)) {
                            extraOrgIds.add(oid);
                        }
                    });
                });
                if (extraOrgIds.size > 0) {
                    const fetched = [];
                    for (const oid of extraOrgIds) {
                        try {
                            const org = await getOrganization(oid);
                            if (org) fetched.push(org);
                        } catch {}
                    }
                    mergedOrgs = [...mergedOrgs, ...fetched].filter(Boolean);
                }
                const deduped = [];
                const seen = new Set();
                for (const o of mergedOrgs) {
                    if (!o || !o.id || seen.has(o.id)) continue;
                    seen.add(o.id);
                    deduped.push(o);
                }
                setOrgs(deduped);
                
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
            contactAutoFilledRef.current = false;
            publicLoadedRef.current = null;
            setLocalScript(null);
            setActiveTab("basic");
            setShowValidationHints(false);
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
            if (script.personaId) {
                setIdentity(`persona:${script.personaId}`);
                setSelectedOrgId(script.organizationId || "");
            } else {
                const preferredPersonaId = localStorage.getItem("preferredPersonaId");
                setIdentity(preferredPersonaId ? `persona:${preferredPersonaId}` : "");
                setSelectedOrgId("");
            }
            
            // Extract from content for extended fields
            // Function to safely load content if missing
            const loadContent = async () => {
                let content = script.content;
                if (script.id) {
                    try {
                        const full = await getScript(script.id);
                        if (full) {
                            if (full.content) content = full.content;
                            setTitle(full.title || "");
                            setCoverUrl(full.coverUrl || "");
                            setStatus(full.status || (full.isPublic ? "Public" : "Private"));
                            setMarkerThemeId(full.markerThemeId || "default");
                            setDisableCopy(full.disableCopy || false);
                            await loadPublicInfoIfNeeded(full);
                        }
                    } catch(e) { console.error(e); }
                }
                await loadPublicInfoIfNeeded(script);
                
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

        if (localScript.personaId) {
            setIdentity(`persona:${localScript.personaId}`);
            setSelectedOrgId(localScript.organizationId || "");
        } else {
            const preferredPersonaId = localStorage.getItem("preferredPersonaId");
            setIdentity(preferredPersonaId ? `persona:${preferredPersonaId}` : "");
            setSelectedOrgId("");
        }

        const loadContent = async () => {
            let content = localScript.content;
            if (localScript.id) {
                try {
                    const full = await getScript(localScript.id);
                    if (full) {
                        if (full.content) content = full.content;
                        setTitle(full.title || "");
                        setCoverUrl(full.coverUrl || "");
                        setStatus(full.status || (full.isPublic ? "Public" : "Private"));
                        setMarkerThemeId(full.markerThemeId || "default");
                        setDisableCopy(full.disableCopy || false);
                        await loadPublicInfoIfNeeded(full);
                    }
                } catch (e) {
                    console.error(e);
                }
            }
            await loadPublicInfoIfNeeded(localScript);
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

    // Auto-fill contact info from persona (only when empty)
    useEffect(() => {
        if (!open) return;
        if (contactAutoFilledRef.current) return;
        if (!identity || !identity.startsWith("persona:")) return;
        if (contact || (contactFields && contactFields.length > 0)) return;
        const personaId = identity.split(":")[1];
        const persona = personas.find(p => p.id === personaId);
        if (!persona) return;

        const next = [];
        if (persona.website) {
            next.push({ id: `ct-${Date.now()}-web`, key: "Website", value: persona.website });
        }
        (persona.links || []).forEach((link, idx) => {
            if (!link?.url) return;
            next.push({
                id: `ct-${Date.now()}-${idx}`,
                key: link.label || "Link",
                value: link.url
            });
        });
        if (next.length > 0) {
            setContactFields(next);
            contactAutoFilledRef.current = true;
        }
    }, [open, identity, personas, contact, contactFields]);
    
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
        if (identity.startsWith("persona:")) {
            // Wait for personas to load before resetting
            if (personas.length === 0) return; 

            const personaId = identity.split(":")[1];
            const persona = personas.find(p => p.id === personaId);
            if (!persona) {
                setIdentity("");
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


    const handleAddTag = async (inputOverride) => {
        const candidate = (inputOverride ?? newTagInput).trim();
        if (!candidate) return;
        const tagName = candidate;
        
        if (currentTags.find(t => t.name.toLowerCase() === tagName.toLowerCase())) {
            setNewTagInput("");
            return;
        }

        let tagToAdd = availableTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

        try {
            if (!tagToAdd) {
                const newTag = await createTag(tagName, "bg-gray-500");
                tagToAdd = newTag; 
                setAvailableTags((prev) => {
                    if (prev.some((t) => t.id === newTag.id || t.name.toLowerCase() === newTag.name.toLowerCase())) return prev;
                    return [...prev, newTag];
                });
            }
            setCurrentTags((prev) => {
                if (prev.some((t) => t.id === tagToAdd.id || t.name.toLowerCase() === tagToAdd.name.toLowerCase())) return prev;
                return [...prev, tagToAdd];
            });
            setNewTagInput("");
        } catch (e) {
            console.error("Error adding tag", e);
        }
    };

    const handleAddTagsBatch = async (inputs = []) => {
        const names = Array.from(
            new Set(
                (inputs || [])
                    .map((item) => String(item || "").trim())
                    .filter(Boolean)
                    .map((name) => name.toLowerCase())
            )
        );
        if (names.length === 0) return;

        const nameMap = new Map();
        names.forEach((lowerName) => {
            const original = (inputs || []).find((item) => String(item || "").trim().toLowerCase() === lowerName);
            nameMap.set(lowerName, String(original || "").trim());
        });

        const resolved = [];
        for (const lowerName of names) {
            const displayName = nameMap.get(lowerName);
            if (!displayName) continue;
            let existing = availableTags.find((t) => t.name.toLowerCase() === lowerName);
            if (!existing) {
                try {
                    existing = await createTag(displayName, "bg-gray-500");
                    setAvailableTags((prev) => {
                        if (prev.some((t) => t.id === existing.id || t.name.toLowerCase() === lowerName)) return prev;
                        return [...prev, existing];
                    });
                } catch (error) {
                    console.error("Batch add tag failed", error);
                    continue;
                }
            }
            resolved.push(existing);
        }

        if (resolved.length > 0) {
            setCurrentTags((prev) => {
                const next = [...prev];
                for (const tag of resolved) {
                    const exists = next.some((item) => item.id === tag.id || item.name.toLowerCase() === tag.name.toLowerCase());
                    if (!exists) next.push(tag);
                }
                return next;
            });
            setNewTagInput("");
            toast({
                title: "已加入標籤",
                description: `共加入 ${resolved.length} 個標籤`,
            });
        }
    };

    const handleRemoveTag = (tagId) => {
        setCurrentTags(currentTags.filter(t => t.id !== tagId));
    };

    const handleSave = async () => {
        setShowValidationHints(true);
        if (!identity || !identity.startsWith("persona:")) {
            toast({ title: "請先選擇作者身份", variant: "destructive" });
            setActiveTab("basic");
            return;
        }
        if (status === "Public" && publishChecklist.missingRequired.length > 0) {
            const firstMissing = publishChecklist.missingRequired[0];
            if (firstMissing?.key) {
                jumpToChecklistItem(firstMissing.key);
            }
            toast({
                title: "無法公開作品",
                description: `請先完成：${publishChecklist.missingRequired.map((item) => item.label).join("、")}`,
                variant: "destructive",
            });
            return;
        }

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

            updatePayload.personaId = identity.split(":")[1];
            updatePayload.organizationId = selectedOrgId || null;

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
            toast({ title: "劇本資訊已儲存" });
            setShowValidationHints(false);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save script metadata", error);
            toast({ title: "儲存失敗", description: "請稍後再試。", variant: "destructive" });
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

                <div className={`rounded-md border p-3 ${status === "Public" && publishChecklist.missingRequired.length > 0 ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/20"}`}>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className={`h-4 w-4 ${status === "Public" && publishChecklist.missingRequired.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                        發佈檢查清單
                    </div>
                    <div className="mb-2 text-xs font-medium text-foreground/90">必填</div>
                    <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                        {publishChecklist.required.map((item) => (
                            <div key={item.key} className={item.ok ? "text-muted-foreground" : "text-destructive"}>
                                {item.ok ? "✓" : "•"} {item.label}
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 mb-2 text-xs font-medium text-muted-foreground">建議填寫（不影響發布）</div>
                    <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                        {publishChecklist.recommended.map((item) => (
                            <div key={item.key} className={item.ok ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300"}>
                                {item.ok ? "✓" : "•"} {item.label}
                            </div>
                        ))}
                    </div>
                    {(publishChecklist.missingRequired.length > 0 || publishChecklist.missingRecommended.length > 0) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {publishChecklist.missingRequired.map((item) => (
                                <Button
                                    key={`req-${item.key}`}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                                    onClick={() => jumpToChecklistItem(item.key)}
                                >
                                    前往補齊：{item.label}
                                </Button>
                            ))}
                            {publishChecklist.missingRecommended.map((item) => (
                                <Button
                                    key={`rec-${item.key}`}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                                    onClick={() => jumpToChecklistItem(item.key)}
                                >
                                    稍後補上：{item.label}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto sm:h-9">
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
                                requiredErrors={requiredErrorMap}
                                recommendedErrors={recommendedErrorMap}
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
            handleAddTagsBatch={handleAddTagsBatch}
            handleRemoveTag={handleRemoveTag}
            contactFields={contactFields} setContactFields={setContactFields}
            onAddContactField={handleAddContactField}
            handleContactFieldUpdate={handleContactFieldUpdate}
            activeSensors={sensors}
            dragDisabled={dragDisabled} setDragDisabled={setDragDisabled}
            customFields={customFields} setCustomFields={setCustomFields}
            addCustomField={addCustomField}
            addDivider={addDivider}
            handleCustomFieldUpdate={handleCustomFieldUpdate}
            recommendedErrors={recommendedErrorMap}
        />
                        </TabsContent>

                        <TabsContent value="license" className="space-y-4 mt-0">
                            <MetadataLicenseTab
                                license={license} setLicense={setLicense}
                                licenseUrl={licenseUrl} setLicenseUrl={setLicenseUrl}
                                licenseTerms={licenseTerms} setLicenseTerms={setLicenseTerms}
                                copyright={copyright} setCopyright={setCopyright}
                                requiredErrors={requiredErrorMap}
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
