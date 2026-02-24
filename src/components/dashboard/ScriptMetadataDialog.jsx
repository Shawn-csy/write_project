import React, { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { AlertTriangle, X, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "../ui/select";
import { Textarea } from "../ui/textarea"; 
import { updateScript, addTagToScript, removeTagFromScript, getTags, createTag, getScript, getPersonas, getOrganizations, getUserProfile, getOrganization, getPublicScript, createSeries } from "../../lib/db";
import { useAuth } from "../../contexts/AuthContext";
import { extractMetadataWithRaw, rewriteMetadata, writeMetadata } from "../../lib/metadataParser";
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { fetchUserThemes } from "../../services/settingsApi";
import { defaultMarkerConfigs } from "../../constants/defaultMarkers";
import { deriveCcLicenseTags } from "../../lib/licenseRights";
import { MetadataBasicTab } from "./metadata/MetadataBasicTab";
import { MetadataDetailsTab } from "./metadata/MetadataDetailsTab";
import { MetadataAdvancedTab } from "./metadata/MetadataAdvancedTab";
import { MetadataLicenseTab } from "./metadata/MetadataLicenseTab";
import { useToast } from "../ui/toast";
import { useI18n } from "../../contexts/I18nContext";

export function buildPublishChecklist({ title, identity, license, licenseTerms, coverUrl, synopsis, tags, targetAudience, contentRating, t }) {
    const required = [
        { key: "title", label: t ? t("scriptMetadataDialog.checkTitle") : "Title", ok: Boolean(title?.trim()) },
        { key: "identity", label: t ? t("scriptMetadataDialog.checkIdentity") : "Author identity", ok: Boolean(identity?.startsWith("persona:")) },
        { key: "audience", label: t ? t("scriptMetadataDialog.checkAudience", "觀眾取向 Target Audience") : "Target Audience", ok: Boolean(targetAudience?.trim()) },
        { key: "rating", label: t ? t("scriptMetadataDialog.checkRating", "內容分級 Content Rating") : "Content Rating", ok: Boolean(contentRating?.trim()) },
        { key: "license", label: t ? t("scriptMetadataDialog.checkLicense") : "License", ok: Boolean(license?.trim()) || (licenseTerms || []).length > 0 },
    ];
    const recommended = [
        { key: "cover", label: t ? t("scriptMetadataDialog.checkCover") : "Cover", ok: Boolean(coverUrl?.trim()) },
        { key: "synopsis", label: t ? t("scriptMetadataDialog.checkSynopsis") : "Synopsis", ok: Boolean(synopsis?.trim()) },
        { key: "tags", label: t ? t("scriptMetadataDialog.checkTags") : "Tags", ok: Array.isArray(tags) && tags.length > 0 },
    ];
    return {
        required,
        recommended,
        missingRequired: required.filter((item) => !item.ok),
        missingRecommended: recommended.filter((item) => !item.ok),
    };
}





export function ScriptMetadataDialog({ script, scriptId, open, onOpenChange, onSave, seriesOptions = [], onSeriesCreated }) {
    const { t } = useI18n();
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
    const [seriesName, setSeriesName] = useState("");
    const [seriesId, setSeriesId] = useState("");
    const [seriesOrder, setSeriesOrder] = useState("");
    const [quickSeriesName, setQuickSeriesName] = useState("");
    const [isCreatingSeries, setIsCreatingSeries] = useState(false);
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
            if (parsed.series !== undefined) setSeriesName(String(parsed.series || ""));
            if (parsed.seriesName !== undefined && parsed.series === undefined) setSeriesName(String(parsed.seriesName || ""));
            if (parsed.seriesId !== undefined) setSeriesId(String(parsed.seriesId || ""));
            if (parsed.seriesOrder !== undefined) setSeriesOrder(String(parsed.seriesOrder ?? ""));
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
            setJsonError(t("scriptMetadataDialog.jsonError"));
        }
    };
    
    // const [showAdvanced, setShowAdvanced] = useState(false); // Deprecated by Tabs

    const [currentTags, setCurrentTags] = useState([]); 
    const [availableTags, setAvailableTags] = useState([]);
    const [newTagInput, setNewTagInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    
    // Explicit Content Ratings
    const [targetAudience, setTargetAudience] = useState("");
    const [contentRating, setContentRating] = useState("");

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
        () => buildPublishChecklist({ title, identity, license, licenseTerms, coverUrl, synopsis, tags: currentTags, targetAudience, contentRating, t }),
        [title, identity, license, licenseTerms, coverUrl, synopsis, currentTags, targetAudience, contentRating, t]
    );
    const requiredErrorMap = useMemo(
        () => ({
            title: showValidationHints && publishChecklist.missingRequired.some((item) => item.key === "title"),
            identity: showValidationHints && publishChecklist.missingRequired.some((item) => item.key === "identity"),
            audience: showValidationHints && publishChecklist.missingRequired.some((item) => item.key === "audience"),
            rating: showValidationHints && publishChecklist.missingRequired.some((item) => item.key === "rating"),
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
        if (key === "audience" || key === "rating") return { tab: "details", fieldId: null };
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
                    { id: 'default', name: t("scriptMetadataDialog.defaultTheme") },
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
            
            // Initialize Audience and Rating state based on current tags
            if (script.tags) {
                const tagNames = script.tags.map(t => String(t.name || "").toLowerCase());
                if (tagNames.includes("男性向")) setTargetAudience("男性向");
                else if (tagNames.includes("女性向")) setTargetAudience("女性向");
                else if (tagNames.includes("一般向")) setTargetAudience("一般向");

                if (tagNames.includes("r-18") || tagNames.includes("r18") || tagNames.includes("18+") || tagNames.includes("成人向")) setContentRating("成人向");
                else if (tagNames.includes("一般") || tagNames.includes("一般內容") || tagNames.includes("全年齡向")) setContentRating("全年齡向");
            }

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
                    setSeriesName(String(meta.series || meta.seriesname || script?.series?.name || ""));
                    setSeriesId(script?.seriesId || "");
                    setSeriesOrder(String(meta.seriesorder ?? script?.seriesOrder ?? ""));
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
                        "license", "licenseurl", "licenseterms", "copyright",
                        "series", "seriesname", "seriesorder"
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
                setSeriesName(String(meta.series || meta.seriesname || localScript?.series?.name || ""));
                setSeriesId(localScript?.seriesId || "");
                setSeriesOrder(String(meta.seriesorder ?? localScript?.seriesOrder ?? ""));
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
                    "cover", "coverurl", "series", "seriesname", "seriesorder"
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
            series: seriesName,
            seriesId,
            seriesOrder,
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
        seriesName,
        seriesId,
        seriesOrder,
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

    useEffect(() => {
        if (!seriesId) return;
        const selected = (seriesOptions || []).find((item) => item.id === seriesId);
        if (selected?.name) {
            setSeriesName(selected.name);
        }
    }, [seriesId, seriesOptions]);

    const handleQuickCreateSeries = async () => {
        const name = quickSeriesName.trim();
        if (!name || isCreatingSeries) return;
        const existing = (seriesOptions || []).find(
            (item) => String(item?.name || "").trim().toLowerCase() === name.toLowerCase()
        );
        if (existing) {
            setSeriesId(existing.id);
            setSeriesName(existing.name || name);
            setQuickSeriesName("");
            toast({ title: "已選取既有系列" });
            return;
        }
        setIsCreatingSeries(true);
        try {
            const created = await createSeries({ name, summary: "", coverUrl: "" });
            setSeriesId(created.id);
            setSeriesName(created.name || name);
            setQuickSeriesName("");
            if (onSeriesCreated) onSeriesCreated(created);
            toast({ title: "已建立系列" });
        } catch (error) {
            console.error("Failed to create series from metadata dialog", error);
            toast({ title: "建立系列失敗", variant: "destructive" });
        } finally {
            setIsCreatingSeries(false);
        }
    };

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
        
        const isFromInput = !inputOverride || inputOverride === newTagInput || inputOverride === newTagInput.trim();

        if (currentTags.find(t => t.name.toLowerCase() === tagName.toLowerCase())) {
            if (isFromInput) setNewTagInput("");
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
            if (isFromInput) setNewTagInput("");
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
                title: t("scriptMetadataDialog.tagsAdded"),
                description: t("scriptMetadataDialog.tagsAddedCount").replace("{count}", String(resolved.length)),
            });
        }
    };

    const handleRemoveTag = (tagId) => {
        setCurrentTags(currentTags.filter(t => t.id !== tagId));
    };

    const handleClearTags = () => {
        setCurrentTags([]);
    };

    const handleSave = async () => {
        setShowValidationHints(true);
        if (!identity || !identity.startsWith("persona:")) {
            toast({ title: t("scriptMetadataDialog.selectIdentityFirst"), variant: "destructive" });
            setActiveTab("basic");
            return;
        }
        if (status === "Public" && publishChecklist.missingRequired.length > 0) {
            const firstMissing = publishChecklist.missingRequired[0];
            if (firstMissing?.key) {
                jumpToChecklistItem(firstMissing.key);
            }
            toast({
                title: t("scriptMetadataDialog.cannotPublish"),
                description: t("scriptMetadataDialog.cannotPublishDesc").replace("{items}", publishChecklist.missingRequired.map((item) => item.label).join("、")),
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);
        try {
            // Synchronize Audience and Rating settings into tags
            let tagsToSave = [...currentTags];
            const ensureTag = async (name) => {
                if (!tagsToSave.some(t => String(t.name).toLowerCase() === name.toLowerCase())) {
                    let existing = availableTags.find(t => String(t.name).toLowerCase() === name.toLowerCase());
                    if (!existing) existing = await createTag(name, name === "成人向" ? "bg-red-500" : "bg-gray-500");
                    tagsToSave.push(existing);
                }
            };
            const removeTags = (names) => {
                const dropSet = new Set(names.map(n => n.toLowerCase()));
                tagsToSave = tagsToSave.filter(t => !dropSet.has(String(t.name).toLowerCase()));
            };

            // Process Audience
            if (targetAudience) {
                removeTags(["男性向", "女性向", "一般向"].filter(a => a !== targetAudience));
                await ensureTag(targetAudience);
            }
            // Process Rating
            if (contentRating) {
                removeTags(["一般", "R-18", "r18", "一般內容", "全年齡向", "成人向"].filter(r => r !== contentRating));
                await ensureTag(contentRating);
            }
            
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
            const ccAutoTags = deriveCcLicenseTags(license);
            if (ccAutoTags.length > 0) orderedEntries.push({ key: "LicenseTags", value: JSON.stringify(ccAutoTags) });
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
            const selectedSeries = seriesOptions.find((item) => item.id === seriesId);
            const selectedSeriesName = selectedSeries?.name || seriesName;
            if (selectedSeriesName?.trim()) orderedEntries.push({ key: "Series", value: selectedSeriesName.trim() });
            const parsedSeriesOrder = Number(seriesOrder);
            if (Number.isFinite(parsedSeriesOrder) && parsedSeriesOrder >= 0) {
                orderedEntries.push({ key: "SeriesOrder", value: String(Math.floor(parsedSeriesOrder)) });
            }

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
            updatePayload.seriesId = seriesId || null;
            updatePayload.seriesOrder = Number.isFinite(Number(seriesOrder)) && Number(seriesOrder) >= 0 ? Math.floor(Number(seriesOrder)) : null;

            await updateScript(workingScript.id, updatePayload);

            // 3. Handle Tags Diff
            const originalTagIds = new Set(((workingScript && workingScript.tags) || []).map(t => t.id));
            const finalTagIds = new Set(tagsToSave.map(t => t.id));
            const addedTags = tagsToSave.filter(t => !originalTagIds.has(t.id));
            const removedTags = ((workingScript && workingScript.tags) || []).filter(t => !finalTagIds.has(t.id));

            await Promise.all([
                ...addedTags.map(t => addTagToScript(workingScript.id, t.id)),
                ...removedTags.map(t => removeTagFromScript(workingScript.id, t.id))
            ]);

            onSave({ 
                ...(workingScript || script), 
                title, coverUrl, status, 
                content: finalContent, 
                author, draftDate: date,
                tags: tagsToSave,
                markerThemeId,
                seriesId: updatePayload.seriesId,
                seriesOrder: updatePayload.seriesOrder
            }); 
            setCurrentTags(tagsToSave); 
            toast({ title: t("scriptMetadataDialog.saved") });
            setShowValidationHints(false);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save script metadata", error);
            toast({ title: t("scriptMetadataDialog.saveFailed"), description: t("scriptMetadataDialog.tryLater"), variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetTargetAudience = async (newAudience) => {
        setTargetAudience(newAudience);
        const audienceGroup = ["男性向", "女性向", "一般向"];
        
        let tagsCopy = currentTags.filter(t => !audienceGroup.includes(String(t.name).toLowerCase()) || String(t.name).toLowerCase() === newAudience.toLowerCase());
        
        if (!tagsCopy.some(t => String(t.name).toLowerCase() === newAudience.toLowerCase())) {
            let existing = availableTags.find(t => String(t.name).toLowerCase() === newAudience.toLowerCase());
            if (!existing) {
                try {
                    existing = await createTag(newAudience, "bg-gray-500");
                    setAvailableTags(prev => [...prev, existing]);
                } catch(e) { console.error(e); }
            }
            if (existing) tagsCopy.push(existing);
        }
        setCurrentTags([...tagsCopy]);
    };

    const handleSetContentRating = async (newRating) => {
        setContentRating(newRating);
        const ratingGroup = ["一般", "r-18", "r18", "一般內容", "全年齡向", "成人向"];
        
        let tagsCopy = currentTags.filter(t => !ratingGroup.includes(String(t.name).toLowerCase()) || String(t.name).toLowerCase() === newRating.toLowerCase());
        
        if (!tagsCopy.some(t => String(t.name).toLowerCase() === newRating.toLowerCase())) {
            let existing = availableTags.find(t => String(t.name).toLowerCase() === newRating.toLowerCase());
            if (!existing) {
                try {
                    existing = await createTag(newRating, newRating === "成人向" ? "bg-red-500" : "bg-gray-500");
                    setAvailableTags(prev => [...prev, existing]);
                } catch(e) { console.error(e); }
            }
            if (existing) tagsCopy.push(existing);
        }
        setCurrentTags([...tagsCopy]);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-[760px] lg:max-w-[980px] xl:max-w-[1120px] max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("scriptMetadataDialog.title")}</DialogTitle>
                    <DialogDescription>
                        {t("scriptMetadataDialog.description")}
                    </DialogDescription>
                </DialogHeader>

                <div className={`rounded-md border p-3 ${status === "Public" && publishChecklist.missingRequired.length > 0 ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/20"}`}>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className={`h-4 w-4 ${status === "Public" && publishChecklist.missingRequired.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                        {t("scriptMetadataDialog.publishChecklist")}
                    </div>
                    <div className="mb-2 text-xs font-medium text-foreground/90">{t("scriptMetadataDialog.required")}</div>
                    <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                        {publishChecklist.required.map((item) => (
                            <div key={item.key} className={item.ok ? "text-muted-foreground" : "text-destructive"}>
                                {item.ok ? "✓" : "•"} {item.label}
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 mb-2 text-xs font-medium text-muted-foreground">{t("scriptMetadataDialog.recommended")}</div>
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
                                    {t("scriptMetadataDialog.goFix").replace("{label}", item.label)}
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
                                    {t("scriptMetadataDialog.fixLater").replace("{label}", item.label)}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto sm:h-9">
                        <TabsTrigger value="basic">{t("scriptMetadataDialog.tabBasic")}</TabsTrigger>
                        <TabsTrigger value="details">{t("scriptMetadataDialog.tabDetails")}</TabsTrigger>
                        <TabsTrigger value="license">{t("scriptMetadataDialog.tabLicense")}</TabsTrigger>
                        <TabsTrigger value="advanced">{t("scriptMetadataDialog.tabAdvanced")}</TabsTrigger>
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
            targetAudience={targetAudience}
            setTargetAudience={handleSetTargetAudience}
            contentRating={contentRating}
            setContentRating={handleSetContentRating}
            seriesName={seriesName}
            setSeriesName={setSeriesName}
            seriesId={seriesId}
            setSeriesId={setSeriesId}
            seriesOptions={seriesOptions}
            quickSeriesName={quickSeriesName}
            setQuickSeriesName={setQuickSeriesName}
            onQuickCreateSeries={handleQuickCreateSeries}
            isCreatingSeries={isCreatingSeries}
            seriesOrder={seriesOrder}
            setSeriesOrder={setSeriesOrder}
            requiredErrors={requiredErrorMap}
            handleAddTag={handleAddTag}
            handleAddTagsBatch={handleAddTagsBatch}
            handleRemoveTag={handleRemoveTag}
            handleClearTags={handleClearTags}
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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("scriptMetadataDialog.confirmSave")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
