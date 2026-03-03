import React from 'react';
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Trash2, Building2, CircleHelp } from "lucide-react";
import { Button } from "../../ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../../ui/card";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableTag } from "./SortableTag";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { optimizeImageForUpload, getImageUploadGuide, MEDIA_FILE_ACCEPT } from "../../../lib/mediaLibrary";
import { uploadMediaObject } from "../../../lib/db";
import { useI18n } from "../../../contexts/I18nContext";
import { MediaPicker } from "../../ui/MediaPicker";
import { PublisherFormRow } from "./PublisherFormRow";
import { PublisherTabHeader } from "./PublisherTabHeader";

const ORG_TAB_GUIDE_STORAGE_KEY = "publisher-org-guide-seen-v1";

export function PublisherOrgTab({
    orgs,
    isLoading = false,
    selectedOrgId, setSelectedOrgId,
    handleCreateOrg, isCreatingOrg,
    handleDeleteOrg,
    orgDraft, setOrgDraft,
    handleSaveOrg, isSavingOrg,
    orgTagInput, setOrgTagInput,
    parseTags, addTags, getSuggestions, getTagStyle,
    tagOptions = [],
    orgMembers,
    orgInvites,
    orgRequests,
    canEditSelectedOrg = false,
    currentUserId,
    currentOrgRole,
    canManageOrgMembers = false,
    inviteSearchQuery,
    setInviteSearchQuery,
    inviteSearchResults,
    isInviteSearching,
    handleInviteMember,
    handleAcceptRequest,
    handleDeclineRequest,
    handleRemoveMember,
    handleRemovePersonaMember,
    handleChangeMemberRole
}) {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = React.useState("edit");
    const [tagOpen, setTagOpen] = React.useState(false);
    const [logoPreviewFailed, setLogoPreviewFailed] = React.useState(false);
    const [bannerPreviewFailed, setBannerPreviewFailed] = React.useState(false);
    const [logoUploadError, setLogoUploadError] = React.useState("");
    const [bannerUploadError, setBannerUploadError] = React.useState("");
    const [logoUploadWarning, setLogoUploadWarning] = React.useState("");
    const [bannerUploadWarning, setBannerUploadWarning] = React.useState("");
    const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState(false);
    const [mediaPickerTarget, setMediaPickerTarget] = React.useState(null); // 'logo' or 'banner'
    const [showGuide, setShowGuide] = React.useState(false);
    const [guideIndex, setGuideIndex] = React.useState(0);
    const [guideSpotlightRect, setGuideSpotlightRect] = React.useState(null);
    const logoGuide = React.useMemo(() => getImageUploadGuide("logo"), []);
    const bannerGuide = React.useMemo(() => getImageUploadGuide("banner"), []);
    const filteredTagOptions = React.useMemo(() => {
        const needle = orgTagInput.trim().toLowerCase();
        const names = (tagOptions || []).map(t => t.name).filter(Boolean);
        if (!needle) return names;
        return names.filter(n => n.toLowerCase().includes(needle));
    }, [tagOptions, orgTagInput]);

    const roleBadgeClass = (role) => {
        if (role === "owner") return "border-amber-300 bg-amber-50 text-amber-800";
        if (role === "admin") return "border-blue-300 bg-blue-50 text-blue-800";
        return "border-muted-foreground/30 bg-muted text-muted-foreground";
    };

    const roleLabel = (role) => {
        if (role === "owner") return "擁有者";
        if (role === "admin") return "管理員";
        return "一般成員";
    };
    const guideSteps = React.useMemo(() => ([
        {
            title: t("publisherOrgTab.guideListTitle"),
            description: t("publisherOrgTab.guideListDesc"),
            targetId: "org-guide-list",
        },
        {
            title: t("publisherOrgTab.guideBasicTitle"),
            description: t("publisherOrgTab.guideBasicDesc"),
            targetId: "org-guide-basic",
        },
        {
            title: t("publisherOrgTab.guideMembersTitle"),
            description: t("publisherOrgTab.guideMembersDesc"),
            targetId: "org-guide-members",
        },
        {
            title: t("publisherOrgTab.guideInviteTitle"),
            description: t("publisherOrgTab.guideInviteDesc"),
            targetId: "org-guide-invite",
            fallbackId: "org-guide-save",
        },
    ]), [t]);
    const currentGuide = showGuide ? guideSteps[guideIndex] : null;
    const isReadOnlyExistingOrg = viewMode === "edit" && Boolean(selectedOrgId) && !canEditSelectedOrg;

    const orgChecklist = React.useMemo(() => ([
        { key: "name", label: t("publisherOrgTab.checkName"), ok: Boolean(orgDraft.name?.trim()) },
        { key: "description", label: t("publisherOrgTab.checkDescription"), ok: Boolean(orgDraft.description?.trim()) },
        { key: "logoUrl", label: t("publisherOrgTab.checkLogo"), ok: Boolean(orgDraft.logoUrl?.trim()) },
        { key: "bannerUrl", label: t("publisherOrgTab.checkBanner"), ok: Boolean(orgDraft.bannerUrl?.trim()) },
        { key: "website", label: t("publisherOrgTab.checkWebsite"), ok: Boolean(orgDraft.website?.trim()) },
        { key: "tags", label: t("publisherOrgTab.checkTags"), ok: (orgDraft.tags || []).length > 0 },
    ]), [orgDraft, t]);
    const orgDone = orgChecklist.filter((item) => item.ok).length;
    const orgProgress = Math.round((orgDone / orgChecklist.length) * 100);
    const orgNextSteps = orgChecklist.filter((item) => !item.ok).slice(0, 3);

    const handleImageUpload = (field) => async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const ruleKey = field === "logoUrl" ? "logo" : "banner";
        const optimized = await optimizeImageForUpload(file, ruleKey);
        if (!optimized.ok) {
            if (field === "logoUrl") {
                setLogoUploadError(optimized.error || t("publisherOrgTab.invalidImage"));
                setLogoUploadWarning("");
            }
            if (field === "bannerUrl") {
                setBannerUploadError(optimized.error || t("publisherOrgTab.invalidImage"));
                setBannerUploadWarning("");
            }
            event.target.value = "";
            return;
        }
        try {
            const purpose = field === "logoUrl" ? "logo" : "banner";
            const uploaded = await uploadMediaObject(optimized.file, purpose);
            const nextUrl = String(uploaded?.url || "").trim();
            if (!nextUrl) throw new Error(t("mediaLibrary.uploadFailed"));
            setOrgDraft((prev) => ({ ...prev, [field]: nextUrl }));
            if (field === "logoUrl") {
                setLogoUploadError("");
                setLogoUploadWarning(optimized.warning || "");
                setLogoPreviewFailed(false);
            }
            if (field === "bannerUrl") {
                setBannerUploadError("");
                setBannerUploadWarning(optimized.warning || "");
                setBannerPreviewFailed(false);
            }
        } catch (error) {
            const errorMessage = error?.message || t("mediaLibrary.uploadFailed");
            if (field === "logoUrl") {
                setLogoUploadError(errorMessage);
                setLogoUploadWarning("");
            }
            if (field === "bannerUrl") {
                setBannerUploadError(errorMessage);
                setBannerUploadWarning("");
            }
        } finally {
            event.target.value = "";
        }
    };

    const handleTagPaste = (event) => {
        const text = event.clipboardData?.getData("text") || "";
        const incoming = parseTags(text);
        if (incoming.length <= 1) return;
        event.preventDefault();
        setOrgDraft({
            ...orgDraft,
            tags: addTags(orgDraft.tags || [], incoming),
        });
        setOrgTagInput("");
    };

    // Reset draft when selecting a new org
    React.useEffect(() => {
        if (selectedOrgId) {
            const org = orgs.find(o => o.id === selectedOrgId);
            if (org) {
                setOrgDraft({
                    id: org.id,
                    name: org.name || "",
                    description: org.description || "",
                    website: org.website || "",
                    logoUrl: org.logoUrl || "",
                    bannerUrl: org.bannerUrl || "",
                    tags: org.tags || []
                });
                setViewMode("edit");
                setTagOpen(false);
                setLogoPreviewFailed(false);
                setBannerPreviewFailed(false);
                setLogoUploadError("");
                setBannerUploadError("");
                setLogoUploadWarning("");
                setBannerUploadWarning("");
            }
        }
    }, [selectedOrgId, orgs]);

    const onStartCreate = () => {
        setSelectedOrgId(null);
        setOrgDraft({ id: "", name: "", description: "", website: "", logoUrl: "", bannerUrl: "", tags: [] });
        setViewMode("create");
    };

    const refreshGuideSpotlight = React.useCallback(() => {
        if (!showGuide) {
            setGuideSpotlightRect(null);
            return;
        }
        const target = currentGuide?.targetId ? document.getElementById(currentGuide.targetId) : null;
        const fallback = currentGuide?.fallbackId ? document.getElementById(currentGuide.fallbackId) : null;
        const node = target || fallback;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const pad = 10;
        setGuideSpotlightRect({
            top: Math.max(8, rect.top - pad),
            left: Math.max(8, rect.left - pad),
            width: Math.max(64, rect.width + pad * 2),
            height: Math.max(48, rect.height + pad * 2),
        });
    }, [currentGuide, showGuide]);

    const jumpGuide = React.useCallback((index) => {
        if (index < 0 || index >= guideSteps.length) return;
        setGuideIndex(index);
        setShowGuide(true);
    }, [guideSteps.length]);

    const finishGuide = React.useCallback(() => {
        setShowGuide(false);
        setGuideIndex(0);
        setGuideSpotlightRect(null);
        try {
            localStorage.setItem(ORG_TAB_GUIDE_STORAGE_KEY, "1");
        } catch (err) {
            console.error("Failed to persist org guide state", err);
        }
    }, []);

    const startGuide = React.useCallback(() => {
        jumpGuide(0);
    }, [jumpGuide]);

    const handleGuideNext = React.useCallback(() => {
        if (guideIndex >= guideSteps.length - 1) {
            finishGuide();
            return;
        }
        jumpGuide(guideIndex + 1);
    }, [finishGuide, guideIndex, guideSteps.length, jumpGuide]);

    const handleGuidePrev = React.useCallback(() => {
        if (guideIndex <= 0) return;
        jumpGuide(guideIndex - 1);
    }, [guideIndex, jumpGuide]);

    React.useEffect(() => {
        try {
            const seen = localStorage.getItem(ORG_TAB_GUIDE_STORAGE_KEY) === "1";
            if (!seen) {
                jumpGuide(0);
                localStorage.setItem(ORG_TAB_GUIDE_STORAGE_KEY, "1");
            }
        } catch (err) {
            console.error("Failed to read org guide state", err);
        }
    }, [jumpGuide]);

    React.useEffect(() => {
        if (!showGuide) return;
        const raf = window.requestAnimationFrame(refreshGuideSpotlight);
        window.addEventListener("resize", refreshGuideSpotlight);
        window.addEventListener("scroll", refreshGuideSpotlight, true);
        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener("resize", refreshGuideSpotlight);
            window.removeEventListener("scroll", refreshGuideSpotlight, true);
        };
    }, [showGuide, guideIndex, viewMode, selectedOrgId, canManageOrgMembers, refreshGuideSpotlight]);

    return (
        <Card className="flex flex-col md:flex-row h-auto min-h-0 md:min-h-[500px] overflow-hidden border">
            {/* Left Sidebar: List */}
            <div id="org-guide-list" className="w-full md:w-[280px] border-b md:border-b-0 md:border-r flex flex-col bg-muted/10">
                <div className="p-4 border-b flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                    <h3 className="font-semibold text-sm">{t("publisherOrgTab.orgList")}</h3>
                    <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={onStartCreate}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {isLoading && (
                        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>載入組織資料中...</span>
                        </div>
                    )}
                    {orgs.map(o => (
                        <div 
                            key={o.id} 
                            onClick={() => setSelectedOrgId(o.id)}
                            className={`p-3 rounded-lg border cursor-pointer hover:bg-background/80 hover:shadow-sm transition-all flex items-center gap-3 ${selectedOrgId === o.id ? "bg-background shadow-sm border-primary/50 ring-1 ring-primary/20" : "bg-transparent border-transparent hover:border-border/50"}`}
                        >
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
                                <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <div className="font-medium truncate text-sm flex-1">{o.name}</div>
                        </div>
                    ))}
                    
                    {orgs.length === 0 && (
                        <div className="text-center text-muted-foreground p-8 text-sm">
                            {t("publisherOrgTab.noOrg")}
                            <Button variant="link" size="sm" onClick={onStartCreate} className="mt-2 text-xs">{t("publisherOrgTab.createNow")}</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Main: Editor */}
            <div className="flex-1 flex flex-col overflow-hidden bg-card">
                 <div className="p-4 border-b bg-background/50 backdrop-blur-sm">
                    <PublisherTabHeader
                        title={viewMode === "create" ? t("publisherOrgTab.createOrg") : t("publisherOrgTab.editOrg")}
                        description="管理組織資料、成員權限與邀請審核。"
                        actions={<div className="flex items-center justify-end gap-2 min-w-[260px]">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={startGuide}
                        >
                            <CircleHelp className="w-3.5 h-3.5 mr-1.5" />
                            {t("publisherOrgTab.guide")}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 text-xs ${viewMode === "edit" && selectedOrgId ? "" : "invisible pointer-events-none"}`}
                            onClick={() => selectedOrgId && navigate(`/org/${selectedOrgId}`)}
                        >
                            {t("publisherOrgTab.viewOrgPage")}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`text-destructive hover:bg-destructive/10 h-8 text-xs ${viewMode === "edit" && selectedOrgId ? "" : "invisible pointer-events-none"}`}
                            disabled={isReadOnlyExistingOrg}
                            onClick={handleDeleteOrg}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> {t("publisherOrgTab.deleteOrg")}
                        </Button>
                    </div>}
                    />
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 md:p-5">
                     <div className="max-w-4xl mx-auto space-y-6 pb-16">
                        {(viewMode === "create" || selectedOrgId) ? (
                            <>
                                {isReadOnlyExistingOrg && (
                                    <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
                                        目前為唯讀檢視，你不是此組織的管理者或擁有者，無法修改設定。
                                    </div>
                                )}
                                <div className={isReadOnlyExistingOrg ? "space-y-0 opacity-90 pointer-events-none select-none" : "space-y-0"}>
                                {orgProgress < 100 && (
                                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{t("publisherOrgTab.progress")}</span>
                                            <span className="text-muted-foreground">{orgDone}/{orgChecklist.length} · {orgProgress}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-muted">
                                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${orgProgress}%` }} />
                                        </div>
                                        {orgNextSteps.length > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                {t("publisherOrgTab.nextSteps").replace("{items}", orgNextSteps.map((item) => item.label).join("、"))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Basic Info */}
                                <div className="space-y-4">
                                        <div id="org-guide-basic" className="grid gap-4">
                                            <PublisherFormRow label={t("publisherOrgTab.orgName")} required>
                                                <Input 
                                                    id="org-name"
                                                    name="orgName"
                                                    value={orgDraft.name} 
                                                    onChange={e => setOrgDraft({ ...orgDraft, name: e.target.value })}
                                                    placeholder={t("publisherOrgTab.orgNamePlaceholder")}
                                                    className="font-medium"
                                                />
                                            </PublisherFormRow>

                                            <PublisherFormRow label={t("publisherOrgTab.description")}>
                                                <Input 
                                                    id="org-description"
                                                    name="orgDescription"
                                                    value={orgDraft.description} 
                                                    onChange={e => setOrgDraft({ ...orgDraft, description: e.target.value })}
                                                    placeholder={t("publisherOrgTab.descriptionPlaceholder")}
                                                />
                                            </PublisherFormRow>
                                        
                                            <PublisherFormRow label={t("publisherOrgTab.website")}>
                                                <Input 
                                                    id="org-website"
                                                    name="orgWebsite"
                                                    value={orgDraft.website} 
                                                    onChange={e => setOrgDraft({ ...orgDraft, website: e.target.value })}
                                                    placeholder="https://"
                                                />
                                            </PublisherFormRow>
                                            <PublisherFormRow label={t("publisherOrgTab.logoUrl")}>
                                                <Input 
                                                    id="org-logo-url"
                                                    name="orgLogoUrl"
                                                    value={orgDraft.logoUrl} 
                                                    onChange={e => setOrgDraft({ ...orgDraft, logoUrl: e.target.value })}
                                                    placeholder="https://"
                                                />
                                                <div className="flex flex-wrap gap-2">
                                                    <label className="inline-flex w-fit cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
                                                        {t("publisherOrgTab.uploadLogo")}
                                                        <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={handleImageUpload("logoUrl")} />
                                                    </label>
                                                    <Button 
                                                        type="button" 
                                                        variant="secondary" 
                                                        size="sm" 
                                                        className="h-8 text-[11px] border bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                                                        onClick={() => {
                                                            setMediaPickerTarget('logo');
                                                            setIsMediaPickerOpen(true);
                                                        }}
                                                    >
                                                        {t("mediaLibrary.selectFromLibrary", "從媒體庫選擇")}
                                                    </Button>
                                                </div>
                                                <div className="space-y-0.5 text-[11px] text-muted-foreground">
                                                    <p>{logoGuide.supported}</p>
                                                    <p>{logoGuide.recommended}</p>
                                                </div>
                                                <div className="h-16 w-16 overflow-hidden rounded-md border bg-muted/20">
                                                    {orgDraft.logoUrl && !logoPreviewFailed ? (
                                                        <img
                                                            src={orgDraft.logoUrl}
                                                            alt="org logo preview"
                                                            className="h-full w-full object-cover"
                                                            onError={() => setLogoPreviewFailed(true)}
                                                            onLoad={() => setLogoPreviewFailed(false)}
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">Logo</div>
                                                    )}
                                                </div>
                                                <div className="min-h-[16px] text-[11px]">
                                                    {logoUploadError ? (
                                                        <p className="text-destructive">{logoUploadError}</p>
                                                    ) : logoUploadWarning ? (
                                                        <p className="text-amber-700 dark:text-amber-300">{logoUploadWarning}</p>
                                                    ) : logoPreviewFailed ? (
                                                        <p className="text-amber-700 dark:text-amber-300">{t("publisherOrgTab.previewFailed")}</p>
                                                    ) : (
                                                        <p className="opacity-0">placeholder</p>
                                                    )}
                                                </div>
                                            </PublisherFormRow>
                                            <PublisherFormRow label={t("publisherOrgTab.bannerUrl")}>
                                                <Input 
                                                    id="org-banner-url"
                                                    name="orgBannerUrl"
                                                    value={orgDraft.bannerUrl || ""} 
                                                    onChange={e => setOrgDraft({ ...orgDraft, bannerUrl: e.target.value })}
                                                    placeholder="https://"
                                                />
                                                <div className="flex flex-wrap gap-2">
                                                    <label className="inline-flex w-fit cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
                                                        {t("publisherOrgTab.uploadBanner")}
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
                                                <div className="h-20 overflow-hidden rounded-md border bg-muted/20">
                                                    {orgDraft.bannerUrl && !bannerPreviewFailed ? (
                                                        <img
                                                            src={orgDraft.bannerUrl}
                                                            alt="org banner preview"
                                                            className="h-full w-full object-cover"
                                                            onError={() => setBannerPreviewFailed(true)}
                                                            onLoad={() => setBannerPreviewFailed(false)}
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Banner</div>
                                                    )}
                                                </div>
                                                <div className="min-h-[16px] text-[11px]">
                                                    {bannerUploadError ? (
                                                        <p className="text-destructive">{bannerUploadError}</p>
                                                    ) : bannerUploadWarning ? (
                                                        <p className="text-amber-700 dark:text-amber-300">{bannerUploadWarning}</p>
                                                    ) : bannerPreviewFailed ? (
                                                        <p className="text-amber-700 dark:text-amber-300">{t("publisherOrgTab.bannerPreviewFailed")}</p>
                                                    ) : (
                                                        <p className="opacity-0">placeholder</p>
                                                    )}
                                                </div>
                                            </PublisherFormRow>
                                    </div>
                                    
                                        <PublisherFormRow label={t("publisherOrgTab.orgTags")}>
                                        <div className="border rounded-md p-3 bg-muted/10 space-y-2">
                                            <DndContext
                                                collisionDetection={closestCenter}
                                                onDragEnd={({ active, over }) => {
                                                    if (!over || active.id === over.id) return;
                                                    const items = orgDraft.tags || [];
                                                    const oldIndex = items.indexOf(active.id);
                                                    const newIndex = items.indexOf(over.id);
                                                    setOrgDraft({ ...orgDraft, tags: arrayMove(items, oldIndex, newIndex) });
                                                }}
                                            >
                                                <SortableContext items={orgDraft.tags || []} strategy={horizontalListSortingStrategy}>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(orgDraft.tags || []).map(tag => (
                                                            <SortableTag
                                                                key={tag}
                                                                id={tag}
                                                                style={getTagStyle(tag)}
                                                                onRemove={() => {
                                                                    setOrgDraft({
                                                                        ...orgDraft,
                                                                        tags: (orgDraft.tags || []).filter(t => t !== tag),
                                                                    });
                                                                }}
                                                            />
                                                        ))}
                                                        {(orgDraft.tags || []).length === 0 && (
                                                            <span className="text-sm text-muted-foreground">{t("publisherOrgTab.inputTagHint")}</span>
                                                        )}
                                                    </div>
                                                </SortableContext>
                                            </DndContext>
                                            <Popover open={tagOpen} onOpenChange={setTagOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button type="button" variant="outline" size="sm" className="w-fit">
                                                        {t("publisherOrgTab.addTag")}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[90vw] sm:w-80 p-2" align="start">
                                                    <div className="p-2">
                                                        <Input
                                                            id="org-tag-input"
                                                            name="orgTagInput"
                                                            aria-label={t("publisherOrgTab.addOrgTagAria")}
                                                            value={orgTagInput}
                                                            onChange={(e) => setOrgTagInput(e.target.value)}
                                                            onPaste={handleTagPaste}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter" || e.key === "," || e.key === "，") {
                                                                    e.preventDefault();
                                                                    const incoming = parseTags(orgTagInput);
                                                                    if (incoming.length === 0) return;
                                                                    setOrgDraft({
                                                                        ...orgDraft,
                                                                        tags: addTags(orgDraft.tags || [], incoming),
                                                                    });
                                                                    setOrgTagInput("");
                                                                    setTagOpen(false);
                                                                }
                                                            }}
                                                            placeholder={t("publisherOrgTab.searchOrAddTag")}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <div className="max-h-56 overflow-y-auto px-1 pb-1">
                                                        {orgTagInput.trim() && (
                                                            <button
                                                                type="button"
                                                                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent"
                                                                onClick={() => {
                                                                    const incoming = parseTags(orgTagInput);
                                                                    if (incoming.length === 0) return;
                                                                    setOrgDraft({
                                                                        ...orgDraft,
                                                                        tags: addTags(orgDraft.tags || [], incoming),
                                                                    });
                                                                    setOrgTagInput("");
                                                                    setTagOpen(false);
                                                                }}
                                                            >
                                                                {t("publisherOrgTab.addQuoted").replace("{value}", orgTagInput.trim())}
                                                            </button>
                                                        )}
                                                        {filteredTagOptions.map(name => {
                                                            const selected = (orgDraft.tags || []).includes(name);
                                                            return (
                                                            <button
                                                                key={name}
                                                                type="button"
                                                                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-accent ${
                                                                    selected ? "bg-accent/50" : ""
                                                                }`}
                                                                onClick={() => {
                                                                    if (selected) {
                                                                        setOrgDraft({
                                                                            ...orgDraft,
                                                                            tags: (orgDraft.tags || []).filter(t => t !== name),
                                                                        });
                                                                    } else {
                                                                        setOrgDraft({
                                                                            ...orgDraft,
                                                                            tags: addTags(orgDraft.tags || [], [name]),
                                                                        });
                                                                    }
                                                                    setOrgTagInput("");
                                                                }}
                                                            >
                                                                <span className="truncate">{name}</span>
                                                                <span
                                                                    className="inline-block h-2 w-2 rounded-full"
                                                                    style={{ backgroundColor: getTagStyle(name)?.backgroundColor || "#CBD5E1" }}
                                                                />
                                                            </button>
                                                            );
                                                        })}
                                                        {orgTagInput.trim() && filteredTagOptions.length === 0 && (
                                                            <div className="px-3 py-2 text-xs text-muted-foreground">{t("publisherOrgTab.noMatchedTag")}</div>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        </PublisherFormRow>

                                        <div id="org-guide-members">
                                        <PublisherFormRow label={t("publisherOrgTab.members")}>
                                            <div className="border rounded-md p-3 bg-muted/10 space-y-3">
                                                {isLoading && (
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        <span>正在同步成員資料...</span>
                                                    </div>
                                                )}
                                                <div className="text-xs text-muted-foreground">
                                                    {t("publisherOrgTab.memberCount")
                                                      .replace("{users}", String(orgMembers?.users?.length || 0))
                                                      .replace("{personas}", String(orgMembers?.personas?.length || 0))}
                                                </div>
                                                {(orgMembers?.users?.length || 0) === 0 && (orgMembers?.personas?.length || 0) === 0 ? (
                                                    <div className="text-sm text-muted-foreground">{t("publisherOrgTab.noMember")}</div>
                                                ) : (
                                                    <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                                                        <div className="rounded-md border bg-background/80 p-2.5 space-y-2">
                                                            <div className="text-xs font-medium text-muted-foreground">
                                                                帳號成員（{orgMembers?.users?.length || 0}）
                                                            </div>
                                                            {(orgMembers?.users || []).length === 0 ? (
                                                                <div className="text-xs text-muted-foreground">目前沒有帳號成員</div>
                                                            ) : (
                                                                (orgMembers?.users || []).map(u => (
                                                                    <div key={`u-${u.id}`} className="flex items-center justify-between text-sm">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                                                                                {(u.displayName || u.handle || "?")[0]?.toUpperCase?.() || "?"}
                                                                            </div>
                                                                            <span>{u.displayName || u.handle || u.email || t("publisherOrgTab.defaultUser")}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Badge variant="outline">{t("publisherOrgTab.user")}</Badge>
                                                                            <Badge className={roleBadgeClass(u.organizationRole)}>{roleLabel(u.organizationRole)}</Badge>
                                                                            {canManageOrgMembers && u.organizationRole !== "owner" && u.id !== currentUserId && (
                                                                                <>
                                                                                    <Select
                                                                                        value={u.organizationRole === "admin" ? "admin" : "member"}
                                                                                        onValueChange={(value) => handleChangeMemberRole?.(u.id, value)}
                                                                                    >
                                                                                        <SelectTrigger className="h-7 w-[104px] text-xs">
                                                                                            <SelectValue />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            <SelectItem value="member">一般成員</SelectItem>
                                                                                            <SelectItem value="admin">管理員</SelectItem>
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="ghost"
                                                                                        className="h-7 px-2 text-destructive hover:bg-destructive/10"
                                                                                        onClick={() => handleRemoveMember?.(u.id)}
                                                                                    >
                                                                                        移除
                                                                                    </Button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>

                                                        <div className="rounded-md border bg-background/80 p-2.5 space-y-2">
                                                            <div className="text-xs font-medium text-muted-foreground">
                                                                作者身份（{orgMembers?.personas?.length || 0}）
                                                            </div>
                                                            {(orgMembers?.personas || []).length === 0 ? (
                                                                <div className="text-xs text-muted-foreground">目前沒有作者身份</div>
                                                            ) : (
                                                                (orgMembers?.personas || []).map(p => (
                                                                    <div key={`p-${p.id}`} className="flex items-center justify-between text-sm">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                                                                                {(p.displayName || "?")[0]?.toUpperCase?.() || "?"}
                                                                            </div>
                                                                            <span>{p.displayName || t("publisherOrgTab.persona")}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Badge variant="secondary">{t("publisherOrgTab.author")}</Badge>
                                                                            <Badge className={roleBadgeClass(p.organizationRole)}>{roleLabel(p.organizationRole)}</Badge>
                                                                            {canManageOrgMembers && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="ghost"
                                                                                    className="h-7 px-2 text-destructive hover:bg-destructive/10"
                                                                                    onClick={() => handleRemovePersonaMember?.(p.id)}
                                                                                >
                                                                                    移除
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </PublisherFormRow>
                                        </div>

                                        {canManageOrgMembers && (
                                            <>
                                                <div id="org-guide-invite">
                                                <PublisherFormRow label={t("publisherOrgTab.inviteMember")}>
                                                    <div className="border rounded-md p-3 bg-muted/10 space-y-2">
                                                        <Input
                                                            id="org-invite-search"
                                                            name="orgInviteSearch"
                                                            aria-label={t("publisherOrgTab.inviteSearchAria")}
                                                            placeholder={t("publisherOrgTab.inviteSearchPlaceholder")}
                                                            value={inviteSearchQuery}
                                                            onChange={(e) => setInviteSearchQuery(e.target.value)}
                                                        />
                                                        {isInviteSearching && (
                                                            <div className="text-xs text-muted-foreground">{t("publisherOrgTab.searching")}</div>
                                                        )}
                                                        {inviteSearchResults?.length > 0 && (
                                                            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                                                                {inviteSearchResults.map(u => (
                                                                    <div key={u.id} className="flex items-center justify-between text-sm">
                                                                        <span>{u.displayName || u.handle || u.email || u.id}</span>
                                                                        <Button size="sm" onClick={() => handleInviteMember(u.id)}>{t("publisherOrgTab.invite")}</Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </PublisherFormRow>
                                                </div>

                                                <PublisherFormRow label={t("publisherOrgTab.pendingRequests")}>
                                                    <div className="border rounded-md p-3 bg-muted/10 space-y-2">
                                                        {(orgRequests || []).length === 0 ? (
                                                            <div className="text-sm text-muted-foreground">{t("publisherOrgTab.noRequests")}</div>
                                                        ) : (
                                                            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                                                                {(orgRequests || []).map(req => (
                                                                    <div key={req.id} className="flex items-center justify-between text-sm">
                                                                        <span>{t("publisherOrgTab.requester").replace("{value}", req.requester?.email || req.requester?.displayName || req.requesterUserId)}</span>
                                                                        <div className="flex gap-2">
                                                                            <Button size="sm" onClick={() => handleAcceptRequest(req.id)}>{t("publisherOrgTab.accept")}</Button>
                                                                            <Button size="sm" variant="ghost" onClick={() => handleDeclineRequest(req.id)}>{t("publisherOrgTab.decline")}</Button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </PublisherFormRow>

                                                <PublisherFormRow label={t("publisherOrgTab.sentInvites")}>
                                                    <div className="border rounded-md p-3 bg-muted/10 space-y-2">
                                                        {(orgInvites || []).length === 0 ? (
                                                            <div className="text-sm text-muted-foreground">{t("publisherOrgTab.noInvites")}</div>
                                                        ) : (
                                                            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                                                                {(orgInvites || []).map(inv => (
                                                                    <div key={inv.id} className="flex items-center justify-between text-sm">
                                                                        <span>{t("publisherOrgTab.inviteLabel").replace("{value}", inv.invitedUser?.email || inv.invitedUser?.displayName || inv.invitedUserId)}</span>
                                                                        <Badge variant="outline">{inv.status}</Badge>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </PublisherFormRow>
                                            </>
                                        )}
                                    </div>
                                
                                {/* Members */}
                                <div className="pt-4 border-t">
                                    <PublisherFormRow
                                        label={t("publisherOrgTab.memberManagement")}
                                        hint={t("publisherOrgTab.multiCollabSoon")}
                                    >
                                        <div className="p-6 text-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                            <div className="w-10 h-10 rounded-full bg-muted/30 mx-auto mb-2 flex items-center justify-center">
                                                <Building2 className="w-5 h-5 opacity-30" />
                                            </div>
                                            <Button variant="outline" size="sm" disabled className="h-8 text-xs">
                                                <Plus className="w-3 h-3 mr-1.5" /> {t("publisherOrgTab.inviteMember")}
                                            </Button>
                                        </div>
                                    </PublisherFormRow>
                                </div>

                                {/* Footer Actions */}
                                <div id="org-guide-save" className="p-3 border-t bg-background/50 backdrop-blur-sm flex justify-end mt-3">
                                    <Button 
                                        onClick={viewMode === "create" ? handleCreateOrg : handleSaveOrg} 
                                        disabled={(viewMode === "create" ? isCreatingOrg : isSavingOrg) || !orgDraft.name.trim()}
                                        className="min-w-[100px]"
                                    >
                                        {(viewMode === "create" ? isCreatingOrg : isSavingOrg) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {viewMode === "create" ? t("publisherOrgTab.createOrg") : t("publisherOrgTab.saveChanges")}
                                    </Button>
                                </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                                    <Plus className="w-8 h-8 text-muted-foreground/30" />
                                </div>
                                <p className="mb-2">{t("publisherOrgTab.selectOrgToEdit")}</p>
                                <Button variant="outline" onClick={onStartCreate}>{t("publisherOrgTab.orCreateNewOrg")}</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {showGuide && currentGuide && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[230] pointer-events-none">
                    {guideSpotlightRect ? (
                        <>
                            <div className="absolute left-0 top-0 bg-black/75 pointer-events-auto" style={{ width: "100%", height: guideSpotlightRect.top }} />
                            <div className="absolute left-0 bg-black/75 pointer-events-auto" style={{ top: guideSpotlightRect.top, width: guideSpotlightRect.left, height: guideSpotlightRect.height }} />
                            <div
                                className="absolute right-0 bg-black/75 pointer-events-auto"
                                style={{
                                    top: guideSpotlightRect.top,
                                    left: guideSpotlightRect.left + guideSpotlightRect.width,
                                    height: guideSpotlightRect.height,
                                }}
                            />
                            <div className="absolute left-0 bg-black/75 pointer-events-auto" style={{ top: guideSpotlightRect.top + guideSpotlightRect.height, width: "100%", bottom: 0 }} />
                            <div
                                className="absolute rounded-xl border-2 border-primary shadow-[0_0_40px_rgba(255,255,255,0.12)] pointer-events-none"
                                style={{
                                    top: guideSpotlightRect.top,
                                    left: guideSpotlightRect.left,
                                    width: guideSpotlightRect.width,
                                    height: guideSpotlightRect.height,
                                }}
                            />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-black/75 pointer-events-auto" />
                    )}
                    <div className="absolute right-6 bottom-6 w-[380px] max-w-[calc(100vw-3rem)] rounded-xl border bg-background p-4 shadow-2xl pointer-events-auto">
                        <div className="text-xs text-muted-foreground">{guideIndex + 1}/{guideSteps.length}</div>
                        <div className="text-base font-semibold mt-1">{currentGuide.title}</div>
                        <p className="text-sm text-muted-foreground mt-1">{currentGuide.description}</p>
                        <div className="mt-4 flex items-center justify-between gap-2">
                            <Button type="button" size="sm" variant="ghost" onClick={finishGuide}>
                                {t("publisherOrgTab.guideSkip")}
                            </Button>
                            <div className="flex items-center gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={handleGuidePrev} disabled={guideIndex === 0}>
                                    {t("publisherOrgTab.guidePrev")}
                                </Button>
                                <Button type="button" size="sm" onClick={handleGuideNext}>
                                    {guideIndex === guideSteps.length - 1 ? t("publisherOrgTab.guideDone") : t("publisherOrgTab.guideNext")}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            <MediaPicker
                open={isMediaPickerOpen}
                onOpenChange={setIsMediaPickerOpen}
                onSelect={(url) => {
                    if (mediaPickerTarget === 'logo') {
                        setOrgDraft(prev => ({ ...prev, logoUrl: url }));
                        setLogoPreviewFailed(false);
                        setLogoUploadError("");
                        setLogoUploadWarning("");
                    } else if (mediaPickerTarget === 'banner') {
                        setOrgDraft(prev => ({ ...prev, bannerUrl: url }));
                        setBannerPreviewFailed(false);
                        setBannerUploadError("");
                        setBannerUploadWarning("");
                    }
                }}
            />
        </Card>
    );
}
