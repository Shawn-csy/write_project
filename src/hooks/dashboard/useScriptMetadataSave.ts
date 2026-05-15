import { useCallback, useState } from "react";
import { updateScript, addTagToScript, removeTagFromScript } from "../../lib/api/scripts";
import { createTag } from "../../lib/api/tags";
import type { ScriptUpdatePayload, BaseScriptApi } from "../../types/api";
import { AUDIENCE_TAG_GROUP, RATING_TAG_GROUP, syncGroupedTagSelection } from "./tagGroupUtils";
import { normalizeCustomMetadataEntries } from "../../lib/customMetadata";
import { applyPreservedAuthorEntries, buildCustomMetadataEntries } from "../../lib/scriptMetadataPayload";
import type {
  ScriptLike, TagLike, ContactField, CustomField, SeriesOption,
  PublishChecklist, LicenseSpecialTerm,
} from "./types";

interface UseScriptMetadataSaveOptions {
  t: (key: string, fallback?: string) => string;
  toast: (opts: { title?: string; description?: string; variant?: string }) => void;
  script: ScriptLike | null;
  activeScript?: ScriptLike | null;
  title: string;
  coverUrl: string;
  status: string;
  author: string;
  authorDisplayMode: string;
  date: string;
  outline: string;
  roleSetting: string;
  backgroundInfo: string;
  performanceInstruction: string;
  openingIntro: string;
  chapterSettings: string;
  activityName: string;
  activityBannerUrl: string;
  activityContent: string;
  activityDemoLinks: unknown[];
  activityWorkUrl: string;
  licenseCommercial: string;
  licenseDerivative: string;
  licenseNotify: string;
  licenseSpecialTerms: LicenseSpecialTerm[];
  copyright: string;
  synopsis: string;
  contact: string;
  contactFields: ContactField[];
  customFields: CustomField[];
  seriesOptions: SeriesOption[];
  seriesId: string | null;
  seriesName: string;
  seriesOrder: string | number;
  currentTags: TagLike[];
  setCurrentTags: (tags: TagLike[]) => void;
  availableTags: TagLike[];
  markerThemeId: string;
  showMarkerLegend: boolean;
  disableCopy: boolean;
  identity: string;
  selectedOrgId: string | null;
  targetAudience: string;
  contentRating: string;
  publishChecklist: PublishChecklist;
  needsPersonaBeforePublish: boolean;
  hasAnyPersona: boolean;
  jumpToChecklistItem: (key: string) => void;
  setShowValidationHints: (v: boolean) => void;
  setShowPersonaSetupDialog: (v: boolean) => void;
  setActiveTab: (v: string) => void;
  onSave: (script: ScriptLike) => void;
  onOpenChange: (open: boolean) => void;
  saveScript?: (id: string, payload: ScriptUpdatePayload & { author?: string }, extra?: Record<string, unknown>) => Promise<BaseScriptApi>;
  syncScriptTags?: (id: string, tags: TagLike[]) => Promise<void>;
  preserveAuthorInternalData?: boolean;
  authorEditedRef?: { current?: boolean } | null;
}
export function useScriptMetadataSave({
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
  chapterSettings,
  activityName,
  activityBannerUrl,
  activityContent,
  activityDemoLinks,
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
  saveScript,
  syncScriptTags,
  preserveAuthorInternalData = false,
  authorEditedRef = { current: false },
}: UseScriptMetadataSaveOptions) {
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
          createTag: createTag as (name: string, color: string, ownerIdQuery?: string) => Promise<TagLike>,
          resolveColor: () => "bg-gray-500",
          onTagCreated: () => {},
        });
      }
      if (contentRating) {
        tagsToSave = await syncGroupedTagSelection({
          currentTags: tagsToSave,
          availableTags,
          selectedName: contentRating,
          groupNames: RATING_TAG_GROUP,
          createTag: createTag as (name: string, color: string, ownerIdQuery?: string) => Promise<TagLike>,
          resolveColor: (name) => (name === "成人向" ? "bg-red-500" : "bg-gray-500"),
          onTagCreated: () => {},
        });
      }

      const workingScript = activeScript || script;
      if (!workingScript) return;
      const workingScriptMetadata = Array.isArray(workingScript?.customMetadata) ? workingScript.customMetadata : [];
      const workingAuthorMetadataEntries = normalizeCustomMetadataEntries(workingScriptMetadata).filter((entry) => {
        const normalized = String(entry?.key || "").trim().toLowerCase().replace(/\s+/g, "");
        return normalized === "author" || normalized === "authors" || normalized === "authordisplaymode";
      });
      const authorEditedValue = (authorEditedRef as { current?: boolean } | null)?.current ?? false;
      const shouldPreserveAuthor = preserveAuthorInternalData && !authorEditedValue;
      const effectiveAuthorDisplayMode = authorDisplayMode === "override" ? "override" : "badge";
      const effectiveAuthor = String(author || "");
      const persistedAuthor = effectiveAuthorDisplayMode === "override" ? effectiveAuthor : "";

      let customMetadata = buildCustomMetadataEntries({
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
        chapterSettings,
        activityName,
        activityBannerUrl,
        activityContent,
        activityDemoLinks,
        activityWorkUrl,
        contact,
        contactFields,
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
        currentTags: tagsToSave,
        customFields,
      }, {
        preserveAuthor: shouldPreserveAuthor,
        existingAuthorEntries: workingAuthorMetadataEntries,
        seriesOptions,
      });
      if (showMarkerLegend) {
        customMetadata = normalizeCustomMetadataEntries([
          ...customMetadata,
          { key: "marker_legend", value: "true" },
        ]);
      }
      if (shouldPreserveAuthor) {
        customMetadata = applyPreservedAuthorEntries(customMetadata, workingAuthorMetadataEntries);
      }

      const updatePayload: ScriptUpdatePayload & { author?: string } = {
        title,
        coverUrl,
        status,
        customMetadata,
        draftDate: date,
        personaId: identity.split(":")[1],
        organizationId: selectedOrgId || null,
        licenseCommercial: licenseCommercial || "",
        licenseDerivative: licenseDerivative || "",
        licenseNotify: licenseNotify || "",
        markerThemeId,
        showMarkerLegend,
        disableCopy,
        seriesId: seriesId || null,
        seriesOrder: Number.isFinite(Number(seriesOrder)) && Number(seriesOrder) >= 0 ? Math.floor(Number(seriesOrder)) : null,
      };
      if (!shouldPreserveAuthor) {
        updatePayload.author = persistedAuthor;
      }

      const persisted = saveScript
        ? await saveScript(workingScript.id, updatePayload, {
            script: workingScript,
            tagIds: tagsToSave.map((tag) => Number(tag?.id)).filter((id) => Number.isFinite(id)),
          })
        : await updateScript(workingScript.id, updatePayload);

      const originalTagIds = new Set(((workingScript && workingScript.tags) || []).map((tag) => String(tag.id)));
      const finalTagIds = new Set(tagsToSave.map((tag) => String(tag.id)));
      const addedTags = tagsToSave.filter((tag) => !originalTagIds.has(String(tag.id)));
      const removedTags = ((workingScript && workingScript.tags) || []).filter((tag) => !finalTagIds.has(String(tag.id)));

      if (typeof syncScriptTags === "function") {
        await syncScriptTags(workingScript.id, tagsToSave);
      } else {
        await Promise.all([
          ...addedTags.map((tag) => addTagToScript(workingScript.id, String(tag.id))),
          ...removedTags.map((tag) => removeTagFromScript(workingScript.id, String(tag.id))),
        ]);
      }

      onSave({
        ...(workingScript || script),
        ...(persisted || {}),
        title,
        coverUrl,
        status,
        customMetadata,
        author: shouldPreserveAuthor ? String(workingScript?.author || "") : persistedAuthor,
        draftDate: date,
        licenseCommercial: licenseCommercial || "",
        licenseDerivative: licenseDerivative || "",
        licenseNotify: licenseNotify || "",
        tags: tagsToSave as Array<{ id?: string; name: string }>,
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
    authorDisplayMode,
    availableTags,
    backgroundInfo,
    contact,
    contactFields,
    contentRating,
    coverUrl,
    currentTags,
    customFields,
    date,
    disableCopy,
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
    chapterSettings,
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
    activityName,
    activityBannerUrl,
    activityContent,
    activityDemoLinks,
    activityWorkUrl,
    status,
    synopsis,
    t,
    targetAudience,
    title,
    toast,
    saveScript,
    syncScriptTags,
    preserveAuthorInternalData,
    authorEditedRef,
  ]);

  return {
    isSaving,
    handleSave,
  };
}
