import { useCallback, useState } from "react";
import { updateScript, addTagToScript, removeTagFromScript, getScript } from "../../lib/api/scripts";
import { createTag } from "../../lib/api/tags";
import { writeMetadata } from "../../lib/metadataParser";
import { deriveSimpleLicenseTags } from "../../lib/licenseRights";
import { AUDIENCE_TAG_GROUP, RATING_TAG_GROUP, syncGroupedTagSelection } from "./tagGroupUtils";

export function useScriptMetadataSave({
  t,
  toast,
  script,
  activeScript,
  title,
  coverUrl,
  status,
  author,
  date,
  outline,
  roleSetting,
  backgroundInfo,
  performanceInstruction,
  openingIntro,
  environmentInfo,
  situationInfo,
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
}) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setShowValidationHints(true);
    if (needsPersonaBeforePublish) {
      toast({
        title: t("scriptMetadataDialog.selectIdentityFirst", "請先選擇作者"),
        description: t("scriptMetadataDialog.selectIdentityToPublish", "公開前需要作者身份，可直接在下方快速建立。"),
        variant: "destructive",
      });
      setActiveTab("basic");
      if (!hasAnyPersona) {
        setShowPersonaSetupDialog(true);
      }
      return;
    }
    if (!identity || !identity.startsWith("persona:")) {
      toast({
        title: !hasAnyPersona
          ? t("scriptMetadataDialog.noPersonaYet", "尚未建立作者身份")
          : t("scriptMetadataDialog.selectIdentityFirst"),
        description: !hasAnyPersona
          ? t("scriptMetadataDialog.noPersonaYetDesc", "先建立一個作者身份，之後即可在這裡選擇並套用到劇本。")
          : undefined,
        variant: "destructive",
      });
      setActiveTab("basic");
      if (!hasAnyPersona) {
        setShowPersonaSetupDialog(true);
      }
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
      let tagsToSave = [...currentTags];
      if (targetAudience) {
        tagsToSave = await syncGroupedTagSelection({
          currentTags: tagsToSave,
          availableTags,
          selectedName: targetAudience,
          groupNames: AUDIENCE_TAG_GROUP,
          createTag,
          resolveColor: () => "bg-gray-500",
        });
      }
      if (contentRating) {
        tagsToSave = await syncGroupedTagSelection({
          currentTags: tagsToSave,
          availableTags,
          selectedName: contentRating,
          groupNames: RATING_TAG_GROUP,
          createTag,
          resolveColor: (name) => (name === "成人向" ? "bg-red-500" : "bg-gray-500"),
        });
      }

      const workingScript = activeScript || script;
      let content = workingScript?.content;
      if (!content && workingScript?.id) {
        const full = await getScript(workingScript.id);
        content = full.content;
      }

      const orderedEntries = [];
      if (title) orderedEntries.push({ key: "Title", value: title });
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
          ? JSON.stringify(Object.fromEntries(contactFields.filter((field) => field.key).map((field) => [field.key, field.value])))
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

      (customFields || []).forEach(({ key, value, type }) => {
        if (type === "divider") {
          orderedEntries.push({ key, value: value || "SECTION" });
        } else if (key && value) {
          orderedEntries.push({ key, value });
        }
      });

      if (showMarkerLegend) {
        orderedEntries.push({ key: "marker_legend", value: "true" });
      }

      const finalContent = writeMetadata(content, orderedEntries);

      const updatePayload = {
        title,
        coverUrl,
        status,
        content: finalContent,
        author,
        draftDate: date,
        isPublic: status === "Public",
        personaId: identity.split(":")[1],
        organizationId: selectedOrgId || null,
        markerThemeId,
        showMarkerLegend,
        disableCopy,
        seriesId: seriesId || null,
        seriesOrder: Number.isFinite(Number(seriesOrder)) && Number(seriesOrder) >= 0 ? Math.floor(Number(seriesOrder)) : null,
      };

      await updateScript(workingScript.id, updatePayload);

      const originalTagIds = new Set(((workingScript && workingScript.tags) || []).map((tag) => tag.id));
      const finalTagIds = new Set(tagsToSave.map((tag) => tag.id));
      const addedTags = tagsToSave.filter((tag) => !originalTagIds.has(tag.id));
      const removedTags = ((workingScript && workingScript.tags) || []).filter((tag) => !finalTagIds.has(tag.id));

      await Promise.all([
        ...addedTags.map((tag) => addTagToScript(workingScript.id, tag.id)),
        ...removedTags.map((tag) => removeTagFromScript(workingScript.id, tag.id)),
      ]);

      onSave({
        ...(workingScript || script),
        title,
        coverUrl,
        status,
        content: finalContent,
        author,
        draftDate: date,
        tags: tagsToSave,
        markerThemeId,
        seriesId: updatePayload.seriesId,
        seriesOrder: updatePayload.seriesOrder,
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
  }, [
    activeScript,
    author,
    availableTags,
    backgroundInfo,
    contact,
    contactFields,
    contentRating,
    copyright,
    coverUrl,
    currentTags,
    customFields,
    date,
    disableCopy,
    environmentInfo,
    hasAnyPersona,
    identity,
    jumpToChecklistItem,
    licenseCommercial,
    licenseDerivative,
    licenseNotify,
    licenseSpecialTerms,
    markerThemeId,
    needsPersonaBeforePublish,
    onOpenChange,
    onSave,
    openingIntro,
    outline,
    performanceInstruction,
    publishChecklist.missingRequired,
    roleSetting,
    script,
    selectedOrgId,
    seriesId,
    seriesName,
    seriesOptions,
    seriesOrder,
    setActiveTab,
    setCurrentTags,
    setShowPersonaSetupDialog,
    setShowValidationHints,
    showMarkerLegend,
    situationInfo,
    status,
    synopsis,
    t,
    targetAudience,
    title,
    toast,
  ]);

  return {
    isSaving,
    handleSave,
  };
}
