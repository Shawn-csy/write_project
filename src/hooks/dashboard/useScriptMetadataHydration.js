import { useCallback } from "react";
import { getScript } from "../../lib/api/scripts";
import { extractMetadataWithRaw } from "../../lib/metadataParser";
import { parseBasicLicenseFromMeta } from "../../lib/licenseRights";
import { buildCustomFieldsFromRawEntries } from "./scriptMetadataUtils";

export function useScriptMetadataHydration({
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
}) {
  return useCallback(
    async (baseScript) => {
      if (!baseScript) return;

      setTitle(baseScript.title || "");
      setCoverUrl(baseScript.coverUrl || "");
      setStatus(baseScript.status || (baseScript.isPublic ? "Public" : "Private"));
      setCurrentTags(baseScript.tags || []);
      setMarkerThemeId(baseScript.markerThemeId || "default");
      setShowMarkerLegend(false);
      setDisableCopy(baseScript.disableCopy || false);

      if (baseScript.tags) {
        const tagNames = baseScript.tags.map((tag) => String(tag.name || "").toLowerCase());
        if (tagNames.includes("男性向")) setTargetAudience("男性向");
        else if (tagNames.includes("女性向")) setTargetAudience("女性向");
        else if (tagNames.includes("一般向")) setTargetAudience("一般向");

        if (tagNames.includes("r-18") || tagNames.includes("r18") || tagNames.includes("18+") || tagNames.includes("成人向")) {
          setContentRating("成人向");
        } else if (tagNames.includes("一般") || tagNames.includes("一般內容") || tagNames.includes("全年齡向")) {
          setContentRating("全年齡向");
        }
      }

      if (baseScript.personaId) {
        setIdentity(`persona:${baseScript.personaId}`);
        setSelectedOrgId(baseScript.organizationId || "");
      } else {
        const preferredPersonaId = localStorage.getItem("preferredPersonaId");
        setIdentity(preferredPersonaId ? `persona:${preferredPersonaId}` : "");
        setSelectedOrgId("");
      }

      let sourceScript = baseScript;
      let content = baseScript.content;

      if (baseScript.id) {
        try {
          const full = await getScript(baseScript.id);
          if (full) {
            sourceScript = full;
            content = full.content || content;
            setTitle(full.title || "");
            setCoverUrl(full.coverUrl || "");
            setStatus(full.status || (full.isPublic ? "Public" : "Private"));
            setMarkerThemeId(full.markerThemeId || "default");
            setDisableCopy(full.disableCopy || false);
            await loadPublicInfoIfNeeded(full);
          }
        } catch (error) {
          console.error(error);
        }
      }

      await loadPublicInfoIfNeeded(sourceScript);

      if (!content) {
        setIsInitializing(false);
        return;
      }

      const { meta, rawEntries } = extractMetadataWithRaw(content);
      setTitle((prev) => prev || meta.title || "");
      const resolvedAuthor = sourceScript.author || meta.author || meta.authors || "";
      setAuthor(resolvedAuthor);
      const rawAuthorDisplayMode = String(meta.authordisplaymode || meta.authorDisplayMode || "").trim().toLowerCase();
      if (rawAuthorDisplayMode === "override" || rawAuthorDisplayMode === "badge") {
        setAuthorDisplayMode(rawAuthorDisplayMode);
      } else {
        setAuthorDisplayMode(String(resolvedAuthor || "").trim() ? "override" : "badge");
      }
      setDate(sourceScript.draftDate || meta.date || meta.draftdate || "");
      setContact(meta.contact || "");
      setSynopsis(meta.synopsis || meta.summary || meta.description || meta.notes || "");
      setOutline(meta.outline || "");
      setRoleSetting(meta.rolesetting || "");
      setBackgroundInfo(meta.backgroundinfo || "");
      setPerformanceInstruction(meta.performanceinstruction || "");
      setOpeningIntro(meta.openingintro || meta.setting || meta.settingintro || "");
      setEnvironmentInfo(meta.environmentinfo || meta.background || meta.backgroundintro || "");
      setSituationInfo(meta.situationinfo || "");
      setActivityName(String(meta.activityname || meta.eventname || ""));
      setActivityBannerUrl(String(meta.activitybanner || meta.eventbanner || ""));
      setActivityContent(String(meta.activitycontent || meta.eventcontent || ""));
      setActivityDemoUrl(String(meta.activitydemourl || meta.eventdemolink || ""));
      setActivityWorkUrl(String(meta.activityworkurl || meta.eventworklink || ""));
      setSeriesName(String(meta.series || meta.seriesname || sourceScript?.series?.name || ""));
      setSeriesId(sourceScript?.seriesId || "");
      setSeriesOrder(String(meta.seriesorder ?? sourceScript?.seriesOrder ?? ""));

      if (meta.marker_legend !== undefined) setShowMarkerLegend(String(meta.marker_legend) === "true");
      else if (meta.show_legend !== undefined) setShowMarkerLegend(String(meta.show_legend) === "true");

      if (!sourceScript.coverUrl && (meta.cover || meta.coverurl)) {
        setCoverUrl(meta.cover || meta.coverurl);
      }

      const basicLicense = parseBasicLicenseFromMeta(meta);
      setLicenseCommercial(basicLicense.commercialUse || "");
      setLicenseDerivative(basicLicense.derivativeUse || "");
      setLicenseNotify(basicLicense.notifyOnModify || "");
      setLicenseSpecialTerms(ensureList(meta.licensespecialterms || meta.licenseSpecialTerms));
      setCopyright(meta.copyright || "");

      if (!userEditedRef.current && (customFields || []).length === 0) {
        setCustomFields(buildCustomFieldsFromRawEntries(rawEntries));
      }

      setIsInitializing(false);
    },
    [
      customFields,
      ensureList,
      loadPublicInfoIfNeeded,
      setAuthor,
      setAuthorDisplayMode,
      setBackgroundInfo,
      setContact,
      setContentRating,
      setCopyright,
      setCoverUrl,
      setCurrentTags,
      setCustomFields,
      setDate,
      setDisableCopy,
      setEnvironmentInfo,
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
      setRoleSetting,
      setSelectedOrgId,
      setSeriesId,
      setSeriesName,
      setSeriesOrder,
      setActivityName,
      setActivityBannerUrl,
      setActivityContent,
      setActivityDemoUrl,
      setActivityWorkUrl,
      setShowMarkerLegend,
      setSituationInfo,
      setStatus,
      setSynopsis,
      setTargetAudience,
      setTitle,
      userEditedRef,
    ]
  );
}
