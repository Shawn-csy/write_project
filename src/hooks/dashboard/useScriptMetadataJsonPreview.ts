import { useEffect } from "react";
import { normalizeActivityDemoLinks } from "../../lib/activityDemoLinks";
import type { ScriptLike, TagLike, ContactField, CustomField, LicenseSpecialTerm } from "./types";

interface UseScriptMetadataJsonPreviewOptions {
  script: ScriptLike | null;
  title: string;
  author: string;
  authorDisplayMode: string;
  date: string;
  synopsis: string;
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
  contact: string;
  seriesName: string;
  seriesId: string | null;
  seriesOrder: string | number;
  coverUrl: string;
  status: string;
  licenseCommercial: string;
  licenseDerivative: string;
  licenseNotify: string;
  licenseSpecialTerms: LicenseSpecialTerm[];
  copyright: string;
  identity: string;
  selectedOrgId: string | null;
  currentTags: TagLike[];
  contactFields: ContactField[];
  customFields: CustomField[];
  jsonMode: string;
  setJsonText: (v: string) => void;
}

export function useScriptMetadataJsonPreview({
  script,
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
  currentTags,
  contactFields,
  customFields,
  jsonMode,
  setJsonText,
}: UseScriptMetadataJsonPreviewOptions) {
  useEffect(() => {
    if (!script) return;
    const customObject: Record<string, unknown> = {};
    (customFields || []).forEach(({ key, value }) => {
      if (key) customObject[key] = value;
    });
    const contactObject: Record<string, unknown> = {};
    (contactFields || []).forEach(({ key, value }) => {
      if (key) contactObject[key] = value;
    });
    const payload = {
      title,
      credit: "",
      author,
      authorDisplayMode,
      authors: "",
      draftDate: date,
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
      activityDemoLinks: normalizeActivityDemoLinks(activityDemoLinks).map(({ name, url, cast, description }) => ({
        name,
        url,
        cast,
        description,
      })),
      activityWorkUrl,
      contact,
      series: seriesName,
      seriesId,
      seriesOrder,
      cover: coverUrl,
      status,
      licenseCommercial,
      licenseDerivative,
      licenseNotify,
      licenseSpecialTerms,
      copyright,
      publishAs: identity,
      selectedOrgId: selectedOrgId || "",
      tags: (currentTags || []).map((tag) => ({ name: tag.name, color: tag.color })),
      contactFields: contactObject,
      custom: customObject,
    };
    setJsonText(JSON.stringify(payload, null, 2));
  }, [
    script,
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
    currentTags,
    contactFields,
    customFields,
    jsonMode,
    setJsonText,
  ]);
}
