/**
 * Sliced sub-contexts and Provider for ScriptMetadataDialog.
 *
 * Kept separate from ScriptMetadataDialogContext.tsx (state logic) so
 * the orchestration file stays manageable.
 */
import React, { useMemo } from "react";
import { buildPublishChecklist } from "../../../hooks/dashboard/usePublishChecklist";
import {
    useScriptMetadataDialogState,
    ScriptMetadataDialogProps,
    ScriptMetadataDialogContext,
} from "./ScriptMetadataDialogContext";

export { buildPublishChecklist };

// ---------------------------------------------------------------------------
// AllState type
// ---------------------------------------------------------------------------

type AllState = ReturnType<typeof useScriptMetadataDialogState>;

// ---------------------------------------------------------------------------
// Context value types
// ---------------------------------------------------------------------------

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

/** Checklist + guide + validation row helpers. Changes on every form field edit. */
export type ChecklistContextValue = Pick<AllState,
    "completedChecklistItems" | "totalChecklistItems" | "completionPercent" |
    "hasBlockingIssues" | "checklistChipItems" | "maxVisibleChecklistChips" |
    "hiddenChecklistChipCount" | "visibleChecklistChipItems" |
    "showAllChecklistChips" | "setShowAllChecklistChips" |
    "handleFocusSection" | "handleJumpToChecklistItem" |
    "startGuide" | "handleGuideNext" | "handleGuidePrev" | "finishGuide" |
    "guideIndex" | "guideSteps" | "guideSpotlightRect" | "currentGuide" |
    "requiredErrorMap" | "recommendedErrorMap" | "missingRequiredMap" |
    "renderRowLabel" | "getRowLabelClass"
>;
const ChecklistContext = React.createContext<ChecklistContextValue | null>(null);
export function useChecklistContext() {
    const ctx = React.useContext(ChecklistContext);
    if (!ctx) throw new Error("useChecklistContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

/** Overlay state: media picker, crop, persona dialog. Nearly static during editing. */
export type OverlayContextValue = Pick<AllState,
    "isMediaPickerOpen" | "setIsMediaPickerOpen" | "mediaPickerTarget" | "handleMediaPickerSelect" | "handleMediaPickerSelectMedia" |
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
    "currentUser" | "personas" | "orgs"
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
    "coverUrl" | "setCoverUrl" | "coverCrop" | "setCoverCrop" | "handleCoverUpload" | "openCoverMediaPicker" | "coverUploadError" |
    "coverUploadWarning" | "coverPreviewFailed" | "setCoverPreviewFailed" | "seriesExpanded" | "setSeriesExpanded" |
    "seriesId" | "setSeriesId" | "seriesName" | "setSeriesName" | "seriesOrder" | "setSeriesOrder" |
    "quickSeriesName" | "setQuickSeriesName" | "setShowSeriesQuickCreate" | "showSeriesQuickCreate" |
    "focusSeriesSelect" | "handleQuickCreateSeries" | "isCreatingSeries" | "seriesOptions" |
    "newTagInput" | "setNewTagInput" |
    "handleAddTag" | "currentTags" | "handleRemoveTag" | "markerThemeId" | "setMarkerThemeId" | "markerThemes" |
    "showMarkerLegend" | "setShowMarkerLegend" | "disableCopy" | "setDisableCopy"
>;
const ExposureContext = React.createContext<ExposureContextValue | null>(null);
export function useExposureContext() {
    const ctx = React.useContext(ExposureContext);
    if (!ctx) throw new Error("useExposureContext must be used within ScriptMetadataDialogProvider");
    return ctx;
}

/** JSON editor state. Changes only when user toggles json mode or edits json text. */
export type JsonEditorContextValue = Pick<AllState,
    "jsonMode" | "setJsonMode" | "jsonText" | "setJsonText" | "jsonError" | "applyJson"
>;
const JsonEditorContext = React.createContext<JsonEditorContextValue | null>(null);
export function useJsonEditorContext() {
    const ctx = React.useContext(JsonEditorContext);
    if (!ctx) throw new Error("useJsonEditorContext must be used within ScriptMetadataDialogProvider");
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
        isMediaPickerOpen, setIsMediaPickerOpen, mediaPickerTarget, handleMediaPickerSelect, handleMediaPickerSelectMedia,
        cropOpen, setCropOpen, cropSource, cropPurpose, cropTarget, applyCroppedUpload,
        showPersonaSetupDialog, handlePersonaSetupDialogOpenChange, handleGoToAuthorProfile,
        requiredErrorMap, recommendedErrorMap, missingRequiredMap,
        renderRowLabel, getRowLabelClass,
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
        requiredErrorMap, recommendedErrorMap, missingRequiredMap,
        renderRowLabel, getRowLabelClass,
    }), [
        completedChecklistItems, totalChecklistItems, completionPercent,
        hasBlockingIssues, checklistChipItems, maxVisibleChecklistChips,
        hiddenChecklistChipCount, visibleChecklistChipItems,
        showAllChecklistChips, setShowAllChecklistChips,
        handleFocusSection, handleJumpToChecklistItem,
        startGuide, handleGuideNext, handleGuidePrev, finishGuide,
        guideIndex, guideSteps, guideSpotlightRect, currentGuide,
        requiredErrorMap, recommendedErrorMap, missingRequiredMap,
        renderRowLabel, getRowLabelClass,
    ]);

    const overlay: OverlayContextValue = useMemo(() => ({
        isMediaPickerOpen, setIsMediaPickerOpen, mediaPickerTarget, handleMediaPickerSelect, handleMediaPickerSelectMedia,
        cropOpen, setCropOpen, cropSource, cropPurpose, cropTarget, applyCroppedUpload,
        showPersonaSetupDialog, handlePersonaSetupDialogOpenChange, handleGoToAuthorProfile,
    }), [
        isMediaPickerOpen, setIsMediaPickerOpen, mediaPickerTarget, handleMediaPickerSelect, handleMediaPickerSelectMedia,
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
        mediaPickerTarget: _mpt, handleMediaPickerSelect: _hmps, handleMediaPickerSelectMedia: _hmpm,
        cropOpen: _co, setCropOpen: _sco, cropSource: _cso, cropPurpose: _cpu,
        cropTarget: _ct, applyCroppedUpload: _acu,
        showPersonaSetupDialog: _spsd,
        handlePersonaSetupDialogOpenChange: _hpsdoc,
        handleGoToAuthorProfile: _hgtap,
        requiredErrorMap: _rem, recommendedErrorMap: _rcem, missingRequiredMap: _mrm,
        renderRowLabel: _rrl, getRowLabelClass: _grlc,
        ...form
    } = all;

    const {
        identity, setIdentity, selectedOrgId, setSelectedOrgId, targetAudience, handleSetTargetAudience, contentRating, handleSetContentRating,
        title, setTitle, author, setAuthorWithTracking, authorDisplayMode, setAuthorDisplayModeWithTracking, date, setDate,
        synopsis, setSynopsis, outline, setOutline, roleSetting, setRoleSetting, backgroundInfo, setBackgroundInfo,
        performanceInstruction, setPerformanceInstruction, openingIntro, setOpeningIntro, chapterSettings, setChapterSettings,
        contactFields, setContactFields, customFields, setCustomFields,
        metadataDetailsCommonProps, currentUser, personas, orgs,
        licenseCommercial, setLicenseCommercial, licenseDerivative, setLicenseDerivative, licenseNotify, setLicenseNotify,
        publishNewTerm, setPublishNewTerm, addLicenseSpecialTerm, licenseSpecialTerms, removeLicenseSpecialTerm,
        coverUrl, setCoverUrl, coverCrop, setCoverCrop, handleCoverUpload, openCoverMediaPicker, coverUploadError, coverUploadWarning, coverPreviewFailed, setCoverPreviewFailed,
        seriesExpanded, setSeriesExpanded, seriesId, setSeriesId, seriesName, setSeriesName, seriesOrder, setSeriesOrder,
        quickSeriesName, setQuickSeriesName, setShowSeriesQuickCreate, showSeriesQuickCreate, focusSeriesSelect, handleQuickCreateSeries,
        isCreatingSeries, seriesOptions, newTagInput, setNewTagInput, handleAddTag, currentTags, handleRemoveTag, markerThemeId, setMarkerThemeId,
        markerThemes, showMarkerLegend, setShowMarkerLegend, disableCopy, setDisableCopy,
        jsonMode, setJsonMode, jsonText, setJsonText, jsonError, applyJson,
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
        contactFields, setContactFields, customFields, setCustomFields,
        metadataDetailsCommonProps, currentUser, personas, orgs,
    }), [
        title, setTitle, author, setAuthorWithTracking, authorDisplayMode, setAuthorDisplayModeWithTracking,
        date, setDate, synopsis, setSynopsis, outline, setOutline, roleSetting, setRoleSetting, backgroundInfo,
        setBackgroundInfo, performanceInstruction, setPerformanceInstruction, openingIntro, setOpeningIntro,
        chapterSettings, setChapterSettings, contactFields, setContactFields, customFields, setCustomFields,
        metadataDetailsCommonProps, currentUser, personas, orgs,
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
        coverUrl, setCoverUrl, coverCrop, setCoverCrop, handleCoverUpload, openCoverMediaPicker, coverUploadError, coverUploadWarning,
        coverPreviewFailed, setCoverPreviewFailed, seriesExpanded, setSeriesExpanded, seriesId, setSeriesId,
        seriesName, setSeriesName, seriesOrder, setSeriesOrder, quickSeriesName, setQuickSeriesName,
        setShowSeriesQuickCreate, showSeriesQuickCreate, focusSeriesSelect, handleQuickCreateSeries,
        isCreatingSeries, seriesOptions, newTagInput, setNewTagInput, handleAddTag, currentTags, handleRemoveTag, markerThemeId, setMarkerThemeId,
        markerThemes, showMarkerLegend, setShowMarkerLegend, disableCopy, setDisableCopy,
    }), [
        coverUrl, setCoverUrl, coverCrop, setCoverCrop, handleCoverUpload, openCoverMediaPicker, coverUploadError, coverUploadWarning,
        coverPreviewFailed, setCoverPreviewFailed, seriesExpanded, setSeriesExpanded, seriesId, setSeriesId,
        seriesName, setSeriesName, seriesOrder, setSeriesOrder, quickSeriesName, setQuickSeriesName,
        setShowSeriesQuickCreate, showSeriesQuickCreate, focusSeriesSelect, handleQuickCreateSeries,
        isCreatingSeries, seriesOptions, newTagInput, setNewTagInput, handleAddTag, currentTags, handleRemoveTag, markerThemeId, setMarkerThemeId,
        markerThemes, showMarkerLegend, setShowMarkerLegend, disableCopy, setDisableCopy,
    ]);

    const jsonEditor: JsonEditorContextValue = useMemo(() => ({
        jsonMode, setJsonMode, jsonText, setJsonText, jsonError, applyJson,
    }), [jsonMode, setJsonMode, jsonText, setJsonText, jsonError, applyJson]);

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
                                            <JsonEditorContext.Provider value={jsonEditor}>
                                                <ActivityContext.Provider value={activity}>
                                                    <ScriptMetadataDialogContext.Provider value={all}>
                                                        {children}
                                                    </ScriptMetadataDialogContext.Provider>
                                                </ActivityContext.Provider>
                                            </JsonEditorContext.Provider>
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
