import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Loader2, CircleHelp } from "lucide-react";
import { getPublicScript } from "../../lib/api/public";
import { uploadMediaObject } from "../../lib/api/media";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { optimizeImageForUpload } from "../../lib/mediaLibrary";
import { ScriptMetadataBasicSection } from "./metadata/ScriptMetadataBasicSection";
import { ScriptMetadataChecklistHeader } from "./metadata/ScriptMetadataChecklistHeader";
import { PersonaSetupDialog } from "./metadata/PersonaSetupDialog";
import { ScriptMetadataPublishSection } from "./metadata/ScriptMetadataPublishSection";
import { ScriptMetadataExposureSection } from "./metadata/ScriptMetadataExposureSection";
import { ScriptMetadataActivitySection } from "./metadata/ScriptMetadataActivitySection";
import { ScriptMetadataAdvancedSection } from "./metadata/ScriptMetadataAdvancedSection";
import { MediaPicker } from "../ui/MediaPicker";
import { useToast } from "../ui/toast";
import { useI18n } from "../../contexts/I18nContext";
import { buildPublishChecklist, usePublishChecklist } from "../../hooks/dashboard/usePublishChecklist";
import { ensureList } from "../../hooks/dashboard/scriptMetadataUtils";
import { useScriptMetadataJson } from "../../hooks/dashboard/useScriptMetadataJson";
import { useScriptTags } from "../../hooks/dashboard/useScriptTags";
import { useScriptMetadataSave } from "../../hooks/dashboard/useScriptMetadataSave";
import { useScriptMetadataGuide } from "../../hooks/dashboard/useScriptMetadataGuide";
import { useScriptMetadataBootstrap } from "../../hooks/dashboard/useScriptMetadataBootstrap";
import { useScriptMetadataHydration } from "../../hooks/dashboard/useScriptMetadataHydration";
import { useScriptMetadataLifecycle } from "../../hooks/dashboard/useScriptMetadataLifecycle";
import { useScriptMetadataPersonaSync } from "../../hooks/dashboard/useScriptMetadataPersonaSync";
import { useScriptMetadataSeriesSync } from "../../hooks/dashboard/useScriptMetadataSeriesSync";
import { useScriptMetadataJsonPreview } from "../../hooks/dashboard/useScriptMetadataJsonPreview";
import { useScriptMetadataTagHandlers } from "../../hooks/dashboard/useScriptMetadataTagHandlers";
import { useScriptMetadataSeriesActions } from "../../hooks/dashboard/useScriptMetadataSeriesActions";
import { useScriptMetadataChecklistUI } from "../../hooks/dashboard/useScriptMetadataChecklistUI";
import { useScriptMetadataDetailsProps } from "../../hooks/dashboard/useScriptMetadataDetailsProps";
import { useScriptMetadataSupplementalState } from "../../hooks/dashboard/useScriptMetadataSupplementalState";
import { SpotlightGuideOverlay } from "../common/SpotlightGuideOverlay";
import { ImageCropDialog } from "../ui/ImageCropDialog";

export { buildPublishChecklist };





export function ScriptMetadataDialog({ script, scriptId, open, onOpenChange, onSave, seriesOptions = [], onSeriesCreated }) {
    const { t } = useI18n();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [status, setStatus] = useState("Private");
    const [mediaPickerTarget, setMediaPickerTarget] = useState("cover");
    const [cropOpen, setCropOpen] = useState(false);
    const [cropPurpose, setCropPurpose] = useState("cover");
    const [cropTarget, setCropTarget] = useState("cover");
    const [cropSource, setCropSource] = useState(null);
    const [activityBannerPreviewFailed, setActivityBannerPreviewFailed] = useState(false);
    const [activityBannerUploadError, setActivityBannerUploadError] = useState("");
    const [activityBannerUploadWarning, setActivityBannerUploadWarning] = useState("");

    const {
        coverUrl,
        setCoverUrl,
        author,
        setAuthor,
        authorDisplayMode,
        setAuthorDisplayMode,
        date,
        setDate,
        contact,
        setContact,
        contactFields,
        setContactFields,
        licenseCommercial,
        setLicenseCommercial,
        licenseDerivative,
        setLicenseDerivative,
        licenseNotify,
        setLicenseNotify,
        licenseSpecialTerms,
        setLicenseSpecialTerms,
        copyright,
        setCopyright,
        synopsis,
        setSynopsis,
        outline,
        setOutline,
        roleSetting,
        setRoleSetting,
        backgroundInfo,
        setBackgroundInfo,
        performanceInstruction,
        setPerformanceInstruction,
        openingIntro,
        setOpeningIntro,
        environmentInfo,
        setEnvironmentInfo,
        situationInfo,
        setSituationInfo,
        activityName,
        setActivityName,
        activityBannerUrl,
        setActivityBannerUrl,
        activityContent,
        setActivityContent,
        activityDemoUrl,
        setActivityDemoUrl,
        activityWorkUrl,
        setActivityWorkUrl,
        seriesName,
        setSeriesName,
        seriesId,
        setSeriesId,
        seriesOrder,
        setSeriesOrder,
        seriesExpanded,
        setSeriesExpanded,
        showSeriesQuickCreate,
        setShowSeriesQuickCreate,
        quickSeriesName,
        setQuickSeriesName,
        isCreatingSeries,
        setIsCreatingSeries,
        customFields,
        setCustomFields,
        jsonMode,
        setJsonMode,
        jsonText,
        setJsonText,
        jsonError,
        setJsonError,
        publishNewTerm,
        setPublishNewTerm,
        isMediaPickerOpen,
        setIsMediaPickerOpen,
        coverPreviewFailed,
        setCoverPreviewFailed,
        coverUploadError,
        setCoverUploadError,
        coverUploadWarning,
        setCoverUploadWarning,
        targetAudience,
        setTargetAudience,
        contentRating,
        setContentRating,
        markerThemes,
        setMarkerThemes,
        markerThemeId,
        setMarkerThemeId,
        showMarkerLegend,
        setShowMarkerLegend,
        disableCopy,
        setDisableCopy,
        dragDisabled,
        setDragDisabled,
    } = useScriptMetadataSupplementalState();

    const [activeTab, setActiveTab] = useState("basic");
    const [isInitializing, setIsInitializing] = useState(false);
    const [showAllChecklistChips, setShowAllChecklistChips] = useState(false);
    const [showValidationHints, setShowValidationHints] = useState(false);
    const [showPersonaSetupDialog, setShowPersonaSetupDialog] = useState(false);
    const customIdRef = useRef(0);
    const contentScrollRef = useRef(null);
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

    const {
        currentTags,
        setCurrentTags,
        availableTags,
        setAvailableTags,
        newTagInput,
        setNewTagInput,
        loadTags,
        handleAddTag,
        handleAddTagsBatch,
        handleRemoveTag,
        handleClearTags,
    } = useScriptTags({ t, toast });
    
    // Identity Selection
    const { currentUser, profile: currentProfile } = useAuth();
    const [identity, setIdentity] = useState(""); // persona:ID only
    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [personas, setPersonas] = useState([]);
    const [orgs, setOrgs] = useState([]);
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
    const applyJson = useScriptMetadataJson({
        jsonText,
        t,
        availableTags,
        setJsonError,
        setTitle,
        setAuthor,
        setAuthorDisplayMode,
        setDate,
        setSynopsis,
        setOutline,
        setRoleSetting,
        setBackgroundInfo,
        setPerformanceInstruction,
        setOpeningIntro,
        setEnvironmentInfo,
        setSituationInfo,
        setActivityName,
        setActivityBannerUrl,
        setActivityContent,
        setActivityDemoUrl,
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
        setSeriesOrder,
        setCoverUrl,
        setStatus,
        setIdentity,
        setSelectedOrgId,
        setCustomFields,
        setCurrentTags,
    });
    const publishChecklist = usePublishChecklist({
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
    });
    const {
        requiredErrorMap,
        recommendedErrorMap,
        completedChecklistItems,
        totalChecklistItems,
        completionPercent,
        hasBlockingIssues,
        checklistChipItems,
        maxVisibleChecklistChips,
        hiddenChecklistChipCount,
        visibleChecklistChipItems,
        missingRequiredMap,
        getRowLabelClass,
        renderRowLabel,
    } = useScriptMetadataChecklistUI({
        publishChecklist,
        showValidationHints,
        showAllChecklistChips,
        status,
    });
    const needsPersonaBeforePublish = status === "Public" && (!identity || !identity.startsWith("persona:"));
    const hasAnyPersona = personas.length > 0;

    const {
        showGuide,
        setShowGuide,
        guideIndex,
        guideSteps,
        guideSpotlightRect,
        currentGuide,
        focusSection,
        jumpToChecklistItem,
        startGuide,
        handleGuideNext,
        handleGuidePrev,
        finishGuide,
    } = useScriptMetadataGuide({
        t,
        open,
        isInitializing,
        activeTab,
        setActiveTab,
        contentScrollRef,
    });

    const applyCroppedUpload = async (file, target) => {
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
            const uploaded = await uploadMediaObject(optimized.file, ruleKey);
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
            if (target === "activityBanner") {
                setActivityBannerUploadError(error?.message || "上傳失敗。");
                setActivityBannerUploadWarning("");
            } else {
                setCoverUploadError(error?.message || "上傳失敗。");
                setCoverUploadWarning("");
            }
        }
    };

    const handleCoverUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCropSource({ file, name: file.name });
        setCropTarget("cover");
        setCropPurpose("cover");
        setCropOpen(true);
        event.target.value = "";
    };

    const handleActivityBannerUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCropSource({ file, name: file.name });
        setCropTarget("activityBanner");
        setCropPurpose("banner");
        setCropOpen(true);
        event.target.value = "";
    };

    const hydrateScriptState = useScriptMetadataHydration({
        customFields,
        ensureList,
        loadPublicInfoIfNeeded,
        userEditedRef,
        setIsInitializing,
        setTitle,
        setCoverUrl,
        setStatus,
        setCurrentTags,
        setMarkerThemeId,
        setShowMarkerLegend,
        setDisableCopy,
        setTargetAudience,
        setContentRating,
        setIdentity,
        setSelectedOrgId,
        setAuthor,
        setAuthorDisplayMode,
        setDate,
        setContact,
        setSynopsis,
        setOutline,
        setRoleSetting,
        setBackgroundInfo,
        setPerformanceInstruction,
        setOpeningIntro,
        setEnvironmentInfo,
        setSituationInfo,
        setActivityName,
        setActivityBannerUrl,
        setActivityContent,
        setActivityDemoUrl,
        setActivityWorkUrl,
        setSeriesName,
        setSeriesId,
        setSeriesOrder,
        setLicenseCommercial,
        setLicenseDerivative,
        setLicenseNotify,
        setLicenseSpecialTerms,
        setCopyright,
        setCustomFields,
    });

    useScriptMetadataLifecycle({
        open,
        scriptId,
        script,
        localScript,
        setLocalScript,
        hydrateScriptState,
        initializedRef,
        userEditedRef,
        contactAutoFilledRef,
        publicLoadedRef,
        setActiveTab,
        setIsInitializing,
        setIsMediaPickerOpen,
        setCoverPreviewFailed,
        setCoverUploadError,
        setCoverUploadWarning,
        setShowAllChecklistChips,
        setSeriesExpanded,
        setShowSeriesQuickCreate,
        setShowValidationHints,
        setShowPersonaSetupDialog,
    });

    useScriptMetadataPersonaSync({
        open,
        identity,
        personas,
        contact,
        contactFields,
        contactAutoFilledRef,
        selectedOrgId,
        licenseCommercial,
        licenseDerivative,
        licenseNotify,
        licenseSpecialTerms,
        ensureList,
        setContactFields,
        setLicenseCommercial,
        setLicenseDerivative,
        setLicenseNotify,
        setLicenseSpecialTerms,
        setIdentity,
        setSelectedOrgId,
    });
    
    useScriptMetadataJsonPreview({
        script,
        title,
        author,
        authorDisplayMode,
        date,
        synopsis,
        outline,
        roleSetting,
        backgroundInfo,
        performanceInstruction,
        openingIntro,
        environmentInfo,
        situationInfo,
        activityName,
        activityBannerUrl,
        activityContent,
        activityDemoUrl,
        activityWorkUrl,
        contact,
        seriesName,
        seriesId,
        seriesOrder,
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
        jsonMode,
        setJsonText,
    });

    useScriptMetadataSeriesSync({
        seriesId,
        seriesName,
        seriesOrder,
        seriesOptions,
        setSeriesName,
        setSeriesExpanded,
    });

    const { handleQuickCreateSeries, focusSeriesSelect } = useScriptMetadataSeriesActions({
        quickSeriesName,
        isCreatingSeries,
        seriesOptions,
        onSeriesCreated,
        setIsCreatingSeries,
        setSeriesId,
        setSeriesName,
        setQuickSeriesName,
        toast,
    });

    const { isSaving, handleSave } = useScriptMetadataSave({
        t,
        toast,
        script,
        activeScript,
        title,
        coverUrl,
        status,
        author,
        authorDisplayMode,
        date,
        outline,
        roleSetting,
        backgroundInfo,
        performanceInstruction,
        openingIntro,
        environmentInfo,
        situationInfo,
        activityName,
        activityBannerUrl,
        activityContent,
        activityDemoUrl,
        activityWorkUrl,
        licenseCommercial,
        licenseDerivative,
        licenseNotify,
        licenseSpecialTerms,
        copyright,
        synopsis,
        contact,
        contactFields,
        customFields,
        seriesOptions,
        seriesId,
        seriesName,
        seriesOrder,
        currentTags,
        setCurrentTags,
        availableTags,
        markerThemeId,
        showMarkerLegend,
        disableCopy,
        identity,
        selectedOrgId,
        targetAudience,
        contentRating,
        publishChecklist,
        needsPersonaBeforePublish,
        hasAnyPersona,
        jumpToChecklistItem,
        setShowValidationHints,
        setShowPersonaSetupDialog,
        setActiveTab,
        onSave,
        onOpenChange,
    });

    const handleGoToAuthorProfile = () => {
        setShowPersonaSetupDialog(false);
        onOpenChange(false);
        navigate("/studio?tab=profile");
    };

    const { handleSetTargetAudience, handleSetContentRating } = useScriptMetadataTagHandlers({
        currentTags,
        availableTags,
        setAvailableTags,
        setCurrentTags,
        setTargetAudience,
        setContentRating,
    });

    const metadataDetailsCommonProps = useScriptMetadataDetailsProps({
        status,
        coverUrl,
        setCoverUrl,
        currentTags,
        author,
        setAuthor,
        availableTags,
        newTagInput,
        setNewTagInput,
        targetAudience,
        handleSetTargetAudience,
        contentRating,
        handleSetContentRating,
        seriesName,
        setSeriesName,
        seriesId,
        setSeriesId,
        seriesOptions,
        quickSeriesName,
        setQuickSeriesName,
        handleQuickCreateSeries,
        isCreatingSeries,
        seriesOrder,
        setSeriesOrder,
        requiredErrorMap,
        handleAddTag,
        handleAddTagsBatch,
        handleRemoveTag,
        handleClearTags,
        contactFields,
        setContactFields,
        handleAddContactField,
        handleContactFieldUpdate,
        sensors,
        dragDisabled,
        setDragDisabled,
        customFields,
        setCustomFields,
        addCustomField,
        addDivider,
        handleCustomFieldUpdate,
        recommendedErrorMap,
    });

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

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex max-h-[92vh] w-[95vw] flex-col overflow-hidden gap-0 bg-background p-0 sm:max-w-[760px] lg:max-w-[980px] xl:max-w-[1120px]"
                onInteractOutside={(e) => {
                    if (showGuide) e.preventDefault();
                }}
                onEscapeKeyDown={(e) => {
                    if (showGuide) e.preventDefault();
                }}
            >
                <DialogHeader className="border-b bg-background px-4 py-3 sm:px-5 sm:py-4">
                    <div className="flex flex-col gap-2.5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <DialogTitle className="text-xl font-semibold tracking-tight">{t("scriptMetadataDialog.title")}</DialogTitle>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" size="sm" className="h-8" onClick={startGuide}>
                                    <CircleHelp className="mr-1.5 h-4 w-4" />
                                    {t("scriptMetadataDialog.guide")}
                                </Button>
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
                        </div>
                        <ScriptMetadataChecklistHeader
                            t={t}
                            completedChecklistItems={completedChecklistItems}
                            totalChecklistItems={totalChecklistItems}
                            completionPercent={completionPercent}
                            hasBlockingIssues={hasBlockingIssues}
                            visibleChecklistChipItems={visibleChecklistChipItems}
                            showAllChecklistChips={showAllChecklistChips}
                            hiddenChecklistChipCount={hiddenChecklistChipCount}
                            checklistChipItems={checklistChipItems}
                            maxVisibleChecklistChips={maxVisibleChecklistChips}
                            activeTab={activeTab}
                            jumpToChecklistItem={jumpToChecklistItem}
                            setShowAllChecklistChips={setShowAllChecklistChips}
                            focusSection={focusSection}
                        />
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
                                <ScriptMetadataBasicSection
                                    t={t}
                                    title={title}
                                    setTitle={setTitle}
                                    identity={identity}
                                    setIdentity={setIdentity}
                                    currentUser={currentUser}
                                    personas={personas}
                                    orgs={orgs}
                                    selectedOrgId={selectedOrgId}
                                    setSelectedOrgId={setSelectedOrgId}
                                    status={status}
                                    setStatus={setStatus}
                                    date={date}
                                    setDate={setDate}
                                    synopsis={synopsis}
                                    setSynopsis={setSynopsis}
                                    outline={outline}
                                    setOutline={setOutline}
                                    roleSetting={roleSetting}
                                    setRoleSetting={setRoleSetting}
                                    backgroundInfo={backgroundInfo}
                                    setBackgroundInfo={setBackgroundInfo}
                                    performanceInstruction={performanceInstruction}
                                    setPerformanceInstruction={setPerformanceInstruction}
                                    openingIntro={openingIntro}
                                    setOpeningIntro={setOpeningIntro}
                                    environmentInfo={environmentInfo}
                                    setEnvironmentInfo={setEnvironmentInfo}
                                    situationInfo={situationInfo}
                                    setSituationInfo={setSituationInfo}
                                    requiredErrorMap={requiredErrorMap}
                                    recommendedErrorMap={recommendedErrorMap}
                                    missingRequiredMap={missingRequiredMap}
                                />

                                <ScriptMetadataPublishSection
                                    t={t}
                                    missingRequiredMap={missingRequiredMap}
                                    requiredErrorMap={requiredErrorMap}
                                    targetAudience={targetAudience}
                                    handleSetTargetAudience={handleSetTargetAudience}
                                    contentRating={contentRating}
                                    handleSetContentRating={handleSetContentRating}
                                    licenseCommercial={licenseCommercial}
                                    setLicenseCommercial={setLicenseCommercial}
                                    licenseDerivative={licenseDerivative}
                                    setLicenseDerivative={setLicenseDerivative}
                                    licenseNotify={licenseNotify}
                                    setLicenseNotify={setLicenseNotify}
                                    publishNewTerm={publishNewTerm}
                                    setPublishNewTerm={setPublishNewTerm}
                                    addLicenseSpecialTerm={addLicenseSpecialTerm}
                                    licenseSpecialTerms={licenseSpecialTerms}
                                    removeLicenseSpecialTerm={removeLicenseSpecialTerm}
                                    copyright={copyright}
                                    setCopyright={setCopyright}
                                    renderRowLabel={renderRowLabel}
                                />

                                <ScriptMetadataExposureSection
                                    t={t}
                                    title={title}
                                    author={author}
                                    setAuthor={setAuthor}
                                    authorDisplayMode={authorDisplayMode}
                                    setAuthorDisplayMode={setAuthorDisplayMode}
                                    getRowLabelClass={getRowLabelClass}
                                    coverUrl={coverUrl}
                                    setCoverUrl={setCoverUrl}
                                    handleCoverUpload={handleCoverUpload}
                                    setIsMediaPickerOpen={(open) => {
                                        if (open) setMediaPickerTarget("cover");
                                        setIsMediaPickerOpen(open);
                                    }}
                                    coverUploadError={coverUploadError}
                                    coverUploadWarning={coverUploadWarning}
                                    coverPreviewFailed={coverPreviewFailed}
                                    setCoverPreviewFailed={setCoverPreviewFailed}
                                    recommendedErrorMap={recommendedErrorMap}
                                    seriesExpanded={seriesExpanded}
                                    setSeriesExpanded={setSeriesExpanded}
                                    setSeriesId={setSeriesId}
                                    setSeriesName={setSeriesName}
                                    setSeriesOrder={setSeriesOrder}
                                    setQuickSeriesName={setQuickSeriesName}
                                    setShowSeriesQuickCreate={setShowSeriesQuickCreate}
                                    focusSeriesSelect={focusSeriesSelect}
                                    seriesId={seriesId}
                                    seriesOptions={seriesOptions}
                                    showSeriesQuickCreate={showSeriesQuickCreate}
                                    quickSeriesName={quickSeriesName}
                                    handleQuickCreateSeries={handleQuickCreateSeries}
                                    isCreatingSeries={isCreatingSeries}
                                    seriesOrder={seriesOrder}
                                    newTagInput={newTagInput}
                                    setNewTagInput={setNewTagInput}
                                    handleAddTag={handleAddTag}
                                    currentTags={currentTags}
                                    handleRemoveTag={handleRemoveTag}
                                />

                                <ScriptMetadataActivitySection
                                    t={t}
                                    getRowLabelClass={getRowLabelClass}
                                    activityName={activityName}
                                    setActivityName={setActivityName}
                                    activityBannerUrl={activityBannerUrl}
                                    setActivityBannerUrl={setActivityBannerUrl}
                                    handleActivityBannerUpload={handleActivityBannerUpload}
                                    onOpenActivityBannerMediaPicker={() => {
                                        setMediaPickerTarget("activityBanner");
                                        setIsMediaPickerOpen(true);
                                    }}
                                    activityBannerPreviewFailed={activityBannerPreviewFailed}
                                    setActivityBannerPreviewFailed={setActivityBannerPreviewFailed}
                                    activityBannerUploadError={activityBannerUploadError}
                                    activityBannerUploadWarning={activityBannerUploadWarning}
                                    activityContent={activityContent}
                                    setActivityContent={setActivityContent}
                                    activityDemoUrl={activityDemoUrl}
                                    setActivityDemoUrl={setActivityDemoUrl}
                                    activityWorkUrl={activityWorkUrl}
                                    setActivityWorkUrl={setActivityWorkUrl}
                                />

                                <ScriptMetadataAdvancedSection
                                    t={t}
                                    getRowLabelClass={getRowLabelClass}
                                    markerThemeId={markerThemeId}
                                    setMarkerThemeId={setMarkerThemeId}
                                    markerThemes={markerThemes}
                                    showMarkerLegend={showMarkerLegend}
                                    setShowMarkerLegend={setShowMarkerLegend}
                                    disableCopy={disableCopy}
                                    setDisableCopy={setDisableCopy}
                                    metadataDetailsCommonProps={metadataDetailsCommonProps}
                                    jsonMode={jsonMode}
                                    setJsonMode={setJsonMode}
                                    jsonText={jsonText}
                                    setJsonText={setJsonText}
                                    jsonError={jsonError}
                                    applyJson={applyJson}
                                />
                            </div>
                        )}
                    </div>
                </div>
                <MediaPicker
                    open={isMediaPickerOpen}
                    onOpenChange={setIsMediaPickerOpen}
                    cropPurpose={mediaPickerTarget === "activityBanner" ? "banner" : "cover"}
                    onSelect={(url) => {
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
                    }}
                />
                <ImageCropDialog
                    open={cropOpen}
                    onOpenChange={setCropOpen}
                    source={cropSource}
                    purpose={cropPurpose}
                    onConfirm={async (croppedFile) => {
                        await applyCroppedUpload(croppedFile, cropTarget);
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
        <SpotlightGuideOverlay
            open={showGuide && Boolean(currentGuide)}
            zIndex={240}
            spotlightRect={guideSpotlightRect}
            currentStep={guideIndex + 1}
            totalSteps={guideSteps.length}
            title={currentGuide?.title}
            description={currentGuide?.description}
            onSkip={finishGuide}
            skipLabel={t("scriptMetadataDialog.guideSkip")}
            onPrev={handleGuidePrev}
            prevLabel={t("scriptMetadataDialog.guidePrev")}
            prevDisabled={guideIndex === 0}
            onNext={handleGuideNext}
            nextLabel={guideIndex === guideSteps.length - 1 ? t("scriptMetadataDialog.guideDone") : t("scriptMetadataDialog.guideNext")}
        />
        <PersonaSetupDialog
            t={t}
            open={showPersonaSetupDialog}
            onOpenChange={setShowPersonaSetupDialog}
            onGoProfile={handleGoToAuthorProfile}
        />
        </>
    );
}
