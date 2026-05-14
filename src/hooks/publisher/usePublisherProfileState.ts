import React from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../contexts/I18nContext";
import { useToast } from "../../components/ui/toast";
import { searchOrganizations, requestToJoinOrganization, getMyOrganizationRequests } from "../../lib/api/organizations";
import { uploadMediaObject } from "../../lib/api/media";
import { optimizeImageForUpload, getImageUploadGuide } from "../../lib/mediaLibrary";

export interface PersonaLink {
  label?: string;
  url?: string;
}

export interface PersonaItem {
  id: string;
  displayName?: string;
  bio?: string;
  website?: string;
  links?: PersonaLink[] | string;
  avatar?: string;
  bannerUrl?: string;
  organizationIds?: string[];
  tags?: string[];
  defaultLicenseCommercial?: string;
  defaultLicenseDerivative?: string;
  defaultLicenseNotify?: string;
  defaultLicenseSpecialTerms?: string[];
}

export interface PersonaDraft {
  displayName: string;
  bio: string;
  website: string;
  links: PersonaLink[] | string;
  avatar: string;
  bannerUrl: string;
  organizationIds: string[];
  tags: string[];
  defaultLicenseCommercial: string;
  defaultLicenseDerivative: string;
  defaultLicenseNotify: string;
  defaultLicenseSpecialTerms: string[];
}

export interface OrgItem {
  id: string;
  name?: string;
}

interface OrgSearchItem {
  id: string;
  name?: string;
}

interface OrgRequestItem {
  id: string;
  organization?: { name?: string };
  orgName?: string;
  organizationId?: string;
  status?: string;
}

interface TagOption {
  name: string;
}

interface UsePublisherProfileStateProps {
  selectedPersonaId: string | null;
  setSelectedPersonaId: (id: string | null) => void;
  personas: PersonaItem[];
  selectedPersona: PersonaItem | null;
  handleCreatePersona: () => void;
  isCreatingPersona: boolean;
  handleDeletePersona: () => void;
  personaDraft: PersonaDraft;
  setPersonaDraft: React.Dispatch<React.SetStateAction<PersonaDraft>>;
  orgs: OrgItem[];
  personaTagInput: string;
  setPersonaTagInput: (value: string) => void;
  handleSaveProfile: () => void;
  isSavingProfile: boolean;
  parseTags: (value: string) => string[];
  addTags: (base: string[], incoming: string[]) => string[];
  getSuggestions: (value: string) => string[];
  getTagStyle: (tag: string) => React.CSSProperties;
  tagOptions?: TagOption[];
}

export function usePublisherProfileState({
  selectedPersonaId,
  setSelectedPersonaId,
  personas,
  selectedPersona,
  personaDraft,
  setPersonaDraft,
  personaTagInput,
  tagOptions = [],
}: UsePublisherProfileStateProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = React.useState<"edit" | "create">("edit");
  const [orgSearchQuery, setOrgSearchQuery] = React.useState<string>("");
  const [orgSearchResults, setOrgSearchResults] = React.useState<OrgSearchItem[]>([]);
  const [isOrgSearching, setIsOrgSearching] = React.useState<boolean>(false);
  const [myOrgRequests, setMyOrgRequests] = React.useState<OrgRequestItem[]>([]);
  const [avatarPreviewFailed, setAvatarPreviewFailed] = React.useState<boolean>(false);
  const [bannerPreviewFailed, setBannerPreviewFailed] = React.useState<boolean>(false);
  const [avatarUploadError, setAvatarUploadError] = React.useState<string>("");
  const [bannerUploadError, setBannerUploadError] = React.useState<string>("");
  const [avatarUploadWarning, setAvatarUploadWarning] = React.useState<string>("");
  const [bannerUploadWarning, setBannerUploadWarning] = React.useState<string>("");
  const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState<boolean>(false);
  const [mediaPickerTarget, setMediaPickerTarget] = React.useState<"avatar" | "banner" | null>(null);
  const [cropOpen, setCropOpen] = React.useState<boolean>(false);
  const [cropPurpose, setCropPurpose] = React.useState<"avatar" | "banner">("avatar");
  const [cropTargetField, setCropTargetField] = React.useState<"avatar" | "bannerUrl" | null>(null);
  const [cropSource, setCropSource] = React.useState<{ file: File; name: string } | null>(null);

  const avatarGuide = React.useMemo(() => getImageUploadGuide("avatar"), []);
  const bannerGuide = React.useMemo(() => getImageUploadGuide("banner"), []);
  const hasPersona = Array.isArray(personas) && personas.length > 0;

  const filteredTagOptions = React.useMemo(() => {
    const needle = personaTagInput.trim().toLowerCase();
    const names = (tagOptions || []).map(tag => tag.name).filter(Boolean);
    if (!needle) return names;
    return names.filter(n => n.toLowerCase().includes(needle));
  }, [tagOptions, personaTagInput]);

  React.useEffect(() => {
    if (selectedPersonaId) setViewMode("edit");
  }, [selectedPersonaId]);

  React.useEffect(() => {
    if (!orgSearchQuery) { setOrgSearchResults([]); return; }
    const delay = setTimeout(async () => {
      setIsOrgSearching(true);
      try {
        const results = await searchOrganizations(orgSearchQuery) as OrgSearchItem[];
        setOrgSearchResults(results || []);
      } catch { setOrgSearchResults([]); }
      finally { setIsOrgSearching(false); }
    }, 400);
    return () => clearTimeout(delay);
  }, [orgSearchQuery]);

  React.useEffect(() => {
    let alive = true;
    getMyOrganizationRequests()
      .then(data => { if (alive) setMyOrgRequests((data as { requests?: OrgRequestItem[] })?.requests || []); })
      .catch(() => { if (alive) setMyOrgRequests([]); });
    return () => { alive = false; };
  }, []);

  const safeLinks = React.useMemo<PersonaLink[]>(() => {
    const draftLinks = personaDraft.links;
    const fallback = Array.isArray(selectedPersona?.links) ? selectedPersona!.links as PersonaLink[] : [];
    if (Array.isArray(draftLinks) && draftLinks.length > 0) return draftLinks;
    if (Array.isArray(draftLinks) && draftLinks.length === 0 && fallback.length > 0) return fallback;
    if (Array.isArray(draftLinks)) return draftLinks;
    if (typeof draftLinks === "string") {
      try { const parsed = JSON.parse(draftLinks); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    return [];
  }, [personaDraft.links, selectedPersona]);

  const profileChecklist = React.useMemo(() => ([
    { key: "displayName", label: t("publisherProfileTab.checkDisplayName"), ok: Boolean(personaDraft.displayName?.trim()) },
    { key: "bio", label: t("publisherProfileTab.checkBio"), ok: Boolean(personaDraft.bio?.trim()) },
    { key: "avatar", label: t("publisherProfileTab.checkAvatar"), ok: Boolean(personaDraft.avatar?.trim()) },
    { key: "bannerUrl", label: t("publisherProfileTab.checkBanner"), ok: Boolean(personaDraft.bannerUrl?.trim()) },
    { key: "links", label: t("publisherProfileTab.checkLinks"), ok: safeLinks.some(link => String(link?.url || "").trim()) },
    { key: "tags", label: t("publisherProfileTab.checkTags"), ok: (personaDraft.tags || []).length > 0 },
  ]), [personaDraft, safeLinks, t]);

  const profileDone = profileChecklist.filter(i => i.ok).length;
  const profileProgress = Math.round((profileDone / profileChecklist.length) * 100);
  const profileNextSteps = profileChecklist.filter(i => !i.ok).slice(0, 3);

  const requiredFieldTargets = React.useMemo<Record<string, string>>(() => ({
    displayName: "persona-display-name", bio: "persona-bio",
    avatar: "persona-avatar-url", bannerUrl: "persona-banner-url",
    links: "persona-add-link-btn", tags: "persona-tag-input",
  }), []);

  const missingRequiredFields = React.useMemo(() => {
    const nameItem = profileChecklist.find(i => i.key === "displayName");
    if (!nameItem || nameItem.ok) return [];
    return [nameItem];
  }, [profileChecklist]);

  const suggestedFields = React.useMemo(
    () => profileChecklist.filter(i => i.key !== "displayName" && !i.ok),
    [profileChecklist]
  );

  const jumpToRequiredField = React.useCallback((fieldKey: string) => {
    const targetId = requiredFieldTargets[fieldKey];
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    window.setTimeout(() => { try { el.focus({ preventScroll: true }); } catch { el.focus(); } }, 240);
  }, [requiredFieldTargets]);

  const applyUploadedImage = React.useCallback(async (file: File, field: "avatar" | "bannerUrl") => {
    const ruleKey = field === "avatar" ? "avatar" : "banner";
    const optimized = await optimizeImageForUpload(file, ruleKey);
    if (!optimized.ok || !optimized.file) {
      const err = optimized.error || t("publisherProfileTab.invalidImage");
      if (field === "avatar") { setAvatarUploadError(err); setAvatarUploadWarning(""); }
      else { setBannerUploadError(err); setBannerUploadWarning(""); }
      return;
    }
    try {
      const uploaded = await uploadMediaObject(optimized.file, field === "avatar" ? "avatar" : "banner");
      const nextUrl = String(uploaded?.url || "").trim();
      if (!nextUrl) throw new Error(t("mediaLibrary.uploadFailed"));
      setPersonaDraft(prev => ({ ...prev, [field]: nextUrl }));
      if (field === "avatar") { setAvatarUploadError(""); setAvatarUploadWarning(optimized.warning || ""); setAvatarPreviewFailed(false); }
      else { setBannerUploadError(""); setBannerUploadWarning(optimized.warning || ""); setBannerPreviewFailed(false); }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t("mediaLibrary.uploadFailed");
      if (field === "avatar") { setAvatarUploadError(msg); setAvatarUploadWarning(""); }
      else { setBannerUploadError(msg); setBannerUploadWarning(""); }
    }
  }, [t, setPersonaDraft]);

  const handleImageUpload = (field: "avatar" | "bannerUrl") => async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCropTargetField(field);
    setCropPurpose(field === "avatar" ? "avatar" : "banner");
    setCropSource({ file, name: file.name });
    setCropOpen(true);
    event.target.value = "";
  };

  const onStartCreate = () => {
    setSelectedPersonaId(null);
    setPersonaDraft({
      displayName: "", bio: "", website: "", links: [], avatar: "", bannerUrl: "",
      organizationIds: [], tags: [],
      defaultLicenseCommercial: "", defaultLicenseDerivative: "", defaultLicenseNotify: "",
      defaultLicenseSpecialTerms: [],
    });
    setViewMode("create");
  };

  const handleRequestJoinOrg = async (orgId: string) => {
    if (!hasPersona) {
      toast({ title: t("publisherProfileTab.needPersonaBeforeOrg", "請先建立作者身份"), description: t("publisherProfileTab.needPersonaBeforeOrgDesc", "建立至少一個作者身份後，才能申請加入組織。"), variant: "destructive" });
      onStartCreate();
      return;
    }
    try {
      await requestToJoinOrganization(orgId);
      setOrgSearchQuery("");
      setOrgSearchResults([]);
      try {
        const data = await getMyOrganizationRequests() as { requests?: OrgRequestItem[] };
        setMyOrgRequests(data?.requests || []);
      } catch {}
      toast({ title: t("publisherProfileTab.requestJoinSuccessTitle", "已送出申請"), description: t("publisherProfileTab.requestJoinSuccessDesc", "已送出加入組織申請，請等待管理者審核。") });
    } catch (error: unknown) {
      toast({ title: t("publisherProfileTab.requestJoinFailedTitle", "申請送出失敗"), description: String(error instanceof Error ? error.message : t("publisherProfileTab.requestJoinFailedDesc", "無法送出申請，請稍後再試。")), variant: "destructive" });
    }
  };

  const handleMediaPickerSelect = (url: string) => {
    if (mediaPickerTarget === "avatar") {
      setPersonaDraft(prev => ({ ...prev, avatar: url }));
      setAvatarPreviewFailed(false); setAvatarUploadError(""); setAvatarUploadWarning("");
    } else if (mediaPickerTarget === "banner") {
      setPersonaDraft(prev => ({ ...prev, bannerUrl: url }));
      setBannerPreviewFailed(false); setBannerUploadError(""); setBannerUploadWarning("");
    }
  };

  return {
    t, navigate,
    viewMode, setViewMode, onStartCreate,
    orgSearchQuery, setOrgSearchQuery,
    orgSearchResults, isOrgSearching,
    myOrgRequests,
    avatarPreviewFailed, setAvatarPreviewFailed,
    bannerPreviewFailed, setBannerPreviewFailed,
    avatarUploadError, bannerUploadError,
    avatarUploadWarning, bannerUploadWarning,
    isMediaPickerOpen, setIsMediaPickerOpen,
    mediaPickerTarget, setMediaPickerTarget,
    cropOpen, setCropOpen,
    cropPurpose, cropTargetField, cropSource,
    avatarGuide, bannerGuide,
    hasPersona,
    filteredTagOptions,
    safeLinks,
    profileChecklist, profileDone, profileProgress, profileNextSteps,
    missingRequiredFields, suggestedFields,
    jumpToRequiredField,
    applyUploadedImage,
    handleImageUpload,
    handleRequestJoinOrg,
    handleMediaPickerSelect,
  };
}
