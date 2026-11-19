/**
 * Single source of truth for the publish-information sections, so the section
 * nav, the block titles and the checklist all use the same names.
 */
export const METADATA_SECTIONS = [
    { key: "basic", i18nKey: "scriptMetadataDialog.tabBasic", fallback: "基本資料" },
    { key: "publish", i18nKey: "scriptMetadataDialog.tabPublish", fallback: "發布設定" },
    { key: "exposure", i18nKey: "scriptMetadataDialog.tabExposure", fallback: "展示與分類" },
    { key: "activity", i18nKey: "scriptMetadataDialog.tabActivity", fallback: "活動宣傳" },
    { key: "demo", i18nKey: "scriptMetadataDialog.tabDemo", fallback: "試聽範例" },
    { key: "advanced", i18nKey: "scriptMetadataDialog.tabAdvanced", fallback: "進階設定" },
] as const;

export type MetadataSectionKey = (typeof METADATA_SECTIONS)[number]["key"];
