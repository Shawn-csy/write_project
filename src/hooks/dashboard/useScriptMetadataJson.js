import { useCallback } from "react";
import { createTag } from "../../lib/api/tags";
import { normalizeActivityDemoLinks, parseActivityDemoLinks } from "../../lib/activityDemoLinks";

const TAG_KEYS = new Set(["tag", "tags", "標籤"]);
const normalizeKey = (value) => String(value || "").trim().toLowerCase();

export const parseTagCandidates = (raw) => {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : String(raw)
        .split(/[,，、#\n\t;]+/)
        .map((tag) => tag.trim())
        .filter(Boolean);
  return list.map((tag) => (typeof tag === "string" ? { name: tag } : tag));
};

export const sanitizeCustomJsonFields = (raw) => {
  if (Array.isArray(raw)) {
    return raw.filter((entry) => !TAG_KEYS.has(normalizeKey(entry?.key)));
  }
  if (raw && typeof raw === "object") {
    return Object.fromEntries(
      Object.entries(raw).filter(([key]) => !TAG_KEYS.has(normalizeKey(key)))
    );
  }
  return raw;
};

export const resolveTagSourceFromParsedJson = (parsed) => {
  if (parsed?.tags !== undefined) return parsed.tags;
  const custom = parsed?.customFields || parsed?.custom;
  if (Array.isArray(custom)) {
    const first = custom.find((entry) => TAG_KEYS.has(normalizeKey(entry?.key)));
    return first?.value;
  }
  if (custom && typeof custom === "object") {
    const key = Object.keys(custom).find((item) => TAG_KEYS.has(normalizeKey(item)));
    if (key) return custom[key];
  }
  return undefined;
};

export function useScriptMetadataJson({
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
  setChapterSettings,
  setActivityName,
  setActivityBannerUrl,
  setActivityContent,
  setActivityDemoLinks,
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
}) {
  return useCallback(async () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError("");
      if (parsed.title !== undefined) setTitle(parsed.title);
      if (parsed.author !== undefined) setAuthor(parsed.author);
      if (parsed.authors !== undefined && !parsed.author) setAuthor(parsed.authors);
      if (parsed.authorDisplayMode !== undefined) {
        const next = String(parsed.authorDisplayMode || "").trim().toLowerCase();
        setAuthorDisplayMode(next === "override" ? "override" : "badge");
      }
      if (parsed.date !== undefined) setDate(parsed.date);
      if (parsed.draftDate !== undefined) setDate(parsed.draftDate);
      if (parsed.synopsis !== undefined) setSynopsis(parsed.synopsis);
      if (parsed.description !== undefined && !parsed.synopsis) setSynopsis(parsed.description);
      if (parsed.outline !== undefined) setOutline(String(parsed.outline || ""));
      if (parsed.roleSetting !== undefined) setRoleSetting(String(parsed.roleSetting || ""));
      if (parsed.backgroundInfo !== undefined) setBackgroundInfo(String(parsed.backgroundInfo || ""));
      if (parsed.performanceInstruction !== undefined) setPerformanceInstruction(String(parsed.performanceInstruction || ""));
      if (parsed.openingIntro !== undefined) setOpeningIntro(String(parsed.openingIntro || ""));
      if (parsed.chapterSettings !== undefined) setChapterSettings(String(parsed.chapterSettings || ""));
      if (parsed.activityName !== undefined) setActivityName(String(parsed.activityName || ""));
      if (parsed.activityBannerUrl !== undefined) setActivityBannerUrl(String(parsed.activityBannerUrl || ""));
      if (parsed.activityContent !== undefined) setActivityContent(String(parsed.activityContent || ""));
      if (parsed.activityDemoLinks !== undefined) {
        setActivityDemoLinks(parseActivityDemoLinks(parsed.activityDemoLinks));
      } else if (parsed.activityDemoUrl !== undefined) {
        const legacyUrl = String(parsed.activityDemoUrl || "").trim();
        setActivityDemoLinks(legacyUrl ? normalizeActivityDemoLinks([legacyUrl]) : []);
      }
      if (parsed.activityWorkUrl !== undefined) setActivityWorkUrl(String(parsed.activityWorkUrl || ""));
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
      const custom = sanitizeCustomJsonFields(parsed.custom || parsed.customFields || {});
      const next = Array.isArray(custom)
        ? custom.map((f, idx) => ({ id: `cf-${idx + 1}`, key: f.key || "", value: f.value || "" }))
        : Object.entries(custom).map(([k, v], idx) => ({ id: `cf-${idx + 1}`, key: k, value: String(v ?? "") }));
      setCustomFields(next);
      const rawTagSource = resolveTagSourceFromParsedJson(parsed);
      if (rawTagSource !== undefined) {
        const entries = parseTagCandidates(rawTagSource);
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
    setAuthorDisplayMode,
    setBackgroundInfo,
    setContact,
    setContactFields,
    setCopyright,
    setCoverUrl,
    setCurrentTags,
    setCustomFields,
    setDate,
    setChapterSettings,
    setActivityName,
    setActivityBannerUrl,
    setActivityContent,
    setActivityDemoLinks,
    setActivityWorkUrl,
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
    setStatus,
    setSynopsis,
    setTitle,
    t,
  ]);
}
