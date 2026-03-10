import { useState } from "react";

export function useScriptMetadataSupplementalState() {
  const [coverUrl, setCoverUrl] = useState("");

  const [author, setAuthor] = useState("");
  const [authorDisplayMode, setAuthorDisplayMode] = useState("badge");
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
  const [activityName, setActivityName] = useState("");
  const [activityBannerUrl, setActivityBannerUrl] = useState("");
  const [activityContent, setActivityContent] = useState("");
  const [activityDemoUrl, setActivityDemoUrl] = useState("");
  const [activityWorkUrl, setActivityWorkUrl] = useState("");

  const [seriesName, setSeriesName] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [seriesOrder, setSeriesOrder] = useState("");
  const [seriesExpanded, setSeriesExpanded] = useState(false);
  const [showSeriesQuickCreate, setShowSeriesQuickCreate] = useState(false);
  const [quickSeriesName, setQuickSeriesName] = useState("");
  const [isCreatingSeries, setIsCreatingSeries] = useState(false);

  const [customFields, setCustomFields] = useState([]);
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

  const [markerThemes, setMarkerThemes] = useState([]);
  const [markerThemeId, setMarkerThemeId] = useState("default");
  const [showMarkerLegend, setShowMarkerLegend] = useState(false);
  const [disableCopy, setDisableCopy] = useState(false);

  const [dragDisabled, setDragDisabled] = useState(false);

  return {
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
  };
}
