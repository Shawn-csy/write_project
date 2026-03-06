import React from 'react';
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "../../ui/avatar";
import { MetadataLicenseTab } from "../metadata/MetadataLicenseTab";
import { searchOrganizations, requestToJoinOrganization } from "../../../lib/api/organizations";
import { uploadMediaObject } from "../../../lib/api/media";
import { optimizeImageForUpload, getImageUploadGuide, MEDIA_FILE_ACCEPT } from "../../../lib/mediaLibrary";
import { useI18n } from "../../../contexts/I18nContext";
import { MediaPicker } from "../../ui/MediaPicker";
import { PublisherFormRow } from "./PublisherFormRow";
import { PublisherTabHeader } from "./PublisherTabHeader";
import { useToast } from "../../ui/toast";
import { PublisherTagEditor } from "./PublisherTagEditor";
import { ImageCropDialog } from "../../ui/ImageCropDialog";

export function PublisherProfileTab({
    selectedPersonaId, setSelectedPersonaId,
    personas,
    selectedPersona,
    handleCreatePersona, isCreatingPersona,
    handleDeletePersona,
    personaDraft, setPersonaDraft,
    orgs,
    isLoading = false,
    personaTagInput, setPersonaTagInput,
    handleSaveProfile, isSavingProfile,
    parseTags, addTags, getSuggestions, getTagStyle,
    tagOptions = []
}) {
    const { t } = useI18n();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = React.useState("edit"); // edit or create
    const [orgSearchQuery, setOrgSearchQuery] = React.useState("");
    const [orgSearchResults, setOrgSearchResults] = React.useState([]);
    const [isOrgSearching, setIsOrgSearching] = React.useState(false);
    const [avatarPreviewFailed, setAvatarPreviewFailed] = React.useState(false);
    const [bannerPreviewFailed, setBannerPreviewFailed] = React.useState(false);
    const [avatarUploadError, setAvatarUploadError] = React.useState("");
    const [bannerUploadError, setBannerUploadError] = React.useState("");
    const [avatarUploadWarning, setAvatarUploadWarning] = React.useState("");
    const [bannerUploadWarning, setBannerUploadWarning] = React.useState("");
    const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState(false);
    const [mediaPickerTarget, setMediaPickerTarget] = React.useState(null); // 'avatar' or 'banner'
    const [cropOpen, setCropOpen] = React.useState(false);
    const [cropPurpose, setCropPurpose] = React.useState("avatar");
    const [cropTargetField, setCropTargetField] = React.useState(null);
    const [cropSource, setCropSource] = React.useState(null);
    const avatarGuide = React.useMemo(() => getImageUploadGuide("avatar"), []);
    const bannerGuide = React.useMemo(() => getImageUploadGuide("banner"), []);
    const hasPersona = Array.isArray(personas) && personas.length > 0;
    const filteredTagOptions = React.useMemo(() => {
        const needle = personaTagInput.trim().toLowerCase();
        const names = (tagOptions || []).map(t => t.name).filter(Boolean);
        if (!needle) return names;
        return names.filter(n => n.toLowerCase().includes(needle));
    }, [tagOptions, personaTagInput]);

    React.useEffect(() => {
        if (selectedPersonaId) {
            setViewMode("edit");
        }
    }, [selectedPersonaId]);

    React.useEffect(() => {
        if (!orgSearchQuery) {
            setOrgSearchResults([]);
            return;
        }
        const delay = setTimeout(async () => {
            setIsOrgSearching(true);
            try {
                const results = await searchOrganizations(orgSearchQuery);
                setOrgSearchResults(results || []);
            } catch (e) {
                setOrgSearchResults([]);
            } finally {
                setIsOrgSearching(false);
            }
        }, 400);
        return () => clearTimeout(delay);
    }, [orgSearchQuery]);

    const handleRequestJoinOrg = async (orgId) => {
        if (!hasPersona) {
            toast({
                title: t("publisherProfileTab.needPersonaBeforeOrg", "請先建立作者身份"),
                description: t("publisherProfileTab.needPersonaBeforeOrgDesc", "建立至少一個作者身份後，才能申請加入組織。"),
                variant: "destructive",
            });
            onStartCreate();
            return;
        }
        await requestToJoinOrganization(orgId);
        setOrgSearchQuery("");
        setOrgSearchResults([]);
    };

    const safeLinks = React.useMemo(() => {
        const draftLinks = personaDraft.links;
        const fallback = selectedPersona?.links || [];
        if (Array.isArray(draftLinks) && draftLinks.length > 0) return draftLinks;
        if (Array.isArray(draftLinks) && draftLinks.length === 0 && fallback.length > 0) return fallback;
        if (Array.isArray(draftLinks)) return draftLinks;
        if (typeof personaDraft.links === "string") {
            try {
                const parsed = JSON.parse(personaDraft.links);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    }, [personaDraft.links, selectedPersona]);

    const profileChecklist = React.useMemo(() => ([
        { key: "displayName", label: t("publisherProfileTab.checkDisplayName"), ok: Boolean(personaDraft.displayName?.trim()) },
        { key: "bio", label: t("publisherProfileTab.checkBio"), ok: Boolean(personaDraft.bio?.trim()) },
        { key: "avatar", label: t("publisherProfileTab.checkAvatar"), ok: Boolean(personaDraft.avatar?.trim()) },
        { key: "bannerUrl", label: t("publisherProfileTab.checkBanner"), ok: Boolean(personaDraft.bannerUrl?.trim()) },
        { key: "links", label: t("publisherProfileTab.checkLinks"), ok: safeLinks.some((link) => String(link?.url || "").trim()) },
        { key: "tags", label: t("publisherProfileTab.checkTags"), ok: (personaDraft.tags || []).length > 0 },
    ]), [personaDraft, safeLinks, t]);
    const profileDone = profileChecklist.filter((item) => item.ok).length;
    const profileProgress = Math.round((profileDone / profileChecklist.length) * 100);
    const profileNextSteps = profileChecklist.filter((item) => !item.ok).slice(0, 3);

    const applyUploadedImage = React.useCallback(async (file, field) => {
        const ruleKey = field === "avatar" ? "avatar" : "banner";
        const optimized = await optimizeImageForUpload(file, ruleKey);
        if (!optimized.ok) {
            if (field === "avatar") {
                setAvatarUploadError(optimized.error || t("publisherProfileTab.invalidImage"));
                setAvatarUploadWarning("");
            }
            if (field === "bannerUrl") {
                setBannerUploadError(optimized.error || t("publisherProfileTab.invalidImage"));
                setBannerUploadWarning("");
            }
            return;
        }
        try {
            const purpose = field === "avatar" ? "avatar" : "banner";
            const uploaded = await uploadMediaObject(optimized.file, purpose);
            const nextUrl = String(uploaded?.url || "").trim();
            if (!nextUrl) throw new Error(t("mediaLibrary.uploadFailed"));
            setPersonaDraft((prev) => ({ ...prev, [field]: nextUrl }));
            if (field === "avatar") {
                setAvatarUploadError("");
                setAvatarUploadWarning(optimized.warning || "");
                setAvatarPreviewFailed(false);
            }
            if (field === "bannerUrl") {
                setBannerUploadError("");
                setBannerUploadWarning(optimized.warning || "");
                setBannerPreviewFailed(false);
            }
        } catch (error) {
            const errorMessage = error?.message || t("mediaLibrary.uploadFailed");
            if (field === "avatar") {
                setAvatarUploadError(errorMessage);
                setAvatarUploadWarning("");
            }
            if (field === "bannerUrl") {
                setBannerUploadError(errorMessage);
                setBannerUploadWarning("");
            }
        }
    }, [t, setPersonaDraft]);

    const handleImageUpload = (field) => async (event) => {
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
            displayName: "", 
            bio: "", 
            website: "", 
            links: [],
            avatar: "", 
            bannerUrl: "",
            organizationIds: [], 
            tags: [], 
            defaultLicenseCommercial: "",
            defaultLicenseDerivative: "",
            defaultLicenseNotify: "",
            defaultLicenseSpecialTerms: []
        });
        setViewMode("create");
    };

    return (
        <Card className="flex flex-col md:flex-row h-auto min-h-0 md:min-h-[500px] overflow-hidden border">
            {/* Left Sidebar: List */}
            <div className="w-full md:w-[280px] border-b md:border-b-0 md:border-r flex flex-col bg-muted/10">
                <div className="p-4 border-b flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                    <h3 className="font-semibold text-sm">{t("publisherProfileTab.authorList")}</h3>
                    <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={onStartCreate}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {isLoading && (
                        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>載入作者資料中...</span>
                        </div>
                    )}
                    {personas.map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => setSelectedPersonaId(p.id)}
                            className={`p-3 rounded-lg border cursor-pointer hover:bg-background/80 hover:shadow-sm transition-all flex items-center gap-3 ${selectedPersonaId === p.id ? "bg-background shadow-sm border-primary/50 ring-1 ring-primary/20" : "bg-transparent border-transparent hover:border-border/50"}`}
                        >
                            <Avatar className="w-8 h-8 border">
                                <AvatarImage src={p.avatar} />
                                <AvatarFallback>{p.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="font-medium truncate text-sm flex-1">{p.displayName}</div>
                        </div>
                    ))}
                    
                    {personas.length === 0 && (
                        <div className="text-center text-muted-foreground p-8 text-sm">
                            {t("publisherProfileTab.noPersona")}
                            <Button variant="link" size="sm" onClick={onStartCreate} className="mt-2 text-xs">{t("publisherProfileTab.createNow")}</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Main: Editor */}
            <div className="flex-1 flex flex-col overflow-hidden bg-card">
                <div className="p-4 border-b bg-background/50 backdrop-blur-sm">
                    <PublisherTabHeader
                        title={viewMode === "create" ? t("publisherProfileTab.createIdentity") : t("publisherProfileTab.editIdentity")}
                        description="編輯作者名稱、個人簡介、圖片與作者頁展示內容。"
                        actions={<div className="flex items-center justify-end gap-2 min-w-[260px]">
                        <Button
                            variant="outline"
                            size="sm"
                            className={viewMode === "edit" && selectedPersonaId ? "" : "invisible pointer-events-none"}
                            onClick={() => selectedPersonaId && navigate(`/author/${selectedPersonaId}`)}
                        >
                            {t("publisherProfileTab.viewAuthorPage")}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`text-destructive hover:bg-destructive/10 h-8 text-xs ${viewMode === "edit" && selectedPersonaId ? "" : "invisible pointer-events-none"}`}
                            onClick={handleDeletePersona}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> {t("publisherProfileTab.deleteIdentity")}
                        </Button>
                    </div>}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-5">
                    <div className="max-w-4xl mx-auto space-y-6 pb-16">
                        {(viewMode === "create" || selectedPersonaId) ? (
                            <>
                                {profileProgress < 100 && (
                                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{t("publisherProfileTab.progress")}</span>
                                            <span className="text-muted-foreground">{profileDone}/{profileChecklist.length} · {profileProgress}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-muted">
                                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${profileProgress}%` }} />
                                        </div>
                                        {profileNextSteps.length > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                {t("publisherProfileTab.nextSteps").replace("{items}", profileNextSteps.map((item) => item.label).join("、"))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <PublisherFormRow
                                    label={t("publisherProfileTab.displayName")}
                                    required
                                    hint={t("publisherProfileTab.displayNameRequiredHint", "最重要欄位，建立身份前請先填寫。")}
                                >
                                    <div className="space-y-1.5">
                                        <Input
                                            id="persona-display-name"
                                            name="personaDisplayName"
                                            value={personaDraft.displayName}
                                            onChange={e => setPersonaDraft({ ...personaDraft, displayName: e.target.value })}
                                            placeholder={t("publisherProfileTab.displayNamePlaceholder")}
                                            className="font-medium"
                                        />
                                        {!personaDraft.displayName.trim() ? (
                                            <p className="text-xs font-medium text-destructive">
                                                {t("publisherProfileTab.displayNameRequiredMessage", "請先填寫作者名稱，才能建立或儲存身份。")}
                                            </p>
                                        ) : null}
                                    </div>
                                </PublisherFormRow>

                                <PublisherFormRow label={t("publisherProfileTab.bio")}>
                                    <Textarea
                                        id="persona-bio"
                                        name="personaBio"
                                        value={personaDraft.bio}
                                        onChange={e => setPersonaDraft({ ...personaDraft, bio: e.target.value })}
                                        placeholder={t("publisherProfileTab.bioPlaceholder")}
                                        className="min-h-[80px] resize-none"
                                    />
                                </PublisherFormRow>

                                <PublisherFormRow label={t("publisherProfileTab.website")}>
                                    <Input
                                        id="persona-website"
                                        name="personaWebsite"
                                        value={personaDraft.website}
                                        onChange={e => setPersonaDraft({ ...personaDraft, website: e.target.value })}
                                        placeholder="https://"
                                    />
                                </PublisherFormRow>

                                <PublisherFormRow
                                    label={t("publisherProfileTab.avatarUrl", "頭像")}
                                    hint={t("publisherProfileTab.avatarUrlPlaceholder")}
                                >
                                    <div className="space-y-2">
                                        <div className="h-28 w-28 overflow-hidden rounded-xl border bg-muted/20 shadow-sm">
                                            {personaDraft.avatar && !avatarPreviewFailed ? (
                                                <img
                                                    src={personaDraft.avatar}
                                                    alt="persona avatar preview"
                                                    className="h-full w-full object-cover"
                                                    onError={() => setAvatarPreviewFailed(true)}
                                                    onLoad={() => setAvatarPreviewFailed(false)}
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Avatar</div>
                                            )}
                                        </div>
                                        <Input
                                            id="persona-avatar-url"
                                            name="personaAvatarUrl"
                                            value={personaDraft.avatar}
                                            onChange={e => setPersonaDraft({ ...personaDraft, avatar: e.target.value })}
                                            className="text-xs h-8"
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
                                                {t("publisherProfileTab.uploadAvatar")}
                                                <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={handleImageUpload("avatar")} />
                                            </label>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 text-[11px] border bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                                                onClick={() => {
                                                    setMediaPickerTarget('avatar');
                                                    setIsMediaPickerOpen(true);
                                                }}
                                            >
                                                {t("mediaLibrary.selectFromLibrary", "從媒體庫選擇")}
                                            </Button>
                                        </div>
                                        <div className="space-y-0.5 text-[11px] text-muted-foreground">
                                            <p>{avatarGuide.supported}</p>
                                            <p>{avatarGuide.recommended}</p>
                                        </div>
                                        <div className="min-h-[16px] text-[11px]">
                                            {avatarUploadError ? (
                                                <p className="text-destructive">{avatarUploadError}</p>
                                            ) : avatarUploadWarning ? (
                                                <p className="text-amber-700 dark:text-amber-300">{avatarUploadWarning}</p>
                                            ) : avatarPreviewFailed ? (
                                                <p className="text-amber-700 dark:text-amber-300">{t("publisherProfileTab.avatarPreviewFailed")}</p>
                                            ) : (
                                                <p className="opacity-0">placeholder</p>
                                            )}
                                        </div>
                                    </div>
                                </PublisherFormRow>

                                <PublisherFormRow
                                    label={t("publisherProfileTab.bannerUrl", "封面")}
                                    hint={t("publisherProfileTab.bannerUrlPlaceholder")}
                                >
                                    <div className="space-y-2">
                                        <div className="h-16 w-full max-w-sm overflow-hidden rounded-md border bg-muted/20">
                                            {personaDraft.bannerUrl && !bannerPreviewFailed ? (
                                                <img
                                                    src={personaDraft.bannerUrl}
                                                    alt="persona banner preview"
                                                    className="h-full w-full object-cover"
                                                    onError={() => setBannerPreviewFailed(true)}
                                                    onLoad={() => setBannerPreviewFailed(false)}
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Banner</div>
                                            )}
                                        </div>
                                        <Input
                                            id="persona-banner-url"
                                            name="personaBannerUrl"
                                            value={personaDraft.bannerUrl || ""}
                                            onChange={e => setPersonaDraft({ ...personaDraft, bannerUrl: e.target.value })}
                                            className="text-xs h-8"
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
                                                {t("publisherProfileTab.uploadBanner")}
                                                <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={handleImageUpload("bannerUrl")} />
                                            </label>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 text-[11px] border bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                                                onClick={() => {
                                                    setMediaPickerTarget('banner');
                                                    setIsMediaPickerOpen(true);
                                                }}
                                            >
                                                {t("mediaLibrary.selectFromLibrary", "從媒體庫選擇")}
                                            </Button>
                                        </div>
                                        <div className="space-y-0.5 text-[11px] text-muted-foreground">
                                            <p>{bannerGuide.supported}</p>
                                            <p>{bannerGuide.recommended}</p>
                                        </div>
                                        <div className="min-h-[16px] text-[11px]">
                                            {bannerUploadError ? (
                                                <p className="text-destructive">{bannerUploadError}</p>
                                            ) : bannerUploadWarning ? (
                                                <p className="text-amber-700 dark:text-amber-300">{bannerUploadWarning}</p>
                                            ) : bannerPreviewFailed ? (
                                                <p className="text-amber-700 dark:text-amber-300">{t("publisherProfileTab.bannerPreviewFailed")}</p>
                                            ) : (
                                                <p className="opacity-0">placeholder</p>
                                            )}
                                        </div>
                                    </div>
                                </PublisherFormRow>

                                <div className="space-y-3 pt-4 border-t">
                                        <PublisherFormRow label={t("publisherProfileTab.customLinks")}>
                                            <div className="border rounded-md p-3 bg-muted/10 space-y-2">
                                                {safeLinks.length === 0 && (
                                                    <div className="text-sm text-muted-foreground">{t("publisherProfileTab.noLinks")}</div>
                                                )}
                                    {safeLinks.map((link, idx) => (
                                        <div key={`link-${idx}`} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-center">
                                            <Input
                                                id={`persona-link-label-${idx}`}
                                                name={`persona-link-label-${idx}`}
                                                aria-label={t("publisherProfileTab.linkNameAria")}
                                                placeholder={t("publisherProfileTab.linkNamePlaceholder")}
                                                value={link.label || ""}
                                                onChange={(e) => {
                                                    const next = [...safeLinks];
                                                    next[idx] = { ...next[idx], label: e.target.value };
                                                    setPersonaDraft({ ...personaDraft, links: next });
                                                }}
                                            />
                                            <Input
                                                id={`persona-link-url-${idx}`}
                                                name={`persona-link-url-${idx}`}
                                                aria-label={t("publisherProfileTab.linkUrlAria")}
                                                placeholder="https://"
                                                value={link.url || ""}
                                                onChange={(e) => {
                                                    const next = [...safeLinks];
                                                    next[idx] = { ...next[idx], url: e.target.value };
                                                    setPersonaDraft({ ...personaDraft, links: next });
                                                }}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const next = safeLinks.filter((_, i) => i !== idx);
                                                    setPersonaDraft({ ...personaDraft, links: next });
                                                }}
                                            >
                                                {t("common.remove")}
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const next = [...safeLinks, { label: "", url: "" }];
                                            setPersonaDraft({ ...personaDraft, links: next });
                                        }}
                                    >
                                        {t("publisherProfileTab.addLink")}
                                    </Button>
                                </div>
                                        </PublisherFormRow>

                            <PublisherFormRow label={t("publisherProfileTab.orgMembership")}>
                                <div className="space-y-3">
                                            <div className="rounded-md border bg-muted/10 p-2.5">
                                                <div className="mb-2 text-xs font-medium text-muted-foreground">勾選要顯示在作者頁的組織</div>
                                                {orgs.length === 0 ? (
                                                    <div className="text-sm text-muted-foreground italic px-1">{t("publisherProfileTab.noOrgYet")}</div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {orgs.map(org => {
                                                            const checked = (personaDraft.organizationIds || []).includes(org.id);
                                                            return (
                                                                <div
                                                                    key={org.id} 
                                                                    className={`flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-md border transition-all ${
                                                                        checked
                                                                            ? "bg-primary/10 border-primary text-primary"
                                                                            : "bg-background border-border hover:bg-muted/40"
                                                                    }`}
                                                                >
                                                                    <div className="min-w-0 flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`persona-org-${org.id}`}
                                                                            name={`personaOrg-${org.id}`}
                                                                            checked={checked}
                                                                            onChange={(e) => {
                                                                                const next = e.target.checked
                                                                                    ? [...(personaDraft.organizationIds || []), org.id]
                                                                                    : (personaDraft.organizationIds || []).filter(id => id !== org.id);
                                                                                setPersonaDraft({ ...personaDraft, organizationIds: next });
                                                                            }}
                                                                            className="h-3.5 w-3.5 shrink-0"
                                                                        />
                                                                        <span className="min-w-0 max-w-[220px] truncate font-medium">{org.name}</span>
                                                                    </div>
                                                                    {checked ? <span className="text-xs">已顯示</span> : null}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-2 border rounded-md p-2.5 bg-muted/10 space-y-2">
                                            <div className="text-xs text-muted-foreground">{t("publisherProfileTab.searchOrgAndApply")}</div>
                                            {!hasPersona && (
                                                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
                                                    {t("publisherProfileTab.needPersonaBeforeOrgDesc", "建立至少一個作者身份後，才能申請加入組織。")}
                                                </div>
                                            )}
                                            <Input
                                                id="org-search-query"
                                                name="orgSearchQuery"
                                                placeholder={t("publisherProfileTab.searchOrgPlaceholder")}
                                                aria-label={t("publisherProfileTab.searchOrgAria")}
                                                value={orgSearchQuery}
                                                onChange={(e) => setOrgSearchQuery(e.target.value)}
                                                disabled={!hasPersona}
                                            />
                                            {isOrgSearching && (
                                                <div className="text-xs text-muted-foreground">{t("publisherProfileTab.searching")}</div>
                                            )}
                                            {orgSearchResults.length > 0 && (
                                                <div className="space-y-2">
                                                    {orgSearchResults.map(org => (
                                                        <div key={org.id} className="flex items-center justify-between text-sm">
                                                            <span>{org.name}</span>
                                                            <Button size="sm" variant="outline" onClick={() => handleRequestJoinOrg(org.id)} disabled={!hasPersona}>
                                                                {t("publisherProfileTab.sendRequest")}
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </PublisherFormRow>

                                    <PublisherFormRow label={t("publisherProfileTab.tags")}>
                                        <PublisherTagEditor
                                            tags={personaDraft.tags || []}
                                            setTags={(nextTags) => setPersonaDraft({ ...personaDraft, tags: nextTags })}
                                            tagInput={personaTagInput}
                                            setTagInput={setPersonaTagInput}
                                            parseTags={parseTags}
                                            addTags={addTags}
                                            getTagStyle={getTagStyle}
                                            filteredOptions={filteredTagOptions}
                                            inputId="persona-tag-input"
                                            inputName="personaTagInput"
                                            inputAriaLabel={t("publisherProfileTab.addTag")}
                                            addTagLabel={t("publisherProfileTab.addTag")}
                                            inputPlaceholder={t("publisherProfileTab.searchOrAddTag")}
                                            addQuotedTemplate={t("publisherProfileTab.addQuoted")}
                                            noMatchedTagLabel={t("publisherProfileTab.noMatchedTag")}
                                            emptyHintLabel={t("publisherProfileTab.inputTagHint")}
                                        />
                                    </PublisherFormRow>
                                </div>

                                {/* Default License Configuration */}
                                <div className="border-t pt-4">
                                    <PublisherFormRow
                                        label={t("publisherProfileTab.defaultLicense")}
                                        hint={t("publisherProfileTab.defaultLicenseTip")}
                                    >
                                        <div className="rounded-lg border bg-muted/10 p-3">
                                            <MetadataLicenseTab 
                                                licenseCommercial={personaDraft.defaultLicenseCommercial || ""}
                                                setLicenseCommercial={(v) => setPersonaDraft(prev => ({ ...prev, defaultLicenseCommercial: v }))}
                                                licenseDerivative={personaDraft.defaultLicenseDerivative || ""}
                                                setLicenseDerivative={(v) => setPersonaDraft(prev => ({ ...prev, defaultLicenseDerivative: v }))}
                                                licenseNotify={personaDraft.defaultLicenseNotify || ""}
                                                setLicenseNotify={(v) => setPersonaDraft(prev => ({ ...prev, defaultLicenseNotify: v }))}
                                                licenseSpecialTerms={personaDraft.defaultLicenseSpecialTerms}
                                                setLicenseSpecialTerms={(v) => setPersonaDraft(prev => ({ ...prev, defaultLicenseSpecialTerms: v }))}
                                                copyright={""} 
                                                setCopyright={() => {}} 
                                            />
                                        </div>
                                    </PublisherFormRow>
                                </div>
                            </>
                        ) : (
                            !hasPersona ? (
                                <div className="h-[420px] flex items-center justify-center">
                                    <Card className="w-full max-w-xl border-dashed p-5">
                                        <div className="mb-4">
                                            <h4 className="text-base font-semibold">{t("publisherProfileTab.emptyDemoTitle", "這是作者身份示範")}</h4>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {t("publisherProfileTab.emptyDemoDesc", "建立第一個作者身份後，可在公開頁展示頭像、簡介、連結與標籤。")}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border bg-muted/20 p-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-12 w-12 border">
                                                    <AvatarFallback>D</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-semibold">{t("publisherProfileTab.emptyDemoName", "示範作者名稱")}</div>
                                                    <div className="text-xs text-muted-foreground">{t("publisherProfileTab.emptyDemoBio", "這裡會顯示作者簡介、風格與合作資訊。")}</div>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                <span className="rounded-full border bg-background px-2 py-0.5 text-xs">Drama</span>
                                                <span className="rounded-full border bg-background px-2 py-0.5 text-xs">Fantasy</span>
                                                <span className="rounded-full border bg-background px-2 py-0.5 text-xs">Narration</span>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <Button onClick={onStartCreate}>
                                                <Plus className="mr-1.5 h-4 w-4" />
                                                {t("publisherProfileTab.createNow")}
                                            </Button>
                                        </div>
                                    </Card>
                                </div>
                            ) : (
                                <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                                    <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                                        <Plus className="w-8 h-8 text-muted-foreground/30" />
                                    </div>
                                    <p className="mb-2">{t("publisherProfileTab.selectIdentityToEdit")}</p>
                                    <Button variant="outline" onClick={onStartCreate}>{t("publisherProfileTab.orCreateNewIdentity")}</Button>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                {(viewMode === "create" || selectedPersonaId) ? (
                <div className="p-3 border-t bg-background/50 backdrop-blur-sm flex justify-end">
                     <Button 
                        onClick={viewMode === "create" ? handleCreatePersona : handleSaveProfile} 
                        disabled={(viewMode === "create" ? isCreatingPersona : isSavingProfile) || !personaDraft.displayName.trim()}
                        className="min-w-[100px]"
                    >
                        {(viewMode === "create" ? isCreatingPersona : isSavingProfile) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {viewMode === "create" ? t("publisherProfileTab.createIdentityShort") : t("publisherProfileTab.saveChanges")}
                    </Button>
                </div>
                ) : null}
            </div>
            
            <MediaPicker
                open={isMediaPickerOpen}
                onOpenChange={setIsMediaPickerOpen}
                cropPurpose={mediaPickerTarget === "avatar" ? "avatar" : mediaPickerTarget === "banner" ? "banner" : null}
                onSelect={(url) => {
                    if (mediaPickerTarget === 'avatar') {
                        setPersonaDraft(prev => ({ ...prev, avatar: url }));
                        setAvatarPreviewFailed(false);
                        setAvatarUploadError("");
                        setAvatarUploadWarning("");
                    } else if (mediaPickerTarget === 'banner') {
                        setPersonaDraft(prev => ({ ...prev, bannerUrl: url }));
                        setBannerPreviewFailed(false);
                        setBannerUploadError("");
                        setBannerUploadWarning("");
                    }
                }}
            />
            <ImageCropDialog
                open={cropOpen}
                onOpenChange={setCropOpen}
                source={cropSource}
                purpose={cropPurpose}
                onConfirm={async (croppedFile) => {
                    if (!cropTargetField) return;
                    await applyUploadedImage(croppedFile, cropTargetField);
                }}
            />
        </Card>
    );
}
