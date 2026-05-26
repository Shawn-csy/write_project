import React from "react";
import { optimizeImageForUpload, getImageUploadGuide } from "../../lib/mediaLibrary";
import { uploadMediaObject } from "../../lib/api/media";
import { useI18n } from "../../contexts/I18nContext";
import { usePublisherOrgGuide } from "./usePublisherOrgGuide";
import type { MediaSelection } from "../../components/ui/MediaPicker";

interface OrgItem {
  id: string;
  name?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  logoCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  bannerUrl?: string;
  bannerCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  tags?: string[];
}

interface OrgDraft {
  id: string;
  name: string;
  description: string;
  website: string;
  logoUrl: string;
  logoCrop: { cx?: number; cy?: number; zoom?: number } | null;
  bannerUrl: string;
  bannerCrop: { cx?: number; cy?: number; zoom?: number } | null;
  tags: string[];
}

interface TagOption { name: string; }

interface Props {
  orgs: OrgItem[];
  selectedOrgId: string | null;
  setSelectedOrgId: (id: string | null) => void;
  orgDraft: OrgDraft;
  setOrgDraft: React.Dispatch<React.SetStateAction<OrgDraft>>;
  orgTagInput: string;
  tagOptions?: TagOption[];
  canManageOrgMembers?: boolean;
}

export function usePublisherOrgTabState({ orgs, selectedOrgId, setSelectedOrgId, orgDraft, setOrgDraft, orgTagInput, tagOptions = [], canManageOrgMembers = false }: Props) {
  const { t } = useI18n();
  const [viewMode, setViewMode] = React.useState<"edit" | "create">("edit");
  const [logoPreviewFailed, setLogoPreviewFailed] = React.useState(false);
  const [bannerPreviewFailed, setBannerPreviewFailed] = React.useState(false);
  const [logoUploadError, setLogoUploadError] = React.useState("");
  const [bannerUploadError, setBannerUploadError] = React.useState("");
  const [logoUploadWarning, setLogoUploadWarning] = React.useState("");
  const [bannerUploadWarning, setBannerUploadWarning] = React.useState("");
  const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = React.useState<"logo" | "banner" | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [cropPurpose, setCropPurpose] = React.useState<"logo" | "banner">("logo");
  const [cropTargetField, setCropTargetField] = React.useState<"logoUrl" | "bannerUrl" | null>(null);
  const [cropSource, setCropSource] = React.useState<{ file: File; name: string } | null>(null);

  const logoGuide = React.useMemo(() => getImageUploadGuide("logo"), []);
  const bannerGuide = React.useMemo(() => getImageUploadGuide("banner"), []);

  const filteredTagOptions = React.useMemo(() => {
    const needle = orgTagInput.trim().toLowerCase();
    const names = (tagOptions || []).map(tag => tag.name).filter(Boolean);
    if (!needle) return names;
    return names.filter(n => n.toLowerCase().includes(needle));
  }, [tagOptions, orgTagInput]);

  const orgChecklist = React.useMemo(() => ([
    { key: "name", label: t("publisherOrgTab.checkName"), ok: Boolean(orgDraft.name?.trim()) },
    { key: "description", label: t("publisherOrgTab.checkDescription"), ok: Boolean(orgDraft.description?.trim()) },
    { key: "logoUrl", label: t("publisherOrgTab.checkLogo"), ok: Boolean(orgDraft.logoUrl?.trim()) },
    { key: "bannerUrl", label: t("publisherOrgTab.checkBanner"), ok: Boolean(orgDraft.bannerUrl?.trim()) },
    { key: "website", label: t("publisherOrgTab.checkWebsite"), ok: Boolean(orgDraft.website?.trim()) },
    { key: "tags", label: t("publisherOrgTab.checkTags"), ok: (orgDraft.tags || []).length > 0 },
  ]), [orgDraft, t]);
  const orgDone = orgChecklist.filter(i => i.ok).length;
  const orgProgress = Math.round((orgDone / orgChecklist.length) * 100);
  const orgNextSteps = orgChecklist.filter(i => !i.ok).slice(0, 3);

  const guide = usePublisherOrgGuide({ t, viewMode, selectedOrgId: selectedOrgId || "", canManageOrgMembers });
  const isReadOnlyExistingOrg = viewMode === "edit" && Boolean(selectedOrgId) && !canManageOrgMembers;

  const applyUploadedImage = React.useCallback(async (file: File, field: "logoUrl" | "bannerUrl") => {
    const ruleKey = field === "logoUrl" ? "logo" : "banner";
    const optimized = await optimizeImageForUpload(file, ruleKey);
    if (!optimized.ok || !optimized.file) {
      const err = optimized.error || t("publisherOrgTab.invalidImage");
      if (field === "logoUrl") { setLogoUploadError(err); setLogoUploadWarning(""); }
      else { setBannerUploadError(err); setBannerUploadWarning(""); }
      return;
    }
    try {
      const uploaded = await uploadMediaObject(optimized.file, field === "logoUrl" ? "logo" : "banner");
      const nextUrl = String(uploaded?.url || "").trim();
      if (!nextUrl) throw new Error(t("mediaLibrary.uploadFailed"));
      const cropField = field === "logoUrl" ? "logoCrop" : "bannerCrop";
      setOrgDraft(prev => ({ ...prev, [field]: nextUrl, [cropField]: null }));
      if (field === "logoUrl") { setLogoUploadError(""); setLogoUploadWarning(optimized.warning || ""); setLogoPreviewFailed(false); }
      else { setBannerUploadError(""); setBannerUploadWarning(optimized.warning || ""); setBannerPreviewFailed(false); }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t("mediaLibrary.uploadFailed");
      if (field === "logoUrl") { setLogoUploadError(msg); setLogoUploadWarning(""); }
      else { setBannerUploadError(msg); setBannerUploadWarning(""); }
    }
  }, [t, setOrgDraft]);

  const handleImageUpload = (field: "logoUrl" | "bannerUrl") => async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCropTargetField(field);
    setCropPurpose(field === "logoUrl" ? "logo" : "banner");
    setCropSource({ file, name: file.name });
    setCropOpen(true);
    event.target.value = "";
  };

  const handleMediaPickerSelect = (url: string) => {
    if (mediaPickerTarget === "logo") {
      setOrgDraft(prev => ({ ...prev, logoUrl: url, logoCrop: null }));
      setLogoPreviewFailed(false); setLogoUploadError(""); setLogoUploadWarning("");
    } else if (mediaPickerTarget === "banner") {
      setOrgDraft(prev => ({ ...prev, bannerUrl: url, bannerCrop: null }));
      setBannerPreviewFailed(false); setBannerUploadError(""); setBannerUploadWarning("");
    }
  };

  const handleMediaPickerSelectMedia = (selection: MediaSelection) => {
    if (mediaPickerTarget === "logo") {
      setOrgDraft(prev => ({ ...prev, logoUrl: selection.url, logoCrop: selection.crop || null }));
      setLogoPreviewFailed(false); setLogoUploadError(""); setLogoUploadWarning("");
    } else if (mediaPickerTarget === "banner") {
      setOrgDraft(prev => ({ ...prev, bannerUrl: selection.url, bannerCrop: selection.crop || null }));
      setBannerPreviewFailed(false); setBannerUploadError(""); setBannerUploadWarning("");
    }
  };

  React.useEffect(() => {
    if (!selectedOrgId) return;
    const org = orgs.find(item => item.id === selectedOrgId);
    if (!org) return;
    setOrgDraft({
      id: org.id,
      name: org.name || "",
      description: org.description || "",
      website: org.website || "",
      logoUrl: org.logoUrl || "",
      logoCrop: org.logoCrop || null,
      bannerUrl: org.bannerUrl || "",
      bannerCrop: org.bannerCrop || null,
      tags: org.tags || []
    });
    setViewMode("edit");
    setLogoPreviewFailed(false); setBannerPreviewFailed(false);
    setLogoUploadError(""); setBannerUploadError(""); setLogoUploadWarning(""); setBannerUploadWarning("");
  }, [selectedOrgId, orgs, setOrgDraft]);

  const onStartCreate = () => {
    setSelectedOrgId(null);
    setOrgDraft({ id: "", name: "", description: "", website: "", logoUrl: "", logoCrop: null, bannerUrl: "", bannerCrop: null, tags: [] });
    setViewMode("create");
  };

  return {
    viewMode, isReadOnlyExistingOrg, onStartCreate,
    logoPreviewFailed, setLogoPreviewFailed,
    bannerPreviewFailed, setBannerPreviewFailed,
    logoUploadError, bannerUploadError, logoUploadWarning, bannerUploadWarning,
    isMediaPickerOpen, setIsMediaPickerOpen,
    mediaPickerTarget, setMediaPickerTarget,
    cropOpen, setCropOpen, cropPurpose, cropTargetField, cropSource,
    logoGuide, bannerGuide, filteredTagOptions,
    orgChecklist, orgDone, orgProgress, orgNextSteps,
    applyUploadedImage, handleImageUpload, handleMediaPickerSelect, handleMediaPickerSelectMedia,
    ...guide,
  };
}
