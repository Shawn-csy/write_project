import { useEffect } from "react";
import { buildJsonPreviewPayload } from "../../lib/scriptMetadataPayload";
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
    if (jsonMode !== "true") return;
    if (!script) return;
    const payload = buildJsonPreviewPayload({
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
      currentTags,
      customFields,
    });
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
