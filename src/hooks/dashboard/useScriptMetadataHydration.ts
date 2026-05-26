import { useCallback } from "react";
import { fromApiToDraft } from "../../lib/scriptMetadataAdapter";
import type { ScriptLike, TagLike, CustomField, LicenseSpecialTerm } from "./types";

interface UseScriptMetadataHydrationOptions {
  disableAuthorAutofill?: boolean;
  disablePersonaAutofill?: boolean;
  customFields?: CustomField[];
  ensureList: (v: unknown) => unknown[];
  userEditedRef: { current: boolean };
  setIsInitializing: (v: boolean) => void;
  setTitle: (v: string | ((prev: string) => string)) => void;
  setCoverUrl: (v: string) => void;
  setCoverCrop: (v: { cx?: number; cy?: number; zoom?: number } | null) => void;
  setStatus: (v: string) => void;
  setCurrentTags: (v: TagLike[]) => void;
  setMarkerThemeId: (v: string) => void;
  setShowMarkerLegend: (v: boolean) => void;
  setDisableCopy: (v: boolean) => void;
  setTargetAudience: (v: string) => void;
  setContentRating: (v: string) => void;
  setIdentity: (v: string) => void;
  setSelectedOrgId: (v: string | null) => void;
  setAuthor: (v: string) => void;
  setAuthorDisplayMode: (v: string) => void;
  setDate: (v: string) => void;
  setContact: (v: string) => void;
  setSynopsis: (v: string) => void;
  setOutline: (v: string) => void;
  setRoleSetting: (v: string) => void;
  setBackgroundInfo: (v: string) => void;
  setPerformanceInstruction: (v: string) => void;
  setOpeningIntro: (v: string) => void;
  setChapterSettings: (v: string) => void;
  setActivityName: (v: string) => void;
  setActivityBannerUrl: (v: string) => void;
  setActivityContent: (v: string) => void;
  setActivityDemoLinks: (v: unknown[]) => void;
  setActivityWorkUrl: (v: string) => void;
  setSeriesName: (v: string) => void;
  setSeriesId: (v: string | null) => void;
  setSeriesOrder: (v: string | number) => void;
  setLicenseCommercial: (v: string | ((prev: string) => string)) => void;
  setLicenseDerivative: (v: string | ((prev: string) => string)) => void;
  setLicenseNotify: (v: string | ((prev: string) => string)) => void;
  setLicenseSpecialTerms: (v: LicenseSpecialTerm[] | ((prev: LicenseSpecialTerm[]) => LicenseSpecialTerm[])) => void;
  setCopyright: (v: string) => void;
  setCustomFields: (v: CustomField[]) => void;
}

export function useScriptMetadataHydration({
  disableAuthorAutofill = false,
  disablePersonaAutofill = false,
  customFields,
  ensureList: _ensureList,
  userEditedRef,
  setIsInitializing,
  setTitle,
  setCoverUrl,
  setCoverCrop,
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
  setChapterSettings,
  setActivityName,
  setActivityBannerUrl,
  setActivityContent,
  setActivityDemoLinks,
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
}: UseScriptMetadataHydrationOptions) {
  return useCallback(
    async (sourceScript: ScriptLike) => {
      if (!sourceScript) return;
      try {
        const draft = fromApiToDraft(sourceScript, {
          disableAuthorAutofill,
          disablePersonaAutofill,
          existingCustomFields: customFields,
          existingDraftTouched: userEditedRef.current,
        });

        setTitle(draft.title);
        setCoverUrl(draft.coverUrl);
        setCoverCrop(draft.coverCrop);
        setStatus(draft.status);
        setCurrentTags(draft.currentTags);
        setMarkerThemeId(draft.markerThemeId);
        setShowMarkerLegend(draft.showMarkerLegend);
        setDisableCopy(draft.disableCopy);
        setTargetAudience(draft.targetAudience);
        setContentRating(draft.contentRating);
        setIdentity(draft.personaId ? `persona:${draft.personaId}` : "");
        setSelectedOrgId(draft.organizationId);
        setAuthor(draft.author);
        setAuthorDisplayMode(draft.authorDisplayMode);
        setDate(draft.draftDate);
        setContact(draft.contact);
        setSynopsis(draft.synopsis);
        setOutline(draft.outline);
        setRoleSetting(draft.roleSetting);
        setBackgroundInfo(draft.backgroundInfo);
        setPerformanceInstruction(draft.performanceInstruction);
        setOpeningIntro(draft.openingIntro);
        setChapterSettings(draft.chapterSettings);
        setActivityName(draft.activityName);
        setActivityBannerUrl(draft.activityBannerUrl);
        setActivityContent(draft.activityContent);
        setActivityDemoLinks(draft.activityDemoLinks);
        setActivityWorkUrl(draft.activityWorkUrl);
        setSeriesName(draft.seriesName);
        setSeriesId(draft.seriesId);
        setSeriesOrder(draft.seriesOrder);
        setLicenseCommercial((prev) => draft.licenseCommercial || prev || "");
        setLicenseDerivative((prev) => draft.licenseDerivative || prev || "");
        setLicenseNotify((prev) => draft.licenseNotify || prev || "");
        setLicenseSpecialTerms((prev) => {
          if (draft.licenseSpecialTerms.length > 0) return draft.licenseSpecialTerms;
          return Array.isArray(prev) ? prev : [];
        });
        setCopyright(draft.copyright);
        setCustomFields(draft.customFields);
      } catch (error) {
        console.error("Failed to hydrate script metadata", error);
      } finally {
        setIsInitializing(false);
      }
    },
    [
      customFields,
      disableAuthorAutofill,
      disablePersonaAutofill,
      userEditedRef,
      setAuthor,
      setAuthorDisplayMode,
      setBackgroundInfo,
      setContact,
      setContentRating,
      setCoverCrop,
      setCopyright,
      setCoverUrl,
      setCurrentTags,
      setCustomFields,
      setDate,
      setDisableCopy,
      setIdentity,
      setIsInitializing,
      setLicenseCommercial,
      setLicenseDerivative,
      setLicenseNotify,
      setLicenseSpecialTerms,
      setMarkerThemeId,
      setOpeningIntro,
      setOutline,
      setPerformanceInstruction,
      setChapterSettings,
      setRoleSetting,
      setSelectedOrgId,
      setSeriesId,
      setSeriesName,
      setSeriesOrder,
      setActivityName,
      setActivityBannerUrl,
      setActivityContent,
      setActivityDemoLinks,
      setActivityWorkUrl,
      setShowMarkerLegend,
      setStatus,
      setSynopsis,
      setTargetAudience,
      setTitle,
    ]
  );
}
