import { useCallback } from "react";
import { createTag } from "../../lib/api/tags";

export function useScriptMetadataJson({
  jsonText,
  t,
  availableTags,
  setJsonError,
  setTitle,
  setAuthor,
  setDate,
  setSynopsis,
  setOutline,
  setRoleSetting,
  setBackgroundInfo,
  setPerformanceInstruction,
  setOpeningIntro,
  setEnvironmentInfo,
  setSituationInfo,
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
}) {
  return useCallback(async () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError("");
      if (parsed.title !== undefined) setTitle(parsed.title);
      if (parsed.author !== undefined) setAuthor(parsed.author);
      if (parsed.authors !== undefined && !parsed.author) setAuthor(parsed.authors);
      if (parsed.date !== undefined) setDate(parsed.date);
      if (parsed.draftDate !== undefined) setDate(parsed.draftDate);
      if (parsed.synopsis !== undefined) setSynopsis(parsed.synopsis);
      if (parsed.description !== undefined && !parsed.synopsis) setSynopsis(parsed.description);
      if (parsed.outline !== undefined) setOutline(String(parsed.outline || ""));
      if (parsed.roleSetting !== undefined) setRoleSetting(String(parsed.roleSetting || ""));
      if (parsed.backgroundInfo !== undefined) setBackgroundInfo(String(parsed.backgroundInfo || ""));
      if (parsed.performanceInstruction !== undefined) setPerformanceInstruction(String(parsed.performanceInstruction || ""));
      if (parsed.openingIntro !== undefined) setOpeningIntro(String(parsed.openingIntro || ""));
      if (parsed.environmentInfo !== undefined) setEnvironmentInfo(String(parsed.environmentInfo || ""));
      if (parsed.situationInfo !== undefined) setSituationInfo(String(parsed.situationInfo || ""));
      if (parsed.contact !== undefined) setContact(parsed.contact);
      if (parsed.contactFields !== undefined || parsed.contactInfo !== undefined || parsed.contact !== undefined) {
        const cf = parsed.contactFields || parsed.contactInfo || parsed.contact;
        const next = Array.isArray(cf)
          ? cf.map((f, idx) => ({ id: `ct-${idx + 1}`, key: f.key || "", value: f.value || "" }))
          : Object.entries(cf || {}).map(([k, v], idx) => ({ id: `ct-${idx + 1}`, key: k, value: String(v ?? "") }));
        setContactFields(next);
      }
      if (parsed.licenseCommercial !== undefined) setLicenseCommercial(String(parsed.licenseCommercial || ""));
      if (parsed.licenseDerivative !== undefined) setLicenseDerivative(String(parsed.licenseDerivative || ""));
      if (parsed.licenseNotify !== undefined) setLicenseNotify(String(parsed.licenseNotify || ""));
      if (parsed.licenseSpecialTerms !== undefined) {
        try {
          const raw = typeof parsed.licenseSpecialTerms === "string"
            ? JSON.parse(parsed.licenseSpecialTerms)
            : parsed.licenseSpecialTerms;
          setLicenseSpecialTerms(Array.isArray(raw) ? raw : []);
        } catch {
          setLicenseSpecialTerms([]);
        }
      }
      if (parsed.copyright !== undefined) setCopyright(parsed.copyright);
      if (parsed.series !== undefined) setSeriesName(String(parsed.series || ""));
      if (parsed.seriesName !== undefined && parsed.series === undefined) setSeriesName(String(parsed.seriesName || ""));
      if (parsed.seriesId !== undefined) setSeriesId(String(parsed.seriesId || ""));
      if (parsed.seriesOrder !== undefined) setSeriesOrder(String(parsed.seriesOrder ?? ""));
      if (parsed.cover !== undefined) setCoverUrl(parsed.cover);
      if (parsed.status !== undefined) setStatus(parsed.status);
      if (parsed.publishAs !== undefined && String(parsed.publishAs).startsWith("persona:")) {
        setIdentity(parsed.publishAs);
      } else if (parsed.personaId) {
        setIdentity(`persona:${parsed.personaId}`);
      }
      if (parsed.selectedOrgId !== undefined) setSelectedOrgId(parsed.selectedOrgId);
      if (parsed.orgId !== undefined) setSelectedOrgId(parsed.orgId);
      const custom = parsed.custom || parsed.customFields || {};
      const next = Array.isArray(custom)
        ? custom.map((f, idx) => ({ id: `cf-${idx + 1}`, key: f.key || "", value: f.value || "" }))
        : Object.entries(custom).map(([k, v], idx) => ({ id: `cf-${idx + 1}`, key: k, value: String(v ?? "") }));
      setCustomFields(next);
      if (parsed.tags) {
        const raw = Array.isArray(parsed.tags)
          ? parsed.tags
          : String(parsed.tags).split(/[,，、#\n\t;]+/).map((tag) => tag.trim()).filter(Boolean);
        const entries = raw.map((tag) => (typeof tag === "string" ? { name: tag } : tag));
        const byName = new Map((availableTags || []).map((tag) => [tag.name.toLowerCase(), tag]));
        const resolved = [];
        for (const entry of entries) {
          const name = String(entry.name || "").trim();
          if (!name) continue;
          const existing = byName.get(name.toLowerCase());
          if (existing) {
            resolved.push(existing);
          } else {
            const created = await createTag(name, entry.color || "bg-slate-500");
            resolved.push(created);
          }
        }
        setCurrentTags(resolved);
      }
    } catch (_error) {
      setJsonError(t("scriptMetadataDialog.jsonError"));
    }
  }, [
    availableTags,
    jsonText,
    setAuthor,
    setBackgroundInfo,
    setContact,
    setContactFields,
    setCopyright,
    setCoverUrl,
    setCurrentTags,
    setCustomFields,
    setDate,
    setEnvironmentInfo,
    setIdentity,
    setJsonError,
    setLicenseCommercial,
    setLicenseDerivative,
    setLicenseNotify,
    setLicenseSpecialTerms,
    setOpeningIntro,
    setOutline,
    setPerformanceInstruction,
    setRoleSetting,
    setSelectedOrgId,
    setSeriesId,
    setSeriesName,
    setSeriesOrder,
    setSituationInfo,
    setStatus,
    setSynopsis,
    setTitle,
    t,
  ]);
}
