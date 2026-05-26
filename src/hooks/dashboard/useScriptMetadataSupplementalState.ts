import { useCallback, useReducer, useState } from "react";
import type { ContactField, CustomField, LicenseSpecialTerm } from "./types";

interface ActivityDemoLinkItem {
  id: string;
  name: string;
  url: string;
  cast: string;
  description: string;
}

interface MarkerThemeItem {
  id: string;
  name: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// License reducer — 5 fields always updated together during hydration/persona sync
// ---------------------------------------------------------------------------

interface LicenseState {
  licenseCommercial: string;
  licenseDerivative: string;
  licenseNotify: string;
  licenseSpecialTerms: LicenseSpecialTerm[];
  copyright: string;
}

type LicenseAction =
  | { type: "setCommercial"; value: string | ((prev: string) => string) }
  | { type: "setDerivative"; value: string | ((prev: string) => string) }
  | { type: "setNotify"; value: string | ((prev: string) => string) }
  | { type: "setSpecialTerms"; value: LicenseSpecialTerm[] | ((prev: LicenseSpecialTerm[]) => LicenseSpecialTerm[]) }
  | { type: "setCopyright"; value: string };

const LICENSE_INIT: LicenseState = {
  licenseCommercial: "",
  licenseDerivative: "",
  licenseNotify: "",
  licenseSpecialTerms: [],
  copyright: "",
};

function licenseReducer(state: LicenseState, action: LicenseAction): LicenseState {
  switch (action.type) {
    case "setCommercial": {
      const next = typeof action.value === "function" ? action.value(state.licenseCommercial) : action.value;
      return next === state.licenseCommercial ? state : { ...state, licenseCommercial: next };
    }
    case "setDerivative": {
      const next = typeof action.value === "function" ? action.value(state.licenseDerivative) : action.value;
      return next === state.licenseDerivative ? state : { ...state, licenseDerivative: next };
    }
    case "setNotify": {
      const next = typeof action.value === "function" ? action.value(state.licenseNotify) : action.value;
      return next === state.licenseNotify ? state : { ...state, licenseNotify: next };
    }
    case "setSpecialTerms": {
      const next = typeof action.value === "function" ? action.value(state.licenseSpecialTerms) : action.value;
      return next === state.licenseSpecialTerms ? state : { ...state, licenseSpecialTerms: next };
    }
    case "setCopyright":
      return action.value === state.copyright ? state : { ...state, copyright: action.value };
  }
}

// ---------------------------------------------------------------------------
// Series reducer — 7 fields updated together during hydration/series sync
// ---------------------------------------------------------------------------

interface SeriesState {
  seriesName: string;
  seriesId: string | null;
  seriesOrder: string;
  seriesExpanded: boolean;
  showSeriesQuickCreate: boolean;
  quickSeriesName: string;
  isCreatingSeries: boolean;
}

type SeriesAction =
  | { type: "setName"; value: string }
  | { type: "setId"; value: string | null }
  | { type: "setOrder"; value: string }
  | { type: "setExpanded"; value: boolean | ((prev: boolean) => boolean) }
  | { type: "setShowQuickCreate"; value: boolean | ((prev: boolean) => boolean) }
  | { type: "setQuickName"; value: string }
  | { type: "setIsCreating"; value: boolean };

const SERIES_INIT: SeriesState = {
  seriesName: "",
  seriesId: "",
  seriesOrder: "",
  seriesExpanded: false,
  showSeriesQuickCreate: false,
  quickSeriesName: "",
  isCreatingSeries: false,
};

function seriesReducer(state: SeriesState, action: SeriesAction): SeriesState {
  switch (action.type) {
    case "setName":     return action.value === state.seriesName ? state : { ...state, seriesName: action.value };
    case "setId":       return action.value === state.seriesId ? state : { ...state, seriesId: action.value };
    case "setOrder":    return action.value === state.seriesOrder ? state : { ...state, seriesOrder: action.value };
    case "setExpanded": {
      const next = typeof action.value === "function" ? action.value(state.seriesExpanded) : action.value;
      return next === state.seriesExpanded ? state : { ...state, seriesExpanded: next };
    }
    case "setShowQuickCreate": {
      const next = typeof action.value === "function" ? action.value(state.showSeriesQuickCreate) : action.value;
      return next === state.showSeriesQuickCreate ? state : { ...state, showSeriesQuickCreate: next };
    }
    case "setQuickName":  return action.value === state.quickSeriesName ? state : { ...state, quickSeriesName: action.value };
    case "setIsCreating": return action.value === state.isCreatingSeries ? state : { ...state, isCreatingSeries: action.value };
  }
}

// ---------------------------------------------------------------------------
// Activity reducer — 5 fields updated together during hydration/JSON import
// ---------------------------------------------------------------------------

interface ActivityState {
  activityName: string;
  activityBannerUrl: string;
  activityContent: string;
  activityDemoLinks: ActivityDemoLinkItem[];
  activityWorkUrl: string;
}

type ActivityAction =
  | { type: "setName"; value: string }
  | { type: "setBannerUrl"; value: string }
  | { type: "setContent"; value: string }
  | { type: "setDemoLinks"; value: ActivityDemoLinkItem[] | ((prev: ActivityDemoLinkItem[]) => ActivityDemoLinkItem[]) }
  | { type: "setWorkUrl"; value: string };

const ACTIVITY_INIT: ActivityState = {
  activityName: "",
  activityBannerUrl: "",
  activityContent: "",
  activityDemoLinks: [],
  activityWorkUrl: "",
};

function activityReducer(state: ActivityState, action: ActivityAction): ActivityState {
  switch (action.type) {
    case "setName":      return action.value === state.activityName ? state : { ...state, activityName: action.value };
    case "setBannerUrl": return action.value === state.activityBannerUrl ? state : { ...state, activityBannerUrl: action.value };
    case "setContent":   return action.value === state.activityContent ? state : { ...state, activityContent: action.value };
    case "setDemoLinks": {
      const next = typeof action.value === "function" ? action.value(state.activityDemoLinks) : action.value;
      return next === state.activityDemoLinks ? state : { ...state, activityDemoLinks: next };
    }
    case "setWorkUrl":   return action.value === state.activityWorkUrl ? state : { ...state, activityWorkUrl: action.value };
  }
}

// ---------------------------------------------------------------------------
// Main hook — reducers for batch-updated groups, useState for solo fields
// ---------------------------------------------------------------------------

export function useScriptMetadataSupplementalState() {
  const [licenseState, dispatchLicense] = useReducer(licenseReducer, LICENSE_INIT);
  const [seriesState, dispatchSeries] = useReducer(seriesReducer, SERIES_INIT);
  const [activityState, dispatchActivity] = useReducer(activityReducer, ACTIVITY_INIT);

  const [coverUrl, setCoverUrl] = useState("");
  const [coverCrop, setCoverCrop] = useState<{ cx?: number; cy?: number; zoom?: number } | null>(null);
  const [author, setAuthor] = useState("");
  const [authorDisplayMode, setAuthorDisplayMode] = useState("badge");
  const [date, setDate] = useState("");
  const [contact, setContact] = useState("");
  const [contactFields, setContactFields] = useState<ContactField[]>([]);
  const [synopsis, setSynopsis] = useState("");
  const [outline, setOutline] = useState("");
  const [roleSetting, setRoleSetting] = useState("");
  const [backgroundInfo, setBackgroundInfo] = useState("");
  const [performanceInstruction, setPerformanceInstruction] = useState("");
  const [openingIntro, setOpeningIntro] = useState("");
  const [chapterSettings, setChapterSettings] = useState("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [publishNewTerm, setPublishNewTerm] = useState("");
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [coverPreviewFailed, setCoverPreviewFailed] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState("");
  const [coverUploadWarning, setCoverUploadWarning] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [contentRating, setContentRating] = useState("");
  const [markerThemes, setMarkerThemes] = useState<MarkerThemeItem[]>([]);
  const [markerThemeId, setMarkerThemeId] = useState("default");
  const [showMarkerLegend, setShowMarkerLegend] = useState(false);
  const [disableCopy, setDisableCopy] = useState(false);
  const [dragDisabled, setDragDisabled] = useState(false);

  // Stable dispatch wrappers — memoized so callers that receive them as deps
  // (e.g. useScriptMetadataHydration's large useCallback) don't rebuild needlessly.
  const setLicenseCommercial = useCallback((v: string | ((prev: string) => string)) => dispatchLicense({ type: "setCommercial", value: v }), []);
  const setLicenseDerivative = useCallback((v: string | ((prev: string) => string)) => dispatchLicense({ type: "setDerivative", value: v }), []);
  const setLicenseNotify = useCallback((v: string | ((prev: string) => string)) => dispatchLicense({ type: "setNotify", value: v }), []);
  const setLicenseSpecialTerms = useCallback((v: LicenseSpecialTerm[] | ((prev: LicenseSpecialTerm[]) => LicenseSpecialTerm[])) => dispatchLicense({ type: "setSpecialTerms", value: v }), []);
  const setCopyright = useCallback((v: string) => dispatchLicense({ type: "setCopyright", value: v }), []);

  const setSeriesName = useCallback((v: string) => dispatchSeries({ type: "setName", value: v }), []);
  const setSeriesId = useCallback((v: string | null) => dispatchSeries({ type: "setId", value: v }), []);
  const setSeriesOrder = useCallback((v: string) => dispatchSeries({ type: "setOrder", value: v }), []);
  const setSeriesExpanded = useCallback((v: boolean | ((prev: boolean) => boolean)) => dispatchSeries({ type: "setExpanded", value: v }), []);
  const setShowSeriesQuickCreate = useCallback((v: boolean | ((prev: boolean) => boolean)) => dispatchSeries({ type: "setShowQuickCreate", value: v }), []);
  const setQuickSeriesName = useCallback((v: string) => dispatchSeries({ type: "setQuickName", value: v }), []);
  const setIsCreatingSeries = useCallback((v: boolean) => dispatchSeries({ type: "setIsCreating", value: v }), []);

  const setActivityName = useCallback((v: string) => dispatchActivity({ type: "setName", value: v }), []);
  const setActivityBannerUrl = useCallback((v: string) => dispatchActivity({ type: "setBannerUrl", value: v }), []);
  const setActivityContent = useCallback((v: string) => dispatchActivity({ type: "setContent", value: v }), []);
  const setActivityDemoLinks = useCallback((v: ActivityDemoLinkItem[] | ((prev: ActivityDemoLinkItem[]) => ActivityDemoLinkItem[])) => dispatchActivity({ type: "setDemoLinks", value: v }), []);
  const setActivityWorkUrl = useCallback((v: string) => dispatchActivity({ type: "setWorkUrl", value: v }), []);

  return {
    coverUrl, setCoverUrl, coverCrop, setCoverCrop,
    author, setAuthor,
    authorDisplayMode, setAuthorDisplayMode,
    date, setDate,
    contact, setContact,
    contactFields, setContactFields,
    synopsis, setSynopsis,
    outline, setOutline,
    roleSetting, setRoleSetting,
    backgroundInfo, setBackgroundInfo,
    performanceInstruction, setPerformanceInstruction,
    openingIntro, setOpeningIntro,
    chapterSettings, setChapterSettings,
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

    // License group
    licenseCommercial: licenseState.licenseCommercial,
    licenseDerivative: licenseState.licenseDerivative,
    licenseNotify: licenseState.licenseNotify,
    licenseSpecialTerms: licenseState.licenseSpecialTerms,
    copyright: licenseState.copyright,
    setLicenseCommercial,
    setLicenseDerivative,
    setLicenseNotify,
    setLicenseSpecialTerms,
    setCopyright,

    // Series group
    seriesName: seriesState.seriesName,
    seriesId: seriesState.seriesId,
    seriesOrder: seriesState.seriesOrder,
    seriesExpanded: seriesState.seriesExpanded,
    showSeriesQuickCreate: seriesState.showSeriesQuickCreate,
    quickSeriesName: seriesState.quickSeriesName,
    isCreatingSeries: seriesState.isCreatingSeries,
    setSeriesName,
    setSeriesId,
    setSeriesOrder,
    setSeriesExpanded,
    setShowSeriesQuickCreate,
    setQuickSeriesName,
    setIsCreatingSeries,

    // Activity group
    activityName: activityState.activityName,
    activityBannerUrl: activityState.activityBannerUrl,
    activityContent: activityState.activityContent,
    activityDemoLinks: activityState.activityDemoLinks,
    activityWorkUrl: activityState.activityWorkUrl,
    setActivityName,
    setActivityBannerUrl,
    setActivityContent,
    setActivityDemoLinks,
    setActivityWorkUrl,
  };
}
