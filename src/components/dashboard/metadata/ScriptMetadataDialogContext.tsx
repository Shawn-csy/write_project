import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../ui/toast";
import { useI18n } from "../../../contexts/I18nContext";
import { buildPublishChecklist, usePublishChecklist } from "../../../hooks/dashboard/usePublishChecklist";
import { ensureList } from "../../../hooks/dashboard/scriptMetadataUtils";
import { useScriptMetadataJson } from "../../../hooks/dashboard/useScriptMetadataJson";
import { useScriptTags } from "../../../hooks/dashboard/useScriptTags";
import { useScriptMetadataSave } from "../../../hooks/dashboard/useScriptMetadataSave";
import { useScriptMetadataGuide } from "../../../hooks/dashboard/useScriptMetadataGuide";
import { useScriptMetadataBootstrap } from "../../../hooks/dashboard/useScriptMetadataBootstrap";
import type { BootstrapPreloadedData } from "../../../hooks/dashboard/useScriptMetadataBootstrap";
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
import { useScriptMetadataMediaHandlers } from "../../../hooks/dashboard/useScriptMetadataMediaHandlers";
import { useScriptMetadataInlineActions } from "../../../hooks/dashboard/useScriptMetadataInlineActions";
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
    /** @deprecated No longer used. Will be removed in a future version. */
    fetchFullScript?: boolean;
    saveScript?: ((id: string, payload: Partial<BaseScriptApi> & { author?: string }, extra?: Record<string, unknown>) => Promise<BaseScriptApi>) | null;
    syncScriptTags?: ((id: string, tags: TagLike[]) => Promise<void>) | null;
    disableAuthorAutofill?: boolean;
    preserveAuthorInternalData?: boolean;
    /**
     * Pre-loaded bootstrap data from the caller (personas, orgs, markerThemes).
     * When provided, the dialog skips fetching these on open — zero extra API calls.
     */
    preloadedData?: BootstrapPreloadedData;
}

export type { BootstrapPreloadedData };

// The context value type is inferred from useScriptMetadataDialogState return
// We use ReturnType trick to keep it in sync automatically
type DialogContextValue = ReturnType<typeof useScriptMetadataDialogState>;

export const ScriptMetadataDialogContext = createContext<DialogContextValue | null>(null);

export function useScriptMetadataDialogContext() {
    const ctx = useContext(ScriptMetadataDialogContext);
    if (!ctx) throw new Error("useScriptMetadataDialogContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

export function useScriptMetadataDialogState(props: ScriptMetadataDialogProps) {
    const {
        script,
        scriptId,
        open,
        onOpenChange,
        onSave,
        seriesOptions = [],
        onSeriesCreated,
        saveScript = null,
        syncScriptTags = null,
        disableAuthorAutofill = false,
        preserveAuthorInternalData = false,
        preloadedData,
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
        coverUrl, setCoverUrl, coverCrop, setCoverCrop, coverDesign, setCoverDesign,
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

    const [localScript, setLocalScript] = useState<BaseScriptApi | null>(null);
    const activeScript = scriptId ? localScript : (localScript || script);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

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
        preloadedData,
    });

    const setActivityDemoLinksAdapter = useCallback(
        (v: unknown[]) => { (setActivityDemoLinks as unknown as (v: unknown[]) => void)(v); },
        [setActivityDemoLinks]
    );
    const setActivityDemoLinksDispatch = setActivityDemoLinks as unknown as React.Dispatch<React.SetStateAction<unknown[]>>;

    const {
        handleCustomFieldUpdate,
        handleContactFieldUpdate,
        addCustomField,
        addDivider,
        handleAddContactField,
        handleContactFieldUpdateAdapter,
        handleCustomFieldUpdateAdapter,
        handleAddContactFieldAdapter,
        addLicenseSpecialTerm,
        removeLicenseSpecialTerm,
        handleAddActivityDemoLink,
        handleUpdateActivityDemoLink,
        handleRemoveActivityDemoLink,
    } = useScriptMetadataInlineActions({
        customFields, setCustomFields,
        contactFields, setContactFields,
        setActivityDemoLinks: setActivityDemoLinksDispatch,
        setLicenseSpecialTerms,
        publishNewTerm, setPublishNewTerm,
        userEditedRef,
        customIdRef,
    });

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
        setCoverCrop,
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

    const {
        applyCroppedUpload,
        handleCoverUpload,
        handleActivityBannerUpload,
        openCoverMediaPicker,
        openActivityBannerMediaPicker,
        handleMediaPickerSelect,
        handleMediaPickerSelectMedia,
    } = useScriptMetadataMediaHandlers({
        setCoverUrl, setCoverCrop, setCoverPreviewFailed, setCoverUploadError, setCoverUploadWarning,
        setActivityBannerUrl, setActivityBannerPreviewFailed, setActivityBannerUploadError, setActivityBannerUploadWarning,
        setIsMediaPickerOpen, setMediaPickerTarget, mediaPickerTarget,
        setCropSource, setCropTarget, setCropPurpose, setCropOpen,
    });

    const hydrateScriptState = useScriptMetadataHydration({
        disableAuthorAutofill,
        disablePersonaAutofill: preserveAuthorInternalData,
        customFields, ensureList, userEditedRef,
        setIsInitializing, setTitle, setCoverUrl, setCoverCrop, setCoverDesign, setStatus, setCurrentTags,
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
        initializedRef, userEditedRef, authorEditedRef, contactAutoFilledRef,
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

    const saveDraft = {
        title, status, coverUrl, coverCrop: coverCrop ?? null, coverDesign: coverDesign ?? null,
        draftDate: date, author, authorDisplayMode,
        personaId: identity.startsWith("persona:") ? identity.slice("persona:".length).trim() : "",
        organizationId: selectedOrgId ?? null,
        seriesId: seriesId ?? null, seriesOrder, seriesName,
        licenseCommercial, licenseDerivative, licenseNotify,
        licenseSpecialTerms: licenseSpecialTerms as string[],
        markerThemeId, showMarkerLegend, disableCopy,
        currentTags, targetAudience, contentRating,
        synopsis, outline, roleSetting, backgroundInfo, performanceInstruction,
        openingIntro, chapterSettings, activityName, activityBannerUrl, activityContent,
        activityDemoLinks: activityDemoLinks as unknown[], activityWorkUrl,
        contact, contactFields, copyright, customFields,
    };

    const { isSaving, handleSave } = useScriptMetadataSave({
        t, toast: toastAdapter,
        script: (script as ScriptLike | null | undefined) ?? null,
        activeScript: (activeScript as ScriptLike | null | undefined) ?? null,
        draft: saveDraft,
        availableTags, setCurrentTags, seriesOptions,
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

    const metadataDetailsCommonProps = useScriptMetadataDetailsProps({
        status, coverUrl, coverCrop, setCoverUrl, setCoverCrop, currentTags, author, setAuthor: setAuthorWithTracking,
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
        previewContent: String((activeScript as { content?: unknown } | null | undefined)?.content || ""),
        previewScriptId: String((activeScript as { id?: unknown } | null | undefined)?.id || ""),
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
        coverUrl, setCoverUrl, coverCrop, setCoverCrop, coverDesign, setCoverDesign,
        handleCoverUpload, openCoverMediaPicker,
        coverUploadError, coverUploadWarning, coverPreviewFailed, setCoverPreviewFailed,
        seriesExpanded, setSeriesExpanded,
        seriesId, setSeriesId,
        seriesName, setSeriesName,
        seriesOrder, setSeriesOrder,
        quickSeriesName, setQuickSeriesName,
        setShowSeriesQuickCreate, showSeriesQuickCreate,
        focusSeriesSelect, handleQuickCreateSeries, isCreatingSeries,
        seriesOptions,
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
        handleMediaPickerSelectMedia,
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

// Sliced contexts, context hooks, Provider, and buildPublishChecklist are in ScriptMetadataProvider.tsx.
// Re-export everything consumers need so import paths don't change.
export {
    useUIContext, useStatusContext, useChecklistContext, useOverlayContext,
    usePublicationContext, useContentContext, useLicenseContext, useExposureContext,
    useJsonEditorContext, useActivityContext, useFormContext,
    ScriptMetadataDialogProvider,
    buildPublishChecklist,
} from "./ScriptMetadataProvider";
export type {
    UIContextValue, StatusContextValue, ChecklistContextValue, OverlayContextValue,
    PublicationContextValue, ContentContextValue, LicenseContextValue, ExposureContextValue,
    JsonEditorContextValue, ActivityContextValue, FormContextValue,
} from "./ScriptMetadataProvider";
