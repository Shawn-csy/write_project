import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { getPublicScript } from "../../../lib/api/public";
import { uploadMediaObject } from "../../../lib/api/media";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../ui/toast";
import { useI18n } from "../../../contexts/I18nContext";
import { optimizeImageForUpload } from "../../../lib/mediaLibrary";
import { buildPublishChecklist, usePublishChecklist } from "../../../hooks/dashboard/usePublishChecklist";
import { ensureList } from "../../../hooks/dashboard/scriptMetadataUtils";
import { useScriptMetadataJson } from "../../../hooks/dashboard/useScriptMetadataJson";
import { useScriptTags } from "../../../hooks/dashboard/useScriptTags";
import { useScriptMetadataSave } from "../../../hooks/dashboard/useScriptMetadataSave";
import { useScriptMetadataGuide } from "../../../hooks/dashboard/useScriptMetadataGuide";
import { useScriptMetadataBootstrap } from "../../../hooks/dashboard/useScriptMetadataBootstrap";
import { useScriptMetadataHydration } from "../../../hooks/dashboard/useScriptMetadataHydration";
import { useScriptMetadataLifecycle } from "../../../hooks/dashboard/useScriptMetadataLifecycle";
import { useScriptMetadataPersonaSync } from "../../../hooks/dashboard/useScriptMetadataPersonaSync";
import { useScriptMetadataSeriesSync } from "../../../hooks/dashboard/useScriptMetadataSeriesSync";
import { useScriptMetadataJsonPreview } from "../../../hooks/dashboard/useScriptMetadataJsonPreview";
import { useScriptMetadataTagHandlers } from "../../../hooks/dashboard/useScriptMetadataTagHandlers";
import { useScriptMetadataSeriesActions } from "../../../hooks/dashboard/useScriptMetadataSeriesActions";
import { useScriptMetadataChecklistUI } from "../../../hooks/dashboard/useScriptMetadataChecklistUI";
import { useScriptMetadataDetailsProps } from "../../../hooks/dashboard/useScriptMetadataDetailsProps";
import { useScriptMetadataSupplementalState } from "../../../hooks/dashboard/useScriptMetadataSupplementalState";
import { createEmptyActivityDemoLink } from "../../../lib/activityDemoLinks";
import { getCollapsedSectionsAfterTabSync, ACTIVE_TAB_TO_SECTION, CHECKLIST_ITEM_TO_SECTION } from "../ScriptMetadataDialog";
import type { BaseScriptApi, SeriesLike } from "../../../types/api";
import type { TagLike, LicenseSpecialTerm, ScriptLike } from "../../../hooks/dashboard/types";

export interface ScriptMetadataDialogProps {
    script?: Partial<BaseScriptApi> | null;
    scriptId?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (script: BaseScriptApi) => void;
    seriesOptions?: Array<{ id: string; name: string }>;
    onSeriesCreated?: (series: SeriesLike) => void;
    fetchFullScript?: boolean;
    saveScript?: ((id: string, payload: Partial<BaseScriptApi> & { author?: string }, extra?: Record<string, unknown>) => Promise<BaseScriptApi>) | null;
    syncScriptTags?: ((id: string, tags: TagLike[]) => Promise<void>) | null;
    disableAuthorAutofill?: boolean;
    preserveAuthorInternalData?: boolean;
}

// The context value type is inferred from useScriptMetadataDialogState return
// We use ReturnType trick to keep it in sync automatically
type DialogContextValue = ReturnType<typeof useScriptMetadataDialogState>;

const ScriptMetadataDialogContext = createContext<DialogContextValue | null>(null);

export function useScriptMetadataDialogContext() {
    const ctx = useContext(ScriptMetadataDialogContext);
    if (!ctx) throw new Error("useScriptMetadataDialogContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

function useScriptMetadataDialogState(props: ScriptMetadataDialogProps) {
    const {
        script,
        scriptId,
        open,
        onOpenChange,
        onSave,
        seriesOptions = [],
        onSeriesCreated,
        fetchFullScript = true,
        saveScript = null,
        syncScriptTags = null,
        disableAuthorAutofill = false,
        preserveAuthorInternalData = false,
    } = props;

    const { t } = useI18n();
    const { toast } = useToast();
    const toastAdapter = useCallback(
        (opts: { title?: string; description?: string; variant?: string }) => {
            toast(opts as Parameters<typeof toast>[0]);
        },
        [toast]
    );
    const navigate = useNavigate();

    // --- inline UI state not in supplemental hook ---
    const [title, setTitle] = useState("");
    const [status, setStatus] = useState("Private");
    const [mediaPickerTarget, setMediaPickerTarget] = useState("cover");
    const [cropOpen, setCropOpen] = useState<boolean>(false);
    const [cropPurpose, setCropPurpose] = useState<"avatar" | "logo" | "cover" | "banner" | "generic">("cover");
    const [cropTarget, setCropTarget] = useState<string>("cover");
    const [cropSource, setCropSource] = useState<{ file: File; name: string } | null>(null);
    const [activityBannerPreviewFailed, setActivityBannerPreviewFailed] = useState(false);
    const [activityBannerUploadError, setActivityBannerUploadError] = useState("");
    const [activityBannerUploadWarning, setActivityBannerUploadWarning] = useState("");

    const initialCollapsedSections = {
        basic: true,
        publish: true,
        exposure: true,
        activity: true,
        demo: true,
        advanced: true,
    };
    const [collapsedSections, setCollapsedSections] = useState(initialCollapsedSections);

    const {
        coverUrl, setCoverUrl,
        author, setAuthor,
        authorDisplayMode, setAuthorDisplayMode,
        date, setDate,
        contact, setContact,
        contactFields, setContactFields,
        licenseCommercial, setLicenseCommercial,
        licenseDerivative, setLicenseDerivative,
        licenseNotify, setLicenseNotify,
        licenseSpecialTerms, setLicenseSpecialTerms,
        copyright, setCopyright,
        synopsis, setSynopsis,
        outline, setOutline,
        roleSetting, setRoleSetting,
        backgroundInfo, setBackgroundInfo,
        performanceInstruction, setPerformanceInstruction,
        openingIntro, setOpeningIntro,
        chapterSettings, setChapterSettings,
        activityName, setActivityName,
        activityBannerUrl, setActivityBannerUrl,
        activityContent, setActivityContent,
        activityDemoLinks, setActivityDemoLinks,
        activityWorkUrl, setActivityWorkUrl,
        seriesName, setSeriesName,
        seriesId, setSeriesId,
        seriesOrder, setSeriesOrder,
        seriesExpanded, setSeriesExpanded,
        showSeriesQuickCreate, setShowSeriesQuickCreate,
        quickSeriesName, setQuickSeriesName,
        isCreatingSeries, setIsCreatingSeries,
        customFields, setCustomFields,
        jsonMode, setJsonMode,
        jsonText, setJsonText,
        jsonError, setJsonError,
        publishNewTerm, setPublishNewTerm,
        isMediaPickerOpen, setIsMediaPickerOpen,
        coverPreviewFailed, setCoverPreviewFailed,
        coverUploadError, setCoverUploadError,
        coverUploadWarning, setCoverUploadWarning,
        targetAudience, setTargetAudience,
        contentRating, setContentRating,
        markerThemes, setMarkerThemes,
        markerThemeId, setMarkerThemeId,
        showMarkerLegend, setShowMarkerLegend,
        disableCopy, setDisableCopy,
        dragDisabled, setDragDisabled,
    } = useScriptMetadataSupplementalState();

    const [activeTab, setActiveTab] = useState("basic");
    const [isInitializing, setIsInitializing] = useState(false);
    const [showAllChecklistChips, setShowAllChecklistChips] = useState(false);
    const [showValidationHints, setShowValidationHints] = useState(false);
    const [showPersonaSetupDialog, setShowPersonaSetupDialog] = useState(false);

    const lastActiveTabRef = useRef("basic");
    const pendingActiveTabExpandRef = useRef(false);
    const customIdRef = useRef(0);
    const contentScrollRef = useRef(null);
    const initializedRef = useRef(false);
    const userEditedRef = useRef(false);
    const contactAutoFilledRef = useRef(false);
    const authorEditedRef = useRef(false);
    const publicLoadedRef = useRef<string | null>(null);

    const [localScript, setLocalScript] = useState<BaseScriptApi | null>(null);
    const activeScript = scriptId ? localScript : (localScript || script);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const applyPublicInfo = (publicScript: Record<string, unknown> | null | undefined) => {
        if (!publicScript) return;
        setStatus(String(publicScript.status || (publicScript.isPublic ? "Public" : status)));
        if (publicScript.personaId) {
            setIdentity(`persona:${publicScript.personaId}`);
            setSelectedOrgId(String(publicScript.organizationId || ""));
        } else if (publicScript.organizationId) {
            setSelectedOrgId(String(publicScript.organizationId || ""));
        }
        if (publicScript.coverUrl) setCoverUrl(String(publicScript.coverUrl));
        if (publicScript.markerThemeId) setMarkerThemeId(String(publicScript.markerThemeId));
        if (publicScript.disableCopy !== undefined && publicScript.disableCopy !== null) {
            setDisableCopy(Boolean(publicScript.disableCopy));
        }
        if (publicScript.tags && Array.isArray(publicScript.tags) && publicScript.tags.length > 0) {
            setCurrentTags(publicScript.tags as TagLike[]);
        }
    };

    const loadPublicInfoIfNeeded = async (baseScript: Record<string, unknown> | null | undefined) => {
        if (!baseScript?.id) return;
        if (!(baseScript.isPublic || baseScript.status === "Public")) return;
        if (publicLoadedRef.current === String(baseScript.id)) return;
        try {
            const pub = await getPublicScript(String(baseScript.id));
            publicLoadedRef.current = String(baseScript.id);
            applyPublicInfo(pub);
        } catch (e) {
            console.warn("Failed to load public script info", e);
        }
    };

    const handleCustomFieldUpdate = (index: number, field: "key" | "value" | "type", value: string) => {
        userEditedRef.current = true;
        setCustomFields((prev) => {
            const next = [...prev];
            const current = next[index];
            if (!current) return prev;
            if (field === "type") {
                if (value === "text" || value === "divider") {
                    next[index] = { ...current, type: value };
                }
                return next;
            }
            next[index] = { ...current, [field]: value };
            return next;
        });
    };

    const handleContactFieldUpdate = (index: number, field: "key" | "value", value: string) => {
        userEditedRef.current = true;
        setContactFields((prev) => {
            const next = [...prev];
            const current = next[index];
            if (!current) return prev;
            next[index] = { ...current, [field]: value };
            return next;
        });
    };

    const addCustomField = (key = "", value = "") => {
        customIdRef.current += 1;
        setCustomFields((prev) => [...prev, { id: `cf-${customIdRef.current}`, key, value, type: "text" }]);
    };

    const addDivider = () => {
        customIdRef.current += 1;
        setCustomFields((prev) => [...prev, { id: `cf-${customIdRef.current}`, key: `_sep_${Date.now()}`, value: "SECTION", type: "divider" }]);
    };

    const handleAddContactField = (preset: string) => {
        customIdRef.current += 1;
        setContactFields((prev) => [...prev, { id: `ct-${customIdRef.current}`, key: preset, value: "" }]);
    };

    const { currentUser, profile: currentProfile } = useAuth();
    const [identity, setIdentity] = useState("");
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>("");
    const [personas, setPersonas] = useState<Array<{ id: string; displayName?: string; organizationIds?: string[] }>>([]);
    const [orgs, setOrgs] = useState<Array<{ id: string; name?: string }>>([]);

    const setAuthorWithTracking = useCallback((value: string) => {
        authorEditedRef.current = true;
        setAuthor(value);
    }, [setAuthor]);

    const setAuthorDisplayModeWithTracking = useCallback((value: string) => {
        authorEditedRef.current = true;
        setAuthorDisplayMode(value);
    }, [setAuthorDisplayMode]);

    const {
        currentTags, setCurrentTags,
        availableTags, setAvailableTags,
        newTagInput, setNewTagInput,
        loadTags,
        handleAddTag, handleAddTagsBatch,
        handleRemoveTag, handleClearTags,
    } = useScriptTags({
        t,
        toast: toastAdapter,
        tagOwnerId: typeof activeScript?.ownerId === "string" ? activeScript.ownerId : "",
    });

    useScriptMetadataBootstrap({
        open,
        currentUser,
        currentProfile,
        t,
        loadTags,
        setPersonas,
        setOrgs,
        setMarkerThemes,
        setShowPersonaSetupDialog,
    });

    const setActivityDemoLinksAdapter = useCallback(
        (v: unknown[]) => { setActivityDemoLinks(v as Parameters<typeof setActivityDemoLinks>[0]); },
        [setActivityDemoLinks]
    );
    const setCurrentTagsAdapter = useCallback((v: TagLike[]) => { setCurrentTags(v); }, [setCurrentTags]);
    const setSeriesOrderStrAdapter = useCallback((v: string) => { setSeriesOrder(v); }, [setSeriesOrder]);
    const setSeriesOrderAdapter = useCallback((v: string | number) => { setSeriesOrder(String(v)); }, [setSeriesOrder]);

    const applyJson = useScriptMetadataJson({
        jsonText,
        t,
        availableTags,
        setJsonError,
        setTitle,
        setAuthor: setAuthorWithTracking,
        setAuthorDisplayMode: setAuthorDisplayModeWithTracking,
        setDate,
        setSynopsis,
        setOutline,
        setRoleSetting,
        setBackgroundInfo,
        setPerformanceInstruction,
        setOpeningIntro,
        setChapterSettings,
        setActivityName,
        setActivityBannerUrl,
        setActivityContent,
        setActivityDemoLinks: setActivityDemoLinksAdapter,
        setActivityWorkUrl,
        setContact,
        setContactFields,
        setLicenseCommercial,
        setLicenseDerivative,
        setLicenseNotify,
        setLicenseSpecialTerms,
        setCopyright,
        setSeriesName,
        setSeriesId,
        setSeriesOrder: setSeriesOrderStrAdapter,
        setCoverUrl,
        setStatus,
        setIdentity,
        setSelectedOrgId,
        setCustomFields,
        setCurrentTags: setCurrentTagsAdapter,
    });

    const publishChecklist = usePublishChecklist({
        title, identity, licenseCommercial, licenseDerivative, licenseNotify,
        coverUrl, synopsis, tags: currentTags, targetAudience, contentRating, t,
    });

    const {
        requiredErrorMap, recommendedErrorMap,
        completedChecklistItems, totalChecklistItems, completionPercent,
        hasBlockingIssues, checklistChipItems, maxVisibleChecklistChips,
        hiddenChecklistChipCount, visibleChecklistChipItems, missingRequiredMap,
        getRowLabelClass, renderRowLabel,
    } = useScriptMetadataChecklistUI({ publishChecklist, showValidationHints, showAllChecklistChips, status });

    const needsPersonaBeforePublish = status === "Public" && (!identity || !identity.startsWith("persona:"));
    const hasAnyPersona = personas.length > 0;

    const {
        showGuide, setShowGuide,
        guideIndex, guideSteps, guideSpotlightRect, currentGuide,
        focusSection, jumpToChecklistItem,
        startGuide, handleGuideNext, handleGuidePrev, finishGuide,
    } = useScriptMetadataGuide({ t, open, isInitializing, activeTab, setActiveTab, contentScrollRef });

    const applyCroppedUpload = async (file: File, target: string) => {
        const ruleKey = target === "activityBanner" ? "banner" : "cover";
        const optimized = await optimizeImageForUpload(file, ruleKey);
        if (!optimized.ok) {
            if (target === "activityBanner") {
                setActivityBannerUploadError(optimized.error || "圖片格式不正確。");
                setActivityBannerUploadWarning("");
            } else {
                setCoverUploadError(optimized.error || "圖片格式不正確。");
                setCoverUploadWarning("");
            }
            return;
        }
        try {
            const uploaded = await uploadMediaObject(optimized.file as File, ruleKey);
            const nextUrl = String(uploaded?.url || "").trim();
            if (!nextUrl) throw new Error("上傳失敗。");
            if (target === "activityBanner") {
                setActivityBannerUploadError("");
                setActivityBannerUploadWarning(optimized.warning || "");
                setActivityBannerUrl(nextUrl);
                setActivityBannerPreviewFailed(false);
            } else {
                setCoverUploadError("");
                setCoverUploadWarning(optimized.warning || "");
                setCoverUrl(nextUrl);
                setCoverPreviewFailed(false);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : "上傳失敗。";
            if (target === "activityBanner") {
                setActivityBannerUploadError(msg);
                setActivityBannerUploadWarning("");
            } else {
                setCoverUploadError(msg);
                setCoverUploadWarning("");
            }
        }
    };

    const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCropSource({ file, name: file.name });
        setCropTarget("cover");
        setCropPurpose("cover");
        setCropOpen(true);
        event.target.value = "";
    };

    const handleActivityBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCropSource({ file, name: file.name });
        setCropTarget("activityBanner");
        setCropPurpose("banner");
        setCropOpen(true);
        event.target.value = "";
    };

    const hydrateScriptState = useScriptMetadataHydration({
        fetchFullScript, disableAuthorAutofill,
        disablePersonaAutofill: preserveAuthorInternalData,
        customFields, ensureList, loadPublicInfoIfNeeded, userEditedRef,
        setIsInitializing, setTitle, setCoverUrl, setStatus, setCurrentTags,
        setMarkerThemeId, setShowMarkerLegend, setDisableCopy, setTargetAudience,
        setContentRating, setIdentity, setSelectedOrgId, setAuthor, setAuthorDisplayMode,
        setDate, setContact, setSynopsis, setOutline, setRoleSetting, setBackgroundInfo,
        setPerformanceInstruction, setOpeningIntro, setChapterSettings,
        setActivityName, setActivityBannerUrl, setActivityContent,
        setActivityDemoLinks: setActivityDemoLinksAdapter, setActivityWorkUrl,
        setSeriesName, setSeriesId, setSeriesOrder: setSeriesOrderAdapter,
        setLicenseCommercial, setLicenseDerivative, setLicenseNotify,
        setLicenseSpecialTerms, setCopyright, setCustomFields,
    });

    useScriptMetadataLifecycle({
        open, scriptId,
        script: script as ScriptLike | null,
        localScript, setLocalScript, hydrateScriptState,
        initializedRef, userEditedRef, authorEditedRef, contactAutoFilledRef, publicLoadedRef,
        setActiveTab, setIsInitializing, setIsMediaPickerOpen, setCoverPreviewFailed,
        setCoverUploadError, setCoverUploadWarning, setShowAllChecklistChips,
        setSeriesExpanded, setShowSeriesQuickCreate, setShowValidationHints, setShowPersonaSetupDialog,
    });

    useScriptMetadataPersonaSync({
        open, disablePersonaAutofill: preserveAuthorInternalData,
        identity, personas, contact, contactFields, contactAutoFilledRef,
        selectedOrgId, licenseCommercial, licenseDerivative, licenseNotify, licenseSpecialTerms,
        ensureList, setContactFields, setLicenseCommercial, setLicenseDerivative,
        setLicenseNotify, setLicenseSpecialTerms, setIdentity, setSelectedOrgId,
    });

    useScriptMetadataJsonPreview({
        script: (script as ScriptLike | null | undefined) ?? null,
        title, author, authorDisplayMode, date, synopsis, outline, roleSetting,
        backgroundInfo, performanceInstruction, openingIntro, chapterSettings,
        activityName, activityBannerUrl, activityContent, activityDemoLinks,
        activityWorkUrl, contact, seriesName, seriesId, seriesOrder, coverUrl, status,
        licenseCommercial, licenseDerivative, licenseNotify, licenseSpecialTerms, copyright,
        identity, selectedOrgId, currentTags, contactFields, customFields,
        jsonMode: String(jsonMode), setJsonText,
    });

    useScriptMetadataSeriesSync({ seriesId, seriesName, seriesOrder, seriesOptions, setSeriesName, setSeriesExpanded });

    const { handleQuickCreateSeries, focusSeriesSelect } = useScriptMetadataSeriesActions({
        quickSeriesName, isCreatingSeries, seriesOptions, onSeriesCreated,
        setIsCreatingSeries, setSeriesId, setSeriesName, setQuickSeriesName,
        toast: toastAdapter,
    });

    const { isSaving, handleSave } = useScriptMetadataSave({
        t, toast: toastAdapter,
        script: (script as ScriptLike | null | undefined) ?? null,
        activeScript: (activeScript as ScriptLike | null | undefined) ?? null,
        title, coverUrl, status, author, authorDisplayMode, date, outline,
        roleSetting, backgroundInfo, performanceInstruction, openingIntro, chapterSettings,
        activityName, activityBannerUrl, activityContent, activityDemoLinks, activityWorkUrl,
        licenseCommercial, licenseDerivative, licenseNotify, licenseSpecialTerms, copyright,
        synopsis, contact, contactFields, customFields, seriesOptions, seriesId, seriesName,
        seriesOrder, currentTags, setCurrentTags, availableTags, markerThemeId,
        showMarkerLegend, disableCopy, identity, selectedOrgId, targetAudience, contentRating,
        publishChecklist, needsPersonaBeforePublish, hasAnyPersona, jumpToChecklistItem,
        setShowValidationHints, setShowPersonaSetupDialog, setActiveTab, onSave, onOpenChange,
        saveScript: saveScript ?? undefined,
        syncScriptTags: syncScriptTags ?? undefined,
        preserveAuthorInternalData, authorEditedRef,
    });

    const handleGoToAuthorProfile = () => {
        setShowPersonaSetupDialog(false);
        onOpenChange(false);
        navigate("/studio?tab=profile");
    };

    const handlePersonaSetupDialogOpenChange = (nextOpen: boolean) => {
        setShowPersonaSetupDialog(nextOpen);
        if (!nextOpen) onOpenChange(false);
    };

    const { handleSetTargetAudience, handleSetContentRating } = useScriptMetadataTagHandlers({
        currentTags, availableTags, setAvailableTags, setCurrentTags, setTargetAudience, setContentRating,
    });

    const handleAddContactFieldAdapter = useCallback(() => {
        handleAddContactField("");
    }, [handleAddContactField]);

    const handleContactFieldUpdateAdapter = useCallback((id: string, key: string, value: string) => {
        const index = contactFields.findIndex((f) => f.id === id);
        if (index !== -1) handleContactFieldUpdate(index, key as "key" | "value", value);
    }, [contactFields, handleContactFieldUpdate]);

    const handleCustomFieldUpdateAdapter = useCallback((id: string, key: string, value: string) => {
        const index = customFields.findIndex((f) => f.id === id);
        if (index !== -1) handleCustomFieldUpdate(index, key as "key" | "value" | "type", value);
    }, [customFields, handleCustomFieldUpdate]);

    const metadataDetailsCommonProps = useScriptMetadataDetailsProps({
        status, coverUrl, setCoverUrl, currentTags, author, setAuthor: setAuthorWithTracking,
        availableTags, newTagInput, setNewTagInput, targetAudience, handleSetTargetAudience,
        contentRating, handleSetContentRating, seriesName, setSeriesName, seriesId, setSeriesId,
        seriesOptions, quickSeriesName, setQuickSeriesName, handleQuickCreateSeries,
        isCreatingSeries, seriesOrder, setSeriesOrder: setSeriesOrderAdapter,
        requiredErrorMap,
        handleAddTag, handleAddTagsBatch, handleRemoveTag, handleClearTags,
        contactFields, setContactFields, handleAddContactField: handleAddContactFieldAdapter,
        handleContactFieldUpdate: handleContactFieldUpdateAdapter,
        sensors, dragDisabled, setDragDisabled, customFields, setCustomFields,
        addCustomField, addDivider,
        handleCustomFieldUpdate: handleCustomFieldUpdateAdapter,
        recommendedErrorMap,
    });

    const addLicenseSpecialTerm = () => {
        const value = String(publishNewTerm || "").trim();
        if (!value) return;
        setLicenseSpecialTerms((prev) => [...(prev || []), value]);
        setPublishNewTerm("");
    };

    const removeLicenseSpecialTerm = (index: number) => {
        setLicenseSpecialTerms((prev) => {
            const next = [...(prev || [])];
            next.splice(index, 1);
            return next;
        });
    };

    const handleAddActivityDemoLink = () => {
        setActivityDemoLinks((prev) => [...(prev || []), createEmptyActivityDemoLink(`demo-${Date.now()}`)]);
    };

    const handleUpdateActivityDemoLink = (index: number, field: string, value: string) => {
        setActivityDemoLinks((prev) => {
            const next = [...(prev || [])];
            next[index] = { ...(next[index] || createEmptyActivityDemoLink(`demo-${index + 1}`)), [field]: value };
            return next;
        });
    };

    const handleRemoveActivityDemoLink = (index: number) => {
        setActivityDemoLinks((prev) => {
            const next = [...(prev || [])];
            next.splice(index, 1);
            return next;
        });
    };

    useEffect(() => {
        if (!open) return;
        setCollapsedSections(initialCollapsedSections);
        lastActiveTabRef.current = activeTab;
        pendingActiveTabExpandRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, scriptId, script?.id]);

    const toggleSection = (key: string) => {
        setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    };

    useEffect(() => {
        if (!open) return;
        const previous = lastActiveTabRef.current;
        lastActiveTabRef.current = activeTab;
        if (previous === activeTab) return;
        const shouldExpand = pendingActiveTabExpandRef.current;
        pendingActiveTabExpandRef.current = false;
        setCollapsedSections((prev) => getCollapsedSectionsAfterTabSync(prev, activeTab, shouldExpand) as typeof initialCollapsedSections);
    }, [activeTab, open]);

    const handleFocusSection = (section: string) => {
        const targetSection = ACTIVE_TAB_TO_SECTION[section as keyof typeof ACTIVE_TAB_TO_SECTION] || section;
        if (activeTab === targetSection) {
            pendingActiveTabExpandRef.current = false;
            setCollapsedSections((prev) => getCollapsedSectionsAfterTabSync(prev, targetSection, true) as typeof initialCollapsedSections);
            focusSection(section);
            return;
        }
        pendingActiveTabExpandRef.current = true;
        focusSection(section);
    };

    const handleJumpToChecklistItem = (key: string) => {
        const targetSection = CHECKLIST_ITEM_TO_SECTION[key as keyof typeof CHECKLIST_ITEM_TO_SECTION] || "basic";
        if (activeTab === targetSection) {
            pendingActiveTabExpandRef.current = false;
            setCollapsedSections((prev) => getCollapsedSectionsAfterTabSync(prev, targetSection, true) as typeof initialCollapsedSections);
            jumpToChecklistItem(key);
            return;
        }
        pendingActiveTabExpandRef.current = true;
        jumpToChecklistItem(key);
    };

    const openCoverMediaPicker = () => {
        setMediaPickerTarget("cover");
        setIsMediaPickerOpen(true);
    };

    const openActivityBannerMediaPicker = () => {
        setMediaPickerTarget("activityBanner");
        setIsMediaPickerOpen(true);
    };

    const handleMediaPickerSelect = (url: string) => {
        if (mediaPickerTarget === "activityBanner") {
            setActivityBannerUrl(url);
            setActivityBannerPreviewFailed(false);
            setActivityBannerUploadError("");
            setActivityBannerUploadWarning("");
        } else {
            setCoverUrl(url);
            setCoverPreviewFailed(false);
            setCoverUploadError("");
            setCoverUploadWarning("");
        }
    };

    return {
        // dialog props
        open, onOpenChange, t,
        // status / header
        status, setStatus,
        activeTab, setActiveTab,
        isInitializing,
        showGuide, setShowGuide,
        guideIndex, guideSteps, guideSpotlightRect, currentGuide,
        startGuide, handleGuideNext, handleGuidePrev, finishGuide,
        // checklist
        completedChecklistItems, totalChecklistItems, completionPercent,
        hasBlockingIssues, checklistChipItems, maxVisibleChecklistChips,
        hiddenChecklistChipCount, visibleChecklistChipItems,
        showAllChecklistChips, setShowAllChecklistChips,
        handleFocusSection, handleJumpToChecklistItem,
        // sections collapse
        collapsedSections, toggleSection,
        contentScrollRef,
        // save
        isSaving, handleSave,
        // section data / setters exposed for sub-sections
        title, setTitle,
        identity, setIdentity,
        author, setAuthorWithTracking,
        authorDisplayMode, setAuthorDisplayModeWithTracking,
        currentUser, personas, orgs,
        selectedOrgId, setSelectedOrgId,
        date, setDate,
        synopsis, setSynopsis,
        outline, setOutline,
        roleSetting, setRoleSetting,
        backgroundInfo, setBackgroundInfo,
        performanceInstruction, setPerformanceInstruction,
        openingIntro, setOpeningIntro,
        chapterSettings, setChapterSettings,
        contactFields, setContactFields,
        customFields, setCustomFields,
        requiredErrorMap, recommendedErrorMap, missingRequiredMap,
        getRowLabelClass, renderRowLabel,
        // publish section
        targetAudience, handleSetTargetAudience,
        contentRating, handleSetContentRating,
        licenseCommercial, setLicenseCommercial,
        licenseDerivative, setLicenseDerivative,
        licenseNotify, setLicenseNotify,
        publishNewTerm, setPublishNewTerm,
        addLicenseSpecialTerm, licenseSpecialTerms, removeLicenseSpecialTerm,
        // exposure section
        coverUrl, setCoverUrl,
        handleCoverUpload, openCoverMediaPicker,
        coverUploadError, coverUploadWarning, coverPreviewFailed, setCoverPreviewFailed,
        seriesExpanded, setSeriesExpanded,
        seriesId, setSeriesId,
        seriesName, setSeriesName,
        seriesOrder, setSeriesOrder,
        quickSeriesName, setQuickSeriesName,
        setShowSeriesQuickCreate, showSeriesQuickCreate,
        focusSeriesSelect, handleQuickCreateSeries, isCreatingSeries,
        newTagInput, setNewTagInput,
        handleAddTag, currentTags, handleRemoveTag,
        // activity section
        activityName, setActivityName,
        activityBannerUrl, setActivityBannerUrl,
        handleActivityBannerUpload, openActivityBannerMediaPicker,
        activityBannerPreviewFailed, setActivityBannerPreviewFailed,
        activityBannerUploadError, activityBannerUploadWarning,
        activityContent, setActivityContent,
        activityWorkUrl, setActivityWorkUrl,
        // demo section
        activityDemoLinks,
        handleAddActivityDemoLink, handleUpdateActivityDemoLink, handleRemoveActivityDemoLink,
        // advanced section
        markerThemeId, setMarkerThemeId,
        markerThemes,
        showMarkerLegend, setShowMarkerLegend,
        disableCopy, setDisableCopy,
        metadataDetailsCommonProps,
        jsonMode, setJsonMode,
        jsonText, setJsonText,
        jsonError,
        applyJson,
        // media picker / crop
        isMediaPickerOpen, setIsMediaPickerOpen,
        mediaPickerTarget,
        handleMediaPickerSelect,
        cropOpen, setCropOpen,
        cropSource, cropPurpose,
        cropTarget,
        applyCroppedUpload,
        // persona / overlays
        showPersonaSetupDialog,
        handlePersonaSetupDialogOpenChange,
        handleGoToAuthorProfile,
    };
}

// ---------------------------------------------------------------------------
// Sliced sub-contexts — each holds only the fields that change together,
// so consumers don't re-render when unrelated state updates.
// ---------------------------------------------------------------------------

type AllState = ReturnType<typeof useScriptMetadataDialogState>;

/** Stable shell: open/close, i18n, save action. Changes only on dialog open/close or save. */
export type UIContextValue = Pick<AllState,
    "open" | "onOpenChange" | "t" | "isSaving" | "handleSave" | "showGuide"
>;
const UIContext = React.createContext<UIContextValue | null>(null);
export function useUIContext() {
    const ctx = React.useContext(UIContext);
    if (!ctx) throw new Error("useUIContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

/** Status + tab + sections collapse. Changes on tab switch or section toggle. */
export type StatusContextValue = Pick<AllState,
    "status" | "setStatus" | "activeTab" | "setActiveTab" |
    "collapsedSections" | "toggleSection" | "contentScrollRef" | "isInitializing"
>;
const StatusContext = React.createContext<StatusContextValue | null>(null);
export function useStatusContext() {
    const ctx = React.useContext(StatusContext);
    if (!ctx) throw new Error("useStatusContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

/** Checklist + guide. Changes on every form field edit (for checklist progress). */
export type ChecklistContextValue = Pick<AllState,
    "completedChecklistItems" | "totalChecklistItems" | "completionPercent" |
    "hasBlockingIssues" | "checklistChipItems" | "maxVisibleChecklistChips" |
    "hiddenChecklistChipCount" | "visibleChecklistChipItems" |
    "showAllChecklistChips" | "setShowAllChecklistChips" |
    "handleFocusSection" | "handleJumpToChecklistItem" |
    "startGuide" | "handleGuideNext" | "handleGuidePrev" | "finishGuide" |
    "guideIndex" | "guideSteps" | "guideSpotlightRect" | "currentGuide"
>;
const ChecklistContext = React.createContext<ChecklistContextValue | null>(null);
export function useChecklistContext() {
    const ctx = React.useContext(ChecklistContext);
    if (!ctx) throw new Error("useChecklistContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

/** Overlay state: media picker, crop, persona dialog. Nearly static during editing. */
export type OverlayContextValue = Pick<AllState,
    "isMediaPickerOpen" | "setIsMediaPickerOpen" | "mediaPickerTarget" | "handleMediaPickerSelect" |
    "cropOpen" | "setCropOpen" | "cropSource" | "cropPurpose" | "cropTarget" | "applyCroppedUpload" |
    "showPersonaSetupDialog" | "handlePersonaSetupDialogOpenChange" | "handleGoToAuthorProfile"
>;
const OverlayContext = React.createContext<OverlayContextValue | null>(null);
export function useOverlayContext() {
    const ctx = React.useContext(OverlayContext);
    if (!ctx) throw new Error("useOverlayContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

export type PublicationContextValue = Pick<AllState,
    "status" | "setStatus" | "identity" | "setIdentity" | "selectedOrgId" | "setSelectedOrgId" |
    "targetAudience" | "handleSetTargetAudience" | "contentRating" | "handleSetContentRating"
>;
const PublicationContext = React.createContext<PublicationContextValue | null>(null);
export function usePublicationContext() {
    const ctx = React.useContext(PublicationContext);
    if (!ctx) throw new Error("usePublicationContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

export type ContentContextValue = Pick<AllState,
    "title" | "setTitle" | "author" | "setAuthorWithTracking" | "authorDisplayMode" | "setAuthorDisplayModeWithTracking" |
    "date" | "setDate" | "synopsis" | "setSynopsis" | "outline" | "setOutline" | "roleSetting" | "setRoleSetting" |
    "backgroundInfo" | "setBackgroundInfo" | "performanceInstruction" | "setPerformanceInstruction" |
    "openingIntro" | "setOpeningIntro" | "chapterSettings" | "setChapterSettings" |
    "contactFields" | "setContactFields" | "customFields" | "setCustomFields" | "metadataDetailsCommonProps" |
    "currentUser" | "personas" | "orgs" | "requiredErrorMap" | "recommendedErrorMap" | "missingRequiredMap" |
    "renderRowLabel" | "getRowLabelClass"
>;
const ContentContext = React.createContext<ContentContextValue | null>(null);
export function useContentContext() {
    const ctx = React.useContext(ContentContext);
    if (!ctx) throw new Error("useContentContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

export type LicenseContextValue = Pick<AllState,
    "licenseCommercial" | "setLicenseCommercial" | "licenseDerivative" | "setLicenseDerivative" |
    "licenseNotify" | "setLicenseNotify" | "publishNewTerm" | "setPublishNewTerm" |
    "addLicenseSpecialTerm" | "licenseSpecialTerms" | "removeLicenseSpecialTerm"
>;
const LicenseContext = React.createContext<LicenseContextValue | null>(null);
export function useLicenseContext() {
    const ctx = React.useContext(LicenseContext);
    if (!ctx) throw new Error("useLicenseContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

export type ExposureContextValue = Pick<AllState,
    "coverUrl" | "setCoverUrl" | "handleCoverUpload" | "openCoverMediaPicker" | "coverUploadError" |
    "coverUploadWarning" | "coverPreviewFailed" | "setCoverPreviewFailed" | "seriesExpanded" | "setSeriesExpanded" |
    "seriesId" | "setSeriesId" | "seriesName" | "setSeriesName" | "seriesOrder" | "setSeriesOrder" |
    "quickSeriesName" | "setQuickSeriesName" | "setShowSeriesQuickCreate" | "showSeriesQuickCreate" |
    "focusSeriesSelect" | "handleQuickCreateSeries" | "isCreatingSeries" | "newTagInput" | "setNewTagInput" |
    "handleAddTag" | "currentTags" | "handleRemoveTag" | "markerThemeId" | "setMarkerThemeId" | "markerThemes" |
    "showMarkerLegend" | "setShowMarkerLegend" | "disableCopy" | "setDisableCopy" | "jsonMode" | "setJsonMode" |
    "jsonText" | "setJsonText" | "jsonError" | "applyJson"
>;
const ExposureContext = React.createContext<ExposureContextValue | null>(null);
export function useExposureContext() {
    const ctx = React.useContext(ExposureContext);
    if (!ctx) throw new Error("useExposureContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

export type ActivityContextValue = Pick<AllState,
    "activityName" | "setActivityName" | "activityBannerUrl" | "setActivityBannerUrl" |
    "handleActivityBannerUpload" | "openActivityBannerMediaPicker" | "activityBannerPreviewFailed" |
    "setActivityBannerPreviewFailed" | "activityBannerUploadError" | "activityBannerUploadWarning" |
    "activityContent" | "setActivityContent" | "activityWorkUrl" | "setActivityWorkUrl" |
    "activityDemoLinks" | "handleAddActivityDemoLink" | "handleUpdateActivityDemoLink" | "handleRemoveActivityDemoLink"
>;
const ActivityContext = React.createContext<ActivityContextValue | null>(null);
export function useActivityContext() {
    const ctx = React.useContext(ActivityContext);
    if (!ctx) throw new Error("useActivityContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

/** All form state. ScriptMetadataDialogBody is the primary consumer. */
export type FormContextValue = Omit<AllState,
    keyof UIContextValue | keyof StatusContextValue | keyof ChecklistContextValue | keyof OverlayContextValue
>;
const FormContext = React.createContext<FormContextValue | null>(null);
export function useFormContext() {
    const ctx = React.useContext(FormContext);
    if (!ctx) throw new Error("useFormContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

// ---------------------------------------------------------------------------
// Provider — computes all state once, distributes into sliced contexts.
// ---------------------------------------------------------------------------

export function ScriptMetadataDialogProvider({
    children,
    ...props
}: ScriptMetadataDialogProps & { children: React.ReactNode }) {
    const all = useScriptMetadataDialogState(props);

    // Destructure first so useMemo deps are direct stable references,
    // which satisfies react-hooks/exhaustive-deps without disable comments.
    const {
        open, onOpenChange, t, isSaving, handleSave, showGuide,
        status: allStatus, setStatus, activeTab, setActiveTab,
        collapsedSections, toggleSection, contentScrollRef, isInitializing,
        completedChecklistItems, totalChecklistItems, completionPercent,
        hasBlockingIssues, checklistChipItems, maxVisibleChecklistChips,
        hiddenChecklistChipCount, visibleChecklistChipItems,
        showAllChecklistChips, setShowAllChecklistChips,
        handleFocusSection, handleJumpToChecklistItem,
        startGuide, handleGuideNext, handleGuidePrev, finishGuide,
        guideIndex, guideSteps, guideSpotlightRect, currentGuide,
        isMediaPickerOpen, setIsMediaPickerOpen, mediaPickerTarget, handleMediaPickerSelect,
        cropOpen, setCropOpen, cropSource, cropPurpose, cropTarget, applyCroppedUpload,
        showPersonaSetupDialog, handlePersonaSetupDialogOpenChange, handleGoToAuthorProfile,
    } = all;

    const ui: UIContextValue = useMemo(() => ({
        open, onOpenChange, t, isSaving, handleSave, showGuide,
    }), [open, onOpenChange, t, isSaving, handleSave, showGuide]);

    const status: StatusContextValue = useMemo(() => ({
        status: allStatus, setStatus,
        activeTab, setActiveTab,
        collapsedSections, toggleSection,
        contentScrollRef, isInitializing,
    }), [allStatus, setStatus, activeTab, setActiveTab, collapsedSections, toggleSection, contentScrollRef, isInitializing]);

    const checklist: ChecklistContextValue = useMemo(() => ({
        completedChecklistItems, totalChecklistItems, completionPercent,
        hasBlockingIssues, checklistChipItems, maxVisibleChecklistChips,
        hiddenChecklistChipCount, visibleChecklistChipItems,
        showAllChecklistChips, setShowAllChecklistChips,
        handleFocusSection, handleJumpToChecklistItem,
        startGuide, handleGuideNext, handleGuidePrev, finishGuide,
        guideIndex, guideSteps, guideSpotlightRect, currentGuide,
    }), [
        completedChecklistItems, totalChecklistItems, completionPercent,
        hasBlockingIssues, checklistChipItems, maxVisibleChecklistChips,
        hiddenChecklistChipCount, visibleChecklistChipItems,
        showAllChecklistChips, setShowAllChecklistChips,
        handleFocusSection, handleJumpToChecklistItem,
        startGuide, handleGuideNext, handleGuidePrev, finishGuide,
        guideIndex, guideSteps, guideSpotlightRect, currentGuide,
    ]);

    const overlay: OverlayContextValue = useMemo(() => ({
        isMediaPickerOpen, setIsMediaPickerOpen, mediaPickerTarget, handleMediaPickerSelect,
        cropOpen, setCropOpen, cropSource, cropPurpose, cropTarget, applyCroppedUpload,
        showPersonaSetupDialog, handlePersonaSetupDialogOpenChange, handleGoToAuthorProfile,
    }), [
        isMediaPickerOpen, setIsMediaPickerOpen, mediaPickerTarget, handleMediaPickerSelect,
        cropOpen, setCropOpen, cropSource, cropPurpose, cropTarget, applyCroppedUpload,
        showPersonaSetupDialog, handlePersonaSetupDialogOpenChange, handleGoToAuthorProfile,
    ]);

    // Strip all slice-allocated fields from `all` to obtain the remaining form state.
    // We already have the individual names from the destructure above, so just rest-spread.
    const {
        open: _o, onOpenChange: _oc, t: _t, isSaving: _is, handleSave: _hs, showGuide: _sg,
        status: _st, setStatus: _ss, activeTab: _at, setActiveTab: _sat,
        collapsedSections: _cs, toggleSection: _ts, contentScrollRef: _csr, isInitializing: _ii,
        completedChecklistItems: _cci, totalChecklistItems: _tci, completionPercent: _cp,
        hasBlockingIssues: _hbi, checklistChipItems: _chci, maxVisibleChecklistChips: _mvcc,
        hiddenChecklistChipCount: _hccc, visibleChecklistChipItems: _vcci,
        showAllChecklistChips: _sacc, setShowAllChecklistChips: _ssacc,
        handleFocusSection: _hfs, handleJumpToChecklistItem: _hjtci,
        startGuide: _sgu, handleGuideNext: _hgn, handleGuidePrev: _hgp, finishGuide: _fg,
        guideIndex: _gi, guideSteps: _gst, guideSpotlightRect: _gsr, currentGuide: _cg,
        isMediaPickerOpen: _impo, setIsMediaPickerOpen: _simpo,
        mediaPickerTarget: _mpt, handleMediaPickerSelect: _hmps,
        cropOpen: _co, setCropOpen: _sco, cropSource: _cso, cropPurpose: _cpu,
        cropTarget: _ct, applyCroppedUpload: _acu,
        showPersonaSetupDialog: _spsd,
        handlePersonaSetupDialogOpenChange: _hpsdoc,
        handleGoToAuthorProfile: _hgtap,
        ...form
    } = all;

    const {
        identity, setIdentity, selectedOrgId, setSelectedOrgId, targetAudience, handleSetTargetAudience, contentRating, handleSetContentRating,
        title, setTitle, author, setAuthorWithTracking, authorDisplayMode, setAuthorDisplayModeWithTracking, date, setDate,
        synopsis, setSynopsis, outline, setOutline, roleSetting, setRoleSetting, backgroundInfo, setBackgroundInfo,
        performanceInstruction, setPerformanceInstruction, openingIntro, setOpeningIntro, chapterSettings, setChapterSettings,
        contactFields, setContactFields, customFields, setCustomFields,
        metadataDetailsCommonProps, currentUser, personas, orgs, requiredErrorMap, recommendedErrorMap, missingRequiredMap,
        renderRowLabel, getRowLabelClass,
        licenseCommercial, setLicenseCommercial, licenseDerivative, setLicenseDerivative, licenseNotify, setLicenseNotify,
        publishNewTerm, setPublishNewTerm, addLicenseSpecialTerm, licenseSpecialTerms, removeLicenseSpecialTerm,
        coverUrl, setCoverUrl, handleCoverUpload, openCoverMediaPicker, coverUploadError, coverUploadWarning, coverPreviewFailed, setCoverPreviewFailed,
        seriesExpanded, setSeriesExpanded, seriesId, setSeriesId, seriesName, setSeriesName, seriesOrder, setSeriesOrder,
        quickSeriesName, setQuickSeriesName, setShowSeriesQuickCreate, showSeriesQuickCreate, focusSeriesSelect, handleQuickCreateSeries,
        isCreatingSeries, newTagInput, setNewTagInput, handleAddTag, currentTags, handleRemoveTag, markerThemeId, setMarkerThemeId,
        markerThemes, showMarkerLegend, setShowMarkerLegend, disableCopy, setDisableCopy, jsonMode, setJsonMode, jsonText, setJsonText, jsonError, applyJson,
        activityName, setActivityName, activityBannerUrl, setActivityBannerUrl, handleActivityBannerUpload, openActivityBannerMediaPicker,
        activityBannerPreviewFailed, setActivityBannerPreviewFailed, activityBannerUploadError, activityBannerUploadWarning,
        activityContent, setActivityContent, activityWorkUrl, setActivityWorkUrl, activityDemoLinks,
        handleAddActivityDemoLink, handleUpdateActivityDemoLink, handleRemoveActivityDemoLink,
    } = form;

    const publication: PublicationContextValue = useMemo(() => ({
        status: allStatus,
        setStatus,
        identity,
        setIdentity,
        selectedOrgId,
        setSelectedOrgId,
        targetAudience,
        handleSetTargetAudience,
        contentRating,
        handleSetContentRating,
    }), [
        allStatus, setStatus, identity, setIdentity, selectedOrgId, setSelectedOrgId,
        targetAudience, handleSetTargetAudience, contentRating, handleSetContentRating,
    ]);

    const content: ContentContextValue = useMemo(() => ({
        title, setTitle, author, setAuthorWithTracking, authorDisplayMode, setAuthorDisplayModeWithTracking,
        date, setDate, synopsis, setSynopsis, outline, setOutline, roleSetting, setRoleSetting,
        backgroundInfo, setBackgroundInfo, performanceInstruction, setPerformanceInstruction,
        openingIntro, setOpeningIntro, chapterSettings, setChapterSettings,
        contactFields,
        setContactFields,
        customFields,
        setCustomFields,
        metadataDetailsCommonProps,
        currentUser,
        personas,
        orgs,
        requiredErrorMap,
        recommendedErrorMap,
        missingRequiredMap,
        renderRowLabel,
        getRowLabelClass,
    }), [
        title, setTitle, author, setAuthorWithTracking, authorDisplayMode, setAuthorDisplayModeWithTracking,
        date, setDate, synopsis, setSynopsis, outline, setOutline, roleSetting, setRoleSetting, backgroundInfo,
        setBackgroundInfo, performanceInstruction, setPerformanceInstruction, openingIntro, setOpeningIntro,
        chapterSettings, setChapterSettings, contactFields, setContactFields, customFields, setCustomFields,
        metadataDetailsCommonProps, currentUser, personas, orgs, requiredErrorMap, recommendedErrorMap, missingRequiredMap,
        renderRowLabel, getRowLabelClass,
    ]);

    const license: LicenseContextValue = useMemo(() => ({
        licenseCommercial, setLicenseCommercial, licenseDerivative, setLicenseDerivative,
        licenseNotify, setLicenseNotify, publishNewTerm, setPublishNewTerm,
        addLicenseSpecialTerm, licenseSpecialTerms, removeLicenseSpecialTerm,
    }), [
        licenseCommercial, setLicenseCommercial, licenseDerivative, setLicenseDerivative,
        licenseNotify, setLicenseNotify, publishNewTerm, setPublishNewTerm,
        addLicenseSpecialTerm, licenseSpecialTerms, removeLicenseSpecialTerm,
    ]);

    const exposure: ExposureContextValue = useMemo(() => ({
        coverUrl, setCoverUrl, handleCoverUpload, openCoverMediaPicker, coverUploadError, coverUploadWarning,
        coverPreviewFailed, setCoverPreviewFailed, seriesExpanded, setSeriesExpanded, seriesId, setSeriesId,
        seriesName, setSeriesName, seriesOrder, setSeriesOrder, quickSeriesName, setQuickSeriesName,
        setShowSeriesQuickCreate, showSeriesQuickCreate, focusSeriesSelect, handleQuickCreateSeries,
        isCreatingSeries, newTagInput, setNewTagInput, handleAddTag, currentTags, handleRemoveTag, markerThemeId, setMarkerThemeId,
        markerThemes, showMarkerLegend, setShowMarkerLegend, disableCopy, setDisableCopy, jsonMode, setJsonMode,
        jsonText, setJsonText, jsonError, applyJson,
    }), [
        coverUrl, setCoverUrl, handleCoverUpload, openCoverMediaPicker, coverUploadError, coverUploadWarning,
        coverPreviewFailed, setCoverPreviewFailed, seriesExpanded, setSeriesExpanded, seriesId, setSeriesId,
        seriesName, setSeriesName, seriesOrder, setSeriesOrder, quickSeriesName, setQuickSeriesName,
        setShowSeriesQuickCreate, showSeriesQuickCreate, focusSeriesSelect, handleQuickCreateSeries,
        isCreatingSeries, newTagInput, setNewTagInput, handleAddTag, currentTags, handleRemoveTag, markerThemeId, setMarkerThemeId,
        markerThemes, showMarkerLegend, setShowMarkerLegend, disableCopy, setDisableCopy, jsonMode, setJsonMode,
        jsonText, setJsonText, jsonError, applyJson,
    ]);

    const activity: ActivityContextValue = useMemo(() => ({
        activityName, setActivityName, activityBannerUrl, setActivityBannerUrl, handleActivityBannerUpload, openActivityBannerMediaPicker,
        activityBannerPreviewFailed, setActivityBannerPreviewFailed, activityBannerUploadError, activityBannerUploadWarning,
        activityContent, setActivityContent, activityWorkUrl, setActivityWorkUrl, activityDemoLinks,
        handleAddActivityDemoLink, handleUpdateActivityDemoLink, handleRemoveActivityDemoLink,
    }), [
        activityName, setActivityName, activityBannerUrl, setActivityBannerUrl, handleActivityBannerUpload, openActivityBannerMediaPicker,
        activityBannerPreviewFailed, setActivityBannerPreviewFailed, activityBannerUploadError, activityBannerUploadWarning,
        activityContent, setActivityContent, activityWorkUrl, setActivityWorkUrl, activityDemoLinks,
        handleAddActivityDemoLink, handleUpdateActivityDemoLink, handleRemoveActivityDemoLink,
    ]);

    return (
        <UIContext.Provider value={ui}>
            <StatusContext.Provider value={status}>
                <ChecklistContext.Provider value={checklist}>
                    <OverlayContext.Provider value={overlay}>
                        <FormContext.Provider value={form as FormContextValue}>
                            <PublicationContext.Provider value={publication}>
                                <ContentContext.Provider value={content}>
                                    <LicenseContext.Provider value={license}>
                                        <ExposureContext.Provider value={exposure}>
                                            <ActivityContext.Provider value={activity}>
                                                <ScriptMetadataDialogContext.Provider value={all}>
                                                    {children}
                                                </ScriptMetadataDialogContext.Provider>
                                            </ActivityContext.Provider>
                                        </ExposureContext.Provider>
                                    </LicenseContext.Provider>
                                </ContentContext.Provider>
                            </PublicationContext.Provider>
                        </FormContext.Provider>
                    </OverlayContext.Provider>
                </ChecklistContext.Provider>
            </StatusContext.Provider>
        </UIContext.Provider>
    );
}

export { buildPublishChecklist };
