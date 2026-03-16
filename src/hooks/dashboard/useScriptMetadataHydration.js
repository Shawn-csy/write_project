import { useCallback } from "react";
import { getScript } from "../../lib/api/scripts";
import { parseBasicLicenseFromMeta } from "../../lib/licenseRights";
import { buildCustomFieldsFromRawEntries } from "./scriptMetadataUtils";
import { customMetadataEntriesToMeta, customMetadataEntriesToRawEntries } from "../../lib/customMetadata";
import { parseActivityDemoLinks } from "../../lib/activityDemoLinks";

export function useScriptMetadataHydration({
  fetchFullScript = true,
  disableAuthorAutofill = false,
  disablePersonaAutofill = false,
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
        else if (tagNames.includes("全性向")) setTargetAudience("全性向");

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
        const preferredPersonaId = disablePersonaAutofill ? "" : localStorage.getItem("preferredPersonaId");
        setIdentity(preferredPersonaId ? `persona:${preferredPersonaId}` : "");
        setSelectedOrgId("");
      }

      let sourceScript = baseScript;

      if (fetchFullScript && baseScript.id) {
        try {
          const full = await getScript(baseScript.id);
          if (full) {
            sourceScript = full;
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

      const rawEntries = customMetadataEntriesToRawEntries(sourceScript.customMetadata || []);
      const meta = customMetadataEntriesToMeta(sourceScript.customMetadata || []);
      setTitle((prev) => prev || sourceScript.title || meta.title || "");
      const resolvedAuthor = sourceScript.author || meta.author || meta.authors || "";
      const rawAuthorDisplayMode = String(meta.authordisplaymode || meta.authorDisplayMode || "").trim().toLowerCase();
      const resolvedAuthorDisplayMode =
        rawAuthorDisplayMode === "override" || rawAuthorDisplayMode === "badge"
          ? rawAuthorDisplayMode
          : (String(resolvedAuthor || "").trim() ? "override" : "badge");
      if (disableAuthorAutofill) {
        setAuthor("");
        setAuthorDisplayMode("badge");
      } else {
        setAuthor(resolvedAuthor);
        setAuthorDisplayMode(resolvedAuthorDisplayMode);
      }
      setDate(sourceScript.draftDate || "");
      setContact(meta.contact || "");
      setSynopsis(meta.synopsis || meta.summary || meta.description || meta.notes || "");
      setOutline(meta.outline || "");
      setRoleSetting(meta.rolesetting || "");
      setBackgroundInfo(meta.backgroundinfo || "");
      setPerformanceInstruction(meta.performanceinstruction || "");
      setOpeningIntro(meta.openingintro || meta.setting || meta.settingintro || "");
      setChapterSettings(meta.chaptersettings || "");
      setActivityName(String(meta.activityname || meta.eventname || ""));
      setActivityBannerUrl(String(meta.activitybanner || meta.eventbanner || ""));
      setActivityContent(String(meta.activitycontent || meta.eventcontent || ""));
      const parsedDemoLinks = parseActivityDemoLinks(meta.activitydemolinks || meta.eventdemolinks);
      if (parsedDemoLinks.length > 0) {
        setActivityDemoLinks(parsedDemoLinks);
      } else {
        const legacyDemoUrl = String(meta.activitydemourl || meta.eventdemolink || "").trim();
        setActivityDemoLinks(legacyDemoUrl ? [{ id: "demo-1", name: "", url: legacyDemoUrl, cast: "", description: "" }] : []);
      }
      setActivityWorkUrl(String(meta.activityworkurl || meta.eventworklink || ""));
      setSeriesName(String(meta.series || meta.seriesname || sourceScript?.series?.name || ""));
      setSeriesId(sourceScript?.seriesId || "");
      setSeriesOrder(String(meta.seriesorder ?? sourceScript?.seriesOrder ?? ""));

      if (meta.marker_legend !== undefined) setShowMarkerLegend(String(meta.marker_legend) === "true");
      else if (meta.show_legend !== undefined) setShowMarkerLegend(String(meta.show_legend) === "true");

      const basicLicense = parseBasicLicenseFromMeta(meta);
      const nextCommercial = String(sourceScript.licenseCommercial || basicLicense.commercialUse || "").trim();
      const nextDerivative = String(sourceScript.licenseDerivative || basicLicense.derivativeUse || "").trim();
      const nextNotify = String(sourceScript.licenseNotify || basicLicense.notifyOnModify || "").trim();
      const nextSpecialTerms = ensureList(meta.licensespecialterms || meta.licenseSpecialTerms);

      setLicenseCommercial((prev) => nextCommercial || prev || "");
      setLicenseDerivative((prev) => nextDerivative || prev || "");
      setLicenseNotify((prev) => nextNotify || prev || "");
      setLicenseSpecialTerms((prev) => {
        if (Array.isArray(nextSpecialTerms) && nextSpecialTerms.length > 0) return nextSpecialTerms;
        return Array.isArray(prev) ? prev : [];
      });
      setCopyright(meta.copyright || "");

      if (!userEditedRef.current && (customFields || []).length === 0) {
        setCustomFields(buildCustomFieldsFromRawEntries(rawEntries));
      }

      setIsInitializing(false);
    },
    [
      customFields,
      disableAuthorAutofill,
      disablePersonaAutofill,
      fetchFullScript,
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
      userEditedRef,
    ]
  );
}
