import { useMemo } from "react";

export function buildPublishChecklist({
  title,
  identity,
  licenseCommercial,
  licenseDerivative,
  licenseNotify,
  coverUrl,
  synopsis,
  tags,
  targetAudience,
  contentRating,
  t,
}) {
  const required = [
    { key: "title", label: t ? t("scriptMetadataDialog.checkTitle") : "Title", ok: Boolean(title?.trim()) },
    { key: "identity", label: t ? t("scriptMetadataDialog.checkIdentity") : "Author identity", ok: Boolean(identity?.startsWith("persona:")) },
    { key: "audience", label: t ? t("scriptMetadataDialog.checkAudience", "觀眾取向 Target Audience") : "Target Audience", ok: Boolean(targetAudience?.trim()) },
    { key: "rating", label: t ? t("scriptMetadataDialog.checkRating", "內容分級 Content Rating") : "Content Rating", ok: Boolean(contentRating?.trim()) },
    {
      key: "license",
      label: t ? t("scriptMetadataDialog.checkLicense") : "License",
      ok: Boolean(licenseCommercial?.trim()) && Boolean(licenseDerivative?.trim()) && Boolean(licenseNotify?.trim()),
    },
  ];
  const recommended = [
    { key: "cover", label: t ? t("scriptMetadataDialog.checkCover") : "Cover", ok: Boolean(coverUrl?.trim()) },
    { key: "synopsis", label: t ? t("scriptMetadataDialog.checkSynopsis") : "Synopsis", ok: Boolean(synopsis?.trim()) },
    { key: "tags", label: t ? t("scriptMetadataDialog.checkTags") : "Tags", ok: Array.isArray(tags) && tags.length > 0 },
  ];
  return {
    required,
    recommended,
    missingRequired: required.filter((item) => !item.ok),
    missingRecommended: recommended.filter((item) => !item.ok),
  };
}

export function usePublishChecklist(input) {
  return useMemo(() => buildPublishChecklist(input), [input]);
}
