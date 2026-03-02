import React, { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { X, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "../ui/select";
import { Textarea } from "../ui/textarea"; 
import { updateScript, addTagToScript, removeTagFromScript, getTags, createTag, getScript, getPersonas, getOrganizations, getUserProfile, getOrganization, getPublicScript, createSeries, uploadMediaObject } from "../../lib/db";
import { useAuth } from "../../contexts/AuthContext";
import { extractMetadataWithRaw, rewriteMetadata, writeMetadata } from "../../lib/metadataParser";
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { fetchUserThemes } from "../../services/settingsApi";
import { defaultMarkerConfigs } from "../../constants/defaultMarkerRules";
import { deriveSimpleLicenseTags, parseBasicLicenseFromMeta } from "../../lib/licenseRights";
import { optimizeImageForUpload, MEDIA_FILE_ACCEPT } from "../../lib/mediaLibrary";
import { MetadataBasicTab } from "./metadata/MetadataBasicTab";
import { MetadataDetailsTab } from "./metadata/MetadataDetailsTab";
import { MediaPicker } from "../ui/MediaPicker";
import { useToast } from "../ui/toast";
import { useI18n } from "../../contexts/I18nContext";

export function buildPublishChecklist({ title, identity, licenseCommercial, licenseDerivative, licenseNotify, coverUrl, synopsis, tags, targetAudience, contentRating, t }) {
    const required = [
        { key: "title", label: t ? t("scriptMetadataDialog.checkTitle") : "Title", ok: Boolean(title?.trim()) },
        { key: "identity", label: t ? t("scriptMetadataDialog.checkIdentity") : "Author identity", ok: Boolean(identity?.startsWith("persona:")) },
        { key: "audience", label: t ? t("scriptMetadataDialog.checkAudience", "觀眾取向 Target Audience") : "Target Audience", ok: Boolean(targetAudience?.trim()) },
        { key: "rating", label: t ? t("scriptMetadataDialog.checkRating", "內容分級 Content Rating") : "Content Rating", ok: Boolean(contentRating?.trim()) },
        {
            key: "license",
            label: t ? t("scriptMetadataDialog.checkLicense") : "License",
            ok: Boolean(licenseCommercial?.trim()) && Boolean(licenseDerivative?.trim()) && Boolean(licenseNotify?.trim()),
        },
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
    const [licenseCommercial, setLicenseCommercial] = useState("");
    const [licenseDerivative, setLicenseDerivative] = useState("");
    const [licenseNotify, setLicenseNotify] = useState("");
    const [licenseSpecialTerms, setLicenseSpecialTerms] = useState([]);
    const [copyright, setCopyright] = useState("");
    const [synopsis, setSynopsis] = useState("");
    const [outline, setOutline] = useState("");
    const [roleSetting, setRoleSetting] = useState("");
    const [backgroundInfo, setBackgroundInfo] = useState("");
    const [performanceInstruction, setPerformanceInstruction] = useState("");
    const [openingIntro, setOpeningIntro] = useState("");
    const [environmentInfo, setEnvironmentInfo] = useState("");
    const [situationInfo, setSituationInfo] = useState("");
    const [seriesName, setSeriesName] = useState("");
    const [seriesId, setSeriesId] = useState("");
    const [seriesOrder, setSeriesOrder] = useState("");
    const [seriesExpanded, setSeriesExpanded] = useState(false);
    const [showSeriesQuickCreate, setShowSeriesQuickCreate] = useState(false);
    const [quickSeriesName, setQuickSeriesName] = useState("");
    const [isCreatingSeries, setIsCreatingSeries] = useState(false);
    // const [description, setDescription] = useState(""); // Merged into synopsis
    const [customFields, setCustomFields] = useState([]);
    const [jsonMode, setJsonMode] = useState(false);
    const [jsonText, setJsonText] = useState("");
    const [jsonError, setJsonError] = useState("");
    const [publishNewTerm, setPublishNewTerm] = useState("");
    const [activeTab, setActiveTab] = useState("basic");
    const [isInitializing, setIsInitializing] = useState(false);
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
    const [coverPreviewFailed, setCoverPreviewFailed] = useState(false);
    const [coverUploadError, setCoverUploadError] = useState("");
    const [coverUploadWarning, setCoverUploadWarning] = useState("");
    const [showAllChecklistChips, setShowAllChecklistChips] = useState(false);
    const [showValidationHints, setShowValidationHints] = useState(false);
    const customIdRef = useRef(0);
    const contentScrollRef = useRef(null);
    const autoScrollLockUntilRef = useRef(0);
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
            if (parsed.outline !== undefined) setOutline(String(parsed.outline || ""));
            if (parsed.roleSetting !== undefined) setRoleSetting(String(parsed.roleSetting || ""));
            if (parsed.backgroundInfo !== undefined) setBackgroundInfo(String(parsed.backgroundInfo || ""));
            if (parsed.performanceInstruction !== undefined) setPerformanceInstruction(String(parsed.performanceInstruction || ""));
            if (parsed.openingIntro !== undefined) setOpeningIntro(String(parsed.openingIntro || ""));
            if (parsed.environmentInfo !== undefined) setEnvironmentInfo(String(parsed.environmentInfo || ""));
            if (parsed.situationInfo !== undefined) setSituationInfo(String(parsed.situationInfo || ""));
            if (parsed.contact !== undefined) setContact(parsed.contact);
            if (parsed.contactFields !== undefined || parsed.contactInfo !== undefined || parsed.contact !== undefined) {
                const cf = parsed.contactFields || parsed.contactInfo || parsed.contact;
                const next = Array.isArray(cf)
                    ? cf.map((f, idx) => ({ id: `ct-${idx + 1}`, key: f.key || "", value: f.value || "" }))
                    : Object.entries(cf || {}).map(([k, v], idx) => ({ id: `ct-${idx + 1}`, key: k, value: String(v ?? "") }));
                setContactFields(next);
            }
            if (parsed.licenseCommercial !== undefined) setLicenseCommercial(String(parsed.licenseCommercial || ""));
            if (parsed.licenseDerivative !== undefined) setLicenseDerivative(String(parsed.licenseDerivative || ""));
            if (parsed.licenseNotify !== undefined) setLicenseNotify(String(parsed.licenseNotify || ""));
            if (parsed.licenseSpecialTerms !== undefined) {
                try {
                    const raw = typeof parsed.licenseSpecialTerms === "string"
                        ? JSON.parse(parsed.licenseSpecialTerms)
                        : parsed.licenseSpecialTerms;
                    setLicenseSpecialTerms(Array.isArray(raw) ? raw : []);
                } catch {
                    setLicenseSpecialTerms([]);
                }
            }
            if (parsed.copyright !== undefined) setCopyright(parsed.copyright);
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
        () => buildPublishChecklist({
            title,
            identity,
            licenseCommercial,
            licenseDerivative,
            licenseNotify,
            coverUrl,
            synopsis,
            tags: currentTags,
            targetAudience,
            contentRating,
            t,
        }),
        [title, identity, licenseCommercial, licenseDerivative, licenseNotify, coverUrl, synopsis, currentTags, targetAudience, contentRating, t]
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
    const requiredTotal = publishChecklist.required.length;
    const recommendedTotal = publishChecklist.recommended.length;
    const completedRequired = requiredTotal - publishChecklist.missingRequired.length;
    const completedRecommended = recommendedTotal - publishChecklist.missingRecommended.length;
    const totalChecklistItems = requiredTotal + recommendedTotal;
    const completedChecklistItems = completedRequired + completedRecommended;
    const completionPercent = totalChecklistItems > 0
        ? Math.round((completedChecklistItems / totalChecklistItems) * 100)
        : 0;
    const hasBlockingIssues = status === "Public" && publishChecklist.missingRequired.length > 0;
    const checklistChipItems = useMemo(
        () => [
            ...publishChecklist.missingRequired.map((item) => ({ ...item, type: "required" })),
            ...publishChecklist.missingRecommended.map((item) => ({ ...item, type: "recommended" })),
        ],
        [publishChecklist.missingRequired, publishChecklist.missingRecommended]
    );
    const maxVisibleChecklistChips = 4;
    const hiddenChecklistChipCount = Math.max(0, checklistChipItems.length - maxVisibleChecklistChips);
    const visibleChecklistChipItems = showAllChecklistChips
        ? checklistChipItems
        : checklistChipItems.slice(0, maxVisibleChecklistChips);
    const missingRequiredMap = useMemo(
        () => Object.fromEntries(publishChecklist.missingRequired.map((item) => [item.key, true])),
        [publishChecklist.missingRequired]
    );
    const rowLabelBaseClass = "p-4 text-sm font-medium text-foreground";
    const rowLabelToneClass = {
        required: "border-l-[5px] border-sky-600 bg-sky-100/80 text-sky-950 dark:border-sky-500 dark:bg-sky-950/25 dark:text-foreground",
        recommended: "border-l-[5px] border-amber-600 bg-amber-100/80 text-amber-950 dark:border-amber-500 dark:bg-amber-950/25 dark:text-foreground",
        advanced: "border-l-[5px] border-fuchsia-600 bg-fuchsia-100/80 text-fuchsia-950 dark:border-fuchsia-500 dark:bg-fuchsia-950/25 dark:text-foreground",
    };
    const getRowLabelClass = (tone = "recommended") =>
        `${rowLabelBaseClass} ${rowLabelToneClass[tone] || rowLabelToneClass.recommended}`;
    const withRequiredHighlight = (baseClass, missing) =>
        missing
            ? `${baseClass} border-l-[6px] border-destructive bg-destructive/20 ring-2 ring-inset ring-destructive/55 dark:bg-destructive/30`
            : baseClass;
    const renderRowLabel = (label, tone = "recommended", missing = false, hint = "") => (
        <div className={withRequiredHighlight(getRowLabelClass(tone), missing)}>
            <div className="flex items-center gap-2">
                <span>{label}</span>
                {missing && (
                    <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-destructive-foreground">
                        必填未完成
                    </span>
                )}
            </div>
            {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
        </div>
    );

    const getKeyTarget = (key) => {
        if (key === "title") return { section: "basic", fieldId: "metadata-title" };
        if (key === "identity") return { section: "basic", fieldId: "metadata-identity-trigger" };
        if (key === "audience") return { section: "publish", fieldId: "metadata-audience" };
        if (key === "rating") return { section: "publish", fieldId: "metadata-rating" };
        if (key === "license") return { section: "publish", fieldId: "license-commercial" };
        if (key === "cover") return { section: "exposure", fieldId: "metadata-cover-url" };
        if (key === "synopsis") return { section: "basic", fieldId: "metadata-synopsis" };
        if (key === "tags") return { section: "exposure", fieldId: "metadata-new-tag" };
        return { section: "basic", fieldId: null };
    };

    const scrollToSection = (section, behavior = "smooth") => {
        const el = document.getElementById(`metadata-section-${section}`);
        if (el && typeof el.scrollIntoView === "function") {
            el.scrollIntoView({ block: "start", behavior });
        }
    };

    const focusSection = (section) => {
        autoScrollLockUntilRef.current = Date.now() + 900;
        setActiveTab(section);
        scrollToSection(section);
    };

    const jumpToChecklistItem = (key) => {
        const target = getKeyTarget(key);
        focusSection(target.section);
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

    const handleCoverUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const optimized = await optimizeImageForUpload(file, "cover");
        if (!optimized.ok) {
            setCoverUploadError(optimized.error || "圖片格式不正確。");
            setCoverUploadWarning("");
            event.target.value = "";
            return;
        }
        try {
            const uploaded = await uploadMediaObject(optimized.file, "cover");
            const nextUrl = String(uploaded?.url || "").trim();
            if (!nextUrl) throw new Error("上傳失敗。");
            setCoverUploadError("");
            setCoverUploadWarning(optimized.warning || "");
            setCoverUrl(nextUrl);
            setCoverPreviewFailed(false);
        } catch (error) {
            setCoverUploadError(error?.message || "上傳失敗。");
            setCoverUploadWarning("");
        } finally {
            event.target.value = "";
        }
    };

    useEffect(() => {
        if (!open || isInitializing) return;
        const rootEl = contentScrollRef.current;
        if (!rootEl) return;
        const sectionIds = ["basic", "publish", "exposure", "advanced"];
        let rafId = null;
        const updateActiveSection = () => {
            if (Date.now() < autoScrollLockUntilRef.current) return;
            const rootRect = rootEl.getBoundingClientRect();
            const threshold = rootRect.top + 120;
            let next = "basic";
            for (const id of sectionIds) {
                const el = document.getElementById(`metadata-section-${id}`);
                if (!el) continue;
                const top = el.getBoundingClientRect().top;
                if (top <= threshold) next = id;
            }
            setActiveTab((prev) => (prev === next ? prev : next));
        };
        const onScroll = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = null;
                updateActiveSection();
            });
        };
        rootEl.addEventListener("scroll", onScroll, { passive: true });
        updateActiveSection();
        return () => {
            rootEl.removeEventListener("scroll", onScroll);
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, [open, isInitializing]);

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
                const normalizeThemeName = (name = "") =>
                    String(name).toLowerCase().replace(/[\s_()（）\-[\]{}]/g, "");
                const isDefaultLike = (theme) => {
                    if (!theme) return false;
                    if (theme.id === "default") return true;
                    const normalized = normalizeThemeName(theme.name || "");
                    return normalized.includes("default") || normalized.includes("預設");
                };
                const customThemes = userThemes.filter((theme) => !isDefaultLike(theme));
                const allThemes = [{ id: 'default', name: t("scriptMetadataDialog.defaultTheme") }, ...customThemes];
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
            setIsInitializing(false);
            setIsMediaPickerOpen(false);
            setCoverPreviewFailed(false);
            setCoverUploadError("");
            setCoverUploadWarning("");
            setShowAllChecklistChips(false);
            setSeriesExpanded(false);
            setShowSeriesQuickCreate(false);
            setShowValidationHints(false);
            return;
        }
        if (initializedRef.current) return;
        if (scriptId) {
            setIsInitializing(true);
            initializedRef.current = true;
            userEditedRef.current = false;
            getScript(scriptId)
                .then((full) => setLocalScript(full))
                .catch((e) => {
                    console.error("Failed to load script", e);
                    setIsInitializing(false);
                });
            return;
        }
        if (!script) return;
        setIsInitializing(true);
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
                    setSynopsis(meta.synopsis || meta.summary || meta.description || meta.notes || "");
                    setOutline(meta.outline || "");
                    setRoleSetting(meta.rolesetting || "");
                    setBackgroundInfo(meta.backgroundinfo || "");
                    setPerformanceInstruction(meta.performanceinstruction || "");
                    setOpeningIntro(meta.openingintro || meta.setting || meta.settingintro || "");
                    setEnvironmentInfo(meta.environmentinfo || meta.background || meta.backgroundintro || "");
                    setSituationInfo(meta.situationinfo || "");
                    setSeriesName(String(meta.series || meta.seriesname || script?.series?.name || ""));
                    setSeriesId(script?.seriesId || "");
                    setSeriesOrder(String(meta.seriesorder ?? script?.seriesOrder ?? ""));
                    // setDescription(meta.description || meta.notes || "");
                    
                    if (meta.marker_legend !== undefined) setShowMarkerLegend(String(meta.marker_legend) === 'true');
                    else if (meta.show_legend !== undefined) setShowMarkerLegend(String(meta.show_legend) === 'true');
                    
                    if (!script.coverUrl && (meta.cover || meta.coverurl)) {
                        setCoverUrl(meta.cover || meta.coverurl);
                    }
                    
                    const basicLicense = parseBasicLicenseFromMeta(meta);
                    setLicenseCommercial(basicLicense.commercialUse || "");
                    setLicenseDerivative(basicLicense.derivativeUse || "");
                    setLicenseNotify(basicLicense.notifyOnModify || "");
                    setLicenseSpecialTerms(ensureList(meta.licensespecialterms || meta.licenseSpecialTerms));

                    setCopyright(meta.copyright || "");

                    const reserved = new Set([
                        "title", "credit", "author", "authors", "source",
                        "draftdate", "date", "contact", "copyright",
                        "notes", "description", "synopsis", "summary",
                        "outline",
                        "notes", "description", "synopsis", "summary",
                        "rolesetting", "backgroundinfo", "performanceinstruction", "openingintro", "environmentinfo", "situationinfo",
                        "setting", "settingintro", "background", "backgroundintro",
                        "cover", "coverurl", "marker_legend", "show_legend",
                        "license", "licenseurl", "licenseterms", "licensespecialterms",
                        "licensecommercial", "licensederivative", "licensenotify", "licensetags", "copyright",
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
                setIsInitializing(false);
            };
            loadContent();
        }
    }, [open, scriptId, script?.id]);

    useEffect(() => {
        if (!open) return;
        if (!scriptId || !localScript || userEditedRef.current) return;
        setIsInitializing(true);
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
                setSynopsis(meta.synopsis || meta.summary || meta.description || meta.notes || "");
                setOutline(meta.outline || "");
                setRoleSetting(meta.rolesetting || "");
                setBackgroundInfo(meta.backgroundinfo || "");
                setPerformanceInstruction(meta.performanceinstruction || "");
                setOpeningIntro(meta.openingintro || meta.setting || meta.settingintro || "");
                setEnvironmentInfo(meta.environmentinfo || meta.background || meta.backgroundintro || "");
                setSituationInfo(meta.situationinfo || "");
                setSeriesName(String(meta.series || meta.seriesname || localScript?.series?.name || ""));
                setSeriesId(localScript?.seriesId || "");
                setSeriesOrder(String(meta.seriesorder ?? localScript?.seriesOrder ?? ""));
                // setDescription(meta.description || meta.notes || "");
                
                if (meta.marker_legend !== undefined) setShowMarkerLegend(String(meta.marker_legend) === 'true');
                else if (meta.show_legend !== undefined) setShowMarkerLegend(String(meta.show_legend) === 'true');

                if (!localScript.coverUrl && (meta.cover || meta.coverurl)) {
                    setCoverUrl(meta.cover || meta.coverurl);
                }

                const basicLicense = parseBasicLicenseFromMeta(meta);
                setLicenseCommercial(basicLicense.commercialUse || "");
                setLicenseDerivative(basicLicense.derivativeUse || "");
                setLicenseNotify(basicLicense.notifyOnModify || "");
                setLicenseSpecialTerms(ensureList(meta.licensespecialterms || meta.licenseSpecialTerms));

                setCopyright(meta.copyright || "");

                const reserved = new Set([
                    "title", "credit", "author", "authors", "source",
                    "draftdate", "date", "contact", "copyright",
                    "notes", "description", "synopsis", "summary",
                    "outline",
                    "rolesetting", "backgroundinfo", "performanceinstruction", "openingintro", "environmentinfo", "situationinfo",
                    "setting", "settingintro", "background", "backgroundintro",
                    "cover", "coverurl", "series", "seriesname", "seriesorder",
                    "license", "licenseurl", "licenseterms", "licensespecialterms",
                    "licensecommercial", "licensederivative", "licensenotify", "licensetags"
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
            setIsInitializing(false);
        };
        loadContent();
    }, [open, scriptId, localScript]);

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
            outline,
            roleSetting,
            backgroundInfo,
            performanceInstruction,
            openingIntro,
            environmentInfo,
            situationInfo,
            // description,
            contact,
            series: seriesName,
            seriesId,
            seriesOrder,
            cover: coverUrl,
            status,
            licenseCommercial,
            licenseDerivative,
            licenseNotify,
            licenseSpecialTerms,
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
        outline,
        roleSetting,
        backgroundInfo,
        performanceInstruction,
        openingIntro,
        environmentInfo,
        situationInfo,
        seriesName,
        seriesId,
        seriesOrder,
        // description,
        contact,
        coverUrl,
        status,
        licenseCommercial,
        licenseDerivative,
        licenseNotify,
        licenseSpecialTerms,
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

    // Auto-fill basic license defaults from persona when metadata is empty
    useEffect(() => {
        const hasLicenseSet =
            Boolean(licenseCommercial) ||
            Boolean(licenseDerivative) ||
            Boolean(licenseNotify) ||
            (licenseSpecialTerms || []).length > 0;
        if (hasLicenseSet) return;
        if (!identity.startsWith("persona:")) return;
        const personaId = identity.split(":")[1];
        const persona = personas.find((p) => p.id === personaId);
        if (!persona) return;
        if (persona.defaultLicenseCommercial) setLicenseCommercial(persona.defaultLicenseCommercial);
        if (persona.defaultLicenseDerivative) setLicenseDerivative(persona.defaultLicenseDerivative);
        if (persona.defaultLicenseNotify) setLicenseNotify(persona.defaultLicenseNotify);
        if (Array.isArray(persona.defaultLicenseSpecialTerms) && persona.defaultLicenseSpecialTerms.length > 0) {
            setLicenseSpecialTerms(ensureList(persona.defaultLicenseSpecialTerms));
        }
    }, [identity, personas, licenseCommercial, licenseDerivative, licenseNotify, licenseSpecialTerms]);

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

    useEffect(() => {
        if (seriesId || String(seriesName || "").trim() || String(seriesOrder || "").trim()) {
            setSeriesExpanded(true);
        }
    }, [seriesId, seriesName, seriesOrder]);

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
            if (outline) orderedEntries.push({ key: "Outline", value: outline });
            if (roleSetting) orderedEntries.push({ key: "RoleSetting", value: roleSetting });
            if (backgroundInfo) orderedEntries.push({ key: "BackgroundInfo", value: backgroundInfo });
            if (performanceInstruction) orderedEntries.push({ key: "PerformanceInstruction", value: performanceInstruction });
            if (openingIntro) orderedEntries.push({ key: "OpeningIntro", value: openingIntro });
            if (environmentInfo) orderedEntries.push({ key: "EnvironmentInfo", value: environmentInfo });
            if (situationInfo) orderedEntries.push({ key: "SituationInfo", value: situationInfo });
            orderedEntries.push({ key: "LicenseCommercial", value: licenseCommercial });
            orderedEntries.push({ key: "LicenseDerivative", value: licenseDerivative });
            orderedEntries.push({ key: "LicenseNotify", value: licenseNotify });
            if (licenseSpecialTerms && licenseSpecialTerms.length > 0) {
                orderedEntries.push({ key: "LicenseSpecialTerms", value: JSON.stringify(licenseSpecialTerms) });
            }
            const basicTags = deriveSimpleLicenseTags({
                commercialUse: licenseCommercial,
                derivativeUse: licenseDerivative,
                notifyOnModify: licenseNotify,
            });
            if (basicTags.length > 0) orderedEntries.push({ key: "LicenseTags", value: JSON.stringify(basicTags) });
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

    const addLicenseSpecialTerm = () => {
        const value = String(publishNewTerm || "").trim();
        if (!value) return;
        setLicenseSpecialTerms((prev) => [...(prev || []), value]);
        setPublishNewTerm("");
    };

    const removeLicenseSpecialTerm = (index) => {
        setLicenseSpecialTerms((prev) => {
            const next = [...(prev || [])];
            next.splice(index, 1);
            return next;
        });
    };

    const focusSeriesSelect = () => {
        window.setTimeout(() => {
            const el = document.getElementById("metadata-series-name");
            if (el && typeof el.focus === "function") el.focus();
        }, 60);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[92vh] w-[95vw] flex-col overflow-hidden gap-0 bg-background p-0 sm:max-w-[760px] lg:max-w-[980px] xl:max-w-[1120px]">
                <DialogHeader className="border-b bg-background px-4 py-3 sm:px-5 sm:py-4">
                    <div className="flex flex-col gap-2.5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <DialogTitle className="text-xl font-semibold tracking-tight">{t("scriptMetadataDialog.title")}</DialogTitle>
                            </div>
                            <Badge
                                variant="outline"
                                className={`text-xs font-medium ${
                                    status === "Public"
                                        ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                        : "border-border text-muted-foreground bg-muted/40"
                                }`}
                            >
                                {status === "Public" ? t("metadataBasic.public", "公開") : t("metadataBasic.private", "私人")}
                            </Badge>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-background p-2.5 shadow-sm">
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                <div className="text-[11px] font-medium text-muted-foreground">{t("scriptMetadataDialog.publishChecklist")}</div>
                                <div className="text-xs font-semibold text-foreground">
                                    {completedChecklistItems}/{totalChecklistItems} {t("common.completed", "完成")}
                                </div>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                    className={`h-full rounded-full transition-all ${hasBlockingIssues ? "bg-destructive" : "bg-foreground/70"}`}
                                    style={{ width: `${completionPercent}%` }}
                                />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {visibleChecklistChipItems.map((item) => (
                                    <button
                                        key={`compact-${item.type}-${item.key}`}
                                        type="button"
                                        className={
                                            item.type === "required"
                                                ? "rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                                                : "rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
                                        }
                                        onClick={() => jumpToChecklistItem(item.key)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                                {!showAllChecklistChips && hiddenChecklistChipCount > 0 && (
                                    <button
                                        key="compact-show-more"
                                        type="button"
                                        className="rounded-md border border-border/70 bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80"
                                        onClick={() => setShowAllChecklistChips(true)}
                                    >
                                        +{hiddenChecklistChipCount}
                                    </button>
                                )}
                                {showAllChecklistChips && checklistChipItems.length > maxVisibleChecklistChips && (
                                    <button
                                        key="compact-show-less"
                                        type="button"
                                        className="rounded-md border border-border/70 bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80"
                                        onClick={() => setShowAllChecklistChips(false)}
                                    >
                                        收合
                                    </button>
                                )}
                                {checklistChipItems.length === 0 && (
                                    <span className="rounded-md border border-emerald-300/70 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-300">
                                        所有檢查項目已完成
                                    </span>
                                )}
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-1 rounded-md border border-border/70 bg-background p-1 sm:grid-cols-4">
                                {[
                                    { key: "basic", label: t("scriptMetadataDialog.tabBasic", "基本資料") },
                                    { key: "publish", label: t("scriptMetadataDialog.tabPublish", "發布設定") },
                                    { key: "exposure", label: t("scriptMetadataDialog.tabExposure", "曝光資訊") },
                                    { key: "advanced", label: t("scriptMetadataDialog.tabAdvanced", "進階設定") },
                                ].map((item, idx) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs sm:text-sm transition ${
                                            activeTab === item.key
                                                ? "border-primary bg-primary/15 text-primary shadow-sm ring-2 ring-primary/35"
                                                : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/60 hover:text-foreground"
                                        }`}
                                        onClick={() => focusSection(item.key)}
                                    >
                                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                                            activeTab === item.key
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-border/70 bg-background text-muted-foreground"
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div ref={contentScrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-muted/10 px-4 py-4 sm:px-6 sm:py-5">
                    <div className="rounded-xl border border-border/70 bg-background p-4 shadow-sm sm:p-5">
                        {isInitializing ? (
                            <div className="flex min-h-[320px] items-center justify-center">
                                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    載入劇本資訊中...
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <section id="metadata-section-basic" className="space-y-3 scroll-mt-24">
                                    <h3 className="text-base font-semibold">{t("scriptMetadataDialog.tabBasic", "基本資料")}</h3>
                                    <MetadataBasicTab
                                        title={title} setTitle={setTitle}
                                        identity={identity} setIdentity={setIdentity}
                                        currentUser={currentUser}
                                        personas={personas}
                                        orgs={orgs}
                                        selectedOrgId={selectedOrgId} setSelectedOrgId={setSelectedOrgId}
                                        status={status} setStatus={setStatus}
                                        date={date} setDate={setDate}
                                        synopsis={synopsis} setSynopsis={setSynopsis}
                                        outline={outline} setOutline={setOutline}
                                        roleSetting={roleSetting} setRoleSetting={setRoleSetting}
                                        backgroundInfo={backgroundInfo} setBackgroundInfo={setBackgroundInfo}
                                        performanceInstruction={performanceInstruction} setPerformanceInstruction={setPerformanceInstruction}
                                        openingIntro={openingIntro} setOpeningIntro={setOpeningIntro}
                                        environmentInfo={environmentInfo} setEnvironmentInfo={setEnvironmentInfo}
                                        situationInfo={situationInfo} setSituationInfo={setSituationInfo}
                                        requiredErrors={requiredErrorMap}
                                        recommendedErrors={recommendedErrorMap}
                                        layout="rows"
                                        requiredHighlights={missingRequiredMap}
                                        rowLabelTones={{
                                            title: "required",
                                            identity: "required",
                                            status: "required",
                                            synopsis: "recommended",
                                            outline: "advanced",
                                            roleSetting: "advanced",
                                            backgroundInfo: "advanced",
                                            openingIntro: "advanced",
                                            environmentInfo: "advanced",
                                            situationInfo: "advanced",
                                        }}
                                    />
                                </section>

                                <section id="metadata-section-publish" className="space-y-3 scroll-mt-24">
                                    <h3 className="text-base font-semibold">{t("scriptMetadataDialog.tabPublish", "發布設定")}</h3>
                                    <div className="rounded-xl border border-border/70 bg-background shadow-sm">
                                        <div className="grid grid-cols-1 divide-y md:grid-cols-[220px_minmax(0,1fr)] md:divide-y-0 md:divide-x">
                                            {renderRowLabel("觀眾取向", "required", Boolean(missingRequiredMap.audience))}
                                            <div id="metadata-audience" className="space-y-2 p-4">
                                                <div className="inline-flex flex-wrap gap-1.5 rounded-md border bg-background p-1">
                                                    {["男性向", "女性向", "一般向"].map((opt) => (
                                                        <Button
                                                            key={`aud-${opt}`}
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className={`h-8 px-3 text-xs font-medium ${targetAudience === opt ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
                                                            onClick={() => handleSetTargetAudience(opt)}
                                                        >
                                                            {opt}
                                                        </Button>
                                                    ))}
                                                </div>
                                                {requiredErrorMap.audience && <p className="text-xs text-destructive">發佈前必須選擇觀眾取向</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                            {renderRowLabel("內容分級", "required", Boolean(missingRequiredMap.rating))}
                                            <div id="metadata-rating" className="space-y-2 p-4">
                                                <div className="inline-flex flex-wrap gap-1.5 rounded-md border bg-background p-1">
                                                    {["全年齡向", "成人向"].map((opt) => (
                                                        <Button
                                                            key={`rating-${opt}`}
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className={`h-8 px-3 text-xs font-medium ${contentRating === opt ? (opt === "成人向" ? "border-red-600 bg-red-600 text-white ring-2 ring-red-500/40" : "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40") : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
                                                            onClick={() => handleSetContentRating(opt)}
                                                        >
                                                            {opt}
                                                        </Button>
                                                    ))}
                                                </div>
                                                {requiredErrorMap.rating && <p className="text-xs text-destructive">發佈前必須選擇內容分級</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                            {renderRowLabel("授權條款", "required", Boolean(missingRequiredMap.license), "商業使用 / 改作 / 修改通知")}
                                            <div className="space-y-3 p-4">
                                                <div className="grid gap-2 sm:grid-cols-3">
                                                    <div>
                                                        <div className="mb-1 text-xs text-muted-foreground">可否商業使用</div>
                                                        <div id="license-commercial" className="grid grid-cols-2 gap-1">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                className={licenseCommercial === "allow" ? "border-emerald-600 bg-emerald-600 text-white ring-2 ring-emerald-500/40 hover:bg-emerald-600" : ""}
                                                                onClick={() => setLicenseCommercial("allow")}
                                                            >
                                                                可
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                className={licenseCommercial === "disallow" ? "border-red-600 bg-red-600 text-white ring-2 ring-red-500/40 hover:bg-red-600" : ""}
                                                                onClick={() => setLicenseCommercial("disallow")}
                                                            >
                                                                不可
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="mb-1 text-xs text-muted-foreground">改作</div>
                                                        <div className="grid grid-cols-3 gap-1">
                                                            <Button type="button" size="sm" variant="outline" className={licenseDerivative === "allow" ? "border-emerald-600 bg-emerald-600 text-white ring-2 ring-emerald-500/40 hover:bg-emerald-600" : ""} onClick={() => setLicenseDerivative("allow")}>可</Button>
                                                            <Button type="button" size="sm" variant="outline" className={licenseDerivative === "disallow" ? "border-red-600 bg-red-600 text-white ring-2 ring-red-500/40 hover:bg-red-600" : ""} onClick={() => setLicenseDerivative("disallow")}>不可</Button>
                                                            <Button type="button" size="sm" variant="outline" className={licenseDerivative === "limited" ? "border-amber-600 bg-amber-500 text-black ring-2 ring-amber-500/40 hover:bg-amber-500" : ""} onClick={() => setLicenseDerivative("limited")}>需同意</Button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="mb-1 text-xs text-muted-foreground">修改須通知作者</div>
                                                        <div className="grid grid-cols-2 gap-1">
                                                            <Button type="button" size="sm" variant="outline" className={licenseNotify === "required" ? "border-emerald-600 bg-emerald-600 text-white ring-2 ring-emerald-500/40 hover:bg-emerald-600" : ""} onClick={() => setLicenseNotify("required")}>需要</Button>
                                                            <Button type="button" size="sm" variant="outline" className={licenseNotify === "not_required" ? "border-red-600 bg-red-600 text-white ring-2 ring-red-500/40 hover:bg-red-600" : ""} onClick={() => setLicenseNotify("not_required")}>不需要</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                                {requiredErrorMap.license && (
                                                    <p className="text-xs text-destructive">發佈前需完成授權設定</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                            <div className={getRowLabelClass("recommended")}>
                                                <div className="text-sm font-medium text-foreground">附加條款與著作權</div>
                                                <div className="mt-1 text-xs text-muted-foreground">補充限制與版權聲明</div>
                                            </div>
                                            <div className="space-y-3 p-4">
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={publishNewTerm}
                                                        onChange={(e) => setPublishNewTerm(e.target.value)}
                                                        placeholder="新增附加條款..."
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                addLicenseSpecialTerm();
                                                            }
                                                        }}
                                                    />
                                                    <Button type="button" variant="secondary" onClick={addLicenseSpecialTerm}>新增</Button>
                                                </div>
                                                {(licenseSpecialTerms || []).length > 0 && (
                                                    <div className="space-y-2">
                                                        {licenseSpecialTerms.map((term, idx) => (
                                                            <div key={`${term}-${idx}`} className="flex items-center justify-between rounded-md border p-2">
                                                                <span className="text-sm">{term}</span>
                                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLicenseSpecialTerm(idx)}>
                                                                    <X className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <Input
                                                    value={copyright}
                                                    onChange={(e) => setCopyright(e.target.value)}
                                                    placeholder="Copyright (c) ..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section id="metadata-section-exposure" className="space-y-3 scroll-mt-24">
                                    <h3 className="text-base font-semibold">{t("scriptMetadataDialog.tabExposure", "曝光資訊")}</h3>
                                    <div className="rounded-xl border border-border/70 bg-background shadow-sm">
                                        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                            <div className={getRowLabelClass("recommended")}>顯示作者</div>
                                            <div className="space-y-2 p-4">
                                                <Input id="metadata-author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="覆蓋顯示的作者名稱..." />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                            <div className={getRowLabelClass("recommended")}>
                                                <div className="text-sm font-medium text-foreground">封面</div>
                                                <div className="mt-1 text-xs text-muted-foreground">公開頁卡片與閱讀頁封面</div>
                                            </div>
                                            <div className="space-y-2 p-4">
                                                <Input id="metadata-cover-url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
                                                        上傳圖片
                                                        <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={handleCoverUpload} />
                                                    </label>
                                                    <Button type="button" variant="secondary" size="sm" className="h-8 text-xs" onClick={() => setIsMediaPickerOpen(true)}>
                                                        從媒體庫選擇
                                                    </Button>
                                                </div>
                                                {coverUploadError && <p className="text-xs text-destructive">{coverUploadError}</p>}
                                                {coverUploadWarning && <p className="text-xs text-amber-700 dark:text-amber-300">{coverUploadWarning}</p>}
                                                {coverUrl && (
                                                    <div className="mt-1 h-28 w-full overflow-hidden rounded-md border bg-muted/20">
                                                        {coverPreviewFailed ? (
                                                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t("metadataDetails.coverPreviewFail")}</div>
                                                        ) : (
                                                            <img
                                                                src={coverUrl}
                                                                alt="cover preview"
                                                                className="h-full w-full object-cover"
                                                                onLoad={() => setCoverPreviewFailed(false)}
                                                                onError={() => setCoverPreviewFailed(true)}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                                {recommendedErrorMap.cover && <p className="text-xs text-amber-700 dark:text-amber-300">{t("metadataDetails.coverTip")}</p>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                            <div className={getRowLabelClass("recommended")}>
                                                <div className="text-sm font-medium text-foreground">系列資訊</div>
                                                <div className="mt-1 text-xs text-muted-foreground">選擇加入系列後再填寫細節</div>
                                            </div>
                                            <div className="space-y-3 p-4">
                                                <div className="inline-flex gap-1 rounded-md border bg-background p-1">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className={!seriesExpanded ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""}
                                                        onClick={() => {
                                                            setSeriesExpanded(false);
                                                            setSeriesId("");
                                                            setSeriesName("");
                                                            setSeriesOrder("");
                                                            setQuickSeriesName("");
                                                            setShowSeriesQuickCreate(false);
                                                        }}
                                                    >
                                                        不加入系列
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className={seriesExpanded ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""}
                                                        onClick={() => {
                                                            setSeriesExpanded(true);
                                                            focusSeriesSelect();
                                                        }}
                                                    >
                                                        加入系列
                                                    </Button>
                                                </div>
                                                {seriesExpanded && (
                                                    <div className="space-y-3 rounded-md border border-border/70 bg-muted/10 p-3">
                                                        <Select
                                                            value={seriesId || undefined}
                                                            onValueChange={(value) => {
                                                                setSeriesId(value);
                                                                const selectedSeries = (seriesOptions || []).find((item) => item.id === value);
                                                                setSeriesName(selectedSeries?.name || "");
                                                                if (value) setShowSeriesQuickCreate(false);
                                                            }}
                                                        >
                                                            <SelectTrigger id="metadata-series-name">
                                                                <SelectValue placeholder="請選擇系列" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {(seriesOptions || []).map((item) => (
                                                                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                type="button"
                                                                variant={showSeriesQuickCreate ? "outline" : "secondary"}
                                                                size="sm"
                                                                onClick={() => setShowSeriesQuickCreate((prev) => !prev)}
                                                            >
                                                                {showSeriesQuickCreate ? "收合建立區" : "建立新系列"}
                                                            </Button>
                                                            <span className="text-xs text-muted-foreground">已選擇既有系列可略過</span>
                                                        </div>
                                                        {showSeriesQuickCreate && (
                                                            <div className="flex gap-2">
                                                                <Input
                                                                    id="metadata-quick-series-name"
                                                                    value={quickSeriesName}
                                                                    onChange={(e) => setQuickSeriesName(e.target.value)}
                                                                    placeholder="輸入新系列名稱"
                                                                    onKeyDown={(e) => {
                                                                        if (e.nativeEvent.isComposing) return;
                                                                        if (e.key !== "Enter") return;
                                                                        e.preventDefault();
                                                                        handleQuickCreateSeries();
                                                                    }}
                                                                />
                                                                <Button type="button" variant="secondary" onClick={handleQuickCreateSeries} disabled={!String(quickSeriesName || "").trim() || isCreatingSeries}>
                                                                    {isCreatingSeries ? "建立中..." : "建立"}
                                                                </Button>
                                                            </div>
                                                        )}
                                                        <Input
                                                            id="metadata-series-order"
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            value={seriesOrder}
                                                            onChange={(e) => setSeriesOrder(e.target.value)}
                                                            placeholder="系列順序，例如 0 或 1"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                            <div className={getRowLabelClass("recommended")}>
                                                <div className="text-sm font-medium text-foreground">標籤</div>
                                                <div className="mt-1 text-xs text-muted-foreground">可輸入後 Enter 新增</div>
                                            </div>
                                            <div className="space-y-2 p-4">
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="metadata-new-tag"
                                                        value={newTagInput}
                                                        onChange={(e) => setNewTagInput(e.target.value)}
                                                        placeholder="搜尋或輸入新標籤..."
                                                        onKeyDown={(e) => {
                                                            if (e.nativeEvent.isComposing) return;
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                handleAddTag();
                                                            }
                                                        }}
                                                    />
                                                    <Button type="button" variant="secondary" onClick={() => handleAddTag()}>新增</Button>
                                                </div>
                                                {recommendedErrorMap.tags && <p className="text-xs text-amber-700 dark:text-amber-300">{t("metadataDetails.tagsTip")}</p>}
                                                <div className="flex flex-wrap gap-2">
                                                    {(currentTags || []).map((tag) => (
                                                        <Badge key={tag.id} variant="secondary" className={`${tag.color || "bg-slate-200"} text-foreground pl-3 pr-1.5 py-1 flex items-center`}>
                                                            {tag.name}
                                                            <button type="button" className="ml-1.5 rounded-full p-0.5 hover:bg-black/20 dark:hover:bg-white/20" onClick={() => handleRemoveTag(tag.id)}>
                                                                <X className="h-3 w-3 opacity-70" />
                                                            </button>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section id="metadata-section-advanced" className="space-y-3 scroll-mt-24">
                                    <h3 className="text-base font-semibold">{t("scriptMetadataDialog.tabAdvanced", "進階設定")}</h3>
                                    <div className="rounded-xl border border-border/70 bg-background shadow-sm">
                                        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                            <div className={getRowLabelClass("advanced")}>標記主題</div>
                                            <div className="space-y-2 p-4">
                                                <Select value={markerThemeId} onValueChange={setMarkerThemeId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t("metadataAdvanced.markerThemePlaceholder")} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {markerThemes.map((mt) => (
                                                            <SelectItem key={mt.id} value={mt.id}>{mt.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                            <div className={getRowLabelClass("advanced")}>閱讀控制</div>
                                            <div className="flex flex-wrap gap-2 p-4">
                                                <Button type="button" variant="outline" className={showMarkerLegend ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""} onClick={() => setShowMarkerLegend(true)}>顯示圖例</Button>
                                                <Button type="button" variant="outline" className={!showMarkerLegend ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""} onClick={() => setShowMarkerLegend(false)}>隱藏圖例</Button>
                                                <Button type="button" variant="outline" className={disableCopy ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""} onClick={() => setDisableCopy(true)}>停用複製</Button>
                                                <Button type="button" variant="outline" className={!disableCopy ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""} onClick={() => setDisableCopy(false)}>允許複製</Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                            <div className={getRowLabelClass("advanced")}>聯絡資訊</div>
                                            <div className="p-4">
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
                                                    showStatusAlert={false}
                                                    showAuthorCover={false}
                                                    showAudienceRating={false}
                                                    showSeries={false}
                                                    showTags={false}
                                                    showContact
                                                    showCustom={false}
                                                    layout="stack"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                            <div className={getRowLabelClass("advanced")}>自訂欄位</div>
                                            <div className="p-4">
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
                                                    showStatusAlert={false}
                                                    showAuthorCover={false}
                                                    showAudienceRating={false}
                                                    showSeries={false}
                                                    showTags={false}
                                                    showContact={false}
                                                    showCustom
                                                    layout="stack"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                            <div className={getRowLabelClass("advanced")}>JSON 模式</div>
                                            <div className="space-y-2 p-4">
                                                <Button type="button" variant="outline" size="sm" onClick={() => setJsonMode(!jsonMode)}>
                                                    {jsonMode ? t("metadataAdvanced.jsonClose") : t("metadataAdvanced.jsonOpen")}
                                                </Button>
                                                {jsonMode && (
                                                    <>
                                                        <Textarea
                                                            id="metadata-json-text"
                                                            aria-label="JSON 內容"
                                                            value={jsonText}
                                                            onChange={(e) => setJsonText(e.target.value)}
                                                            className="h-64 font-mono text-xs"
                                                        />
                                                        {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
                                                        <Button type="button" size="sm" onClick={applyJson}>{t("metadataAdvanced.jsonApply")}</Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </div>
                <MediaPicker
                    open={isMediaPickerOpen}
                    onOpenChange={setIsMediaPickerOpen}
                    onSelect={(url) => {
                        setCoverUrl(url);
                        setCoverPreviewFailed(false);
                        setCoverUploadError("");
                        setCoverUploadWarning("");
                    }}
                />

                <DialogFooter className="border-t bg-background px-4 py-3 sm:px-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("scriptMetadataDialog.confirmSave")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
