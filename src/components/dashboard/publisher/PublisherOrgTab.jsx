import React from 'react';
import { useNavigate } from "react-router-dom";
import { Loader2, Trash2, Building2, CircleHelp, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { optimizeImageForUpload, getImageUploadGuide, MEDIA_FILE_ACCEPT } from "../../../lib/mediaLibrary";
import { uploadMediaObject } from "../../../lib/api/media";
import { useI18n } from "../../../contexts/I18nContext";
import { MediaPicker } from "../../ui/MediaPicker";
import { PublisherFormRow } from "./PublisherFormRow";
import { PublisherTabHeader } from "./PublisherTabHeader";
import { usePublisherOrgGuide } from "../../../hooks/publisher/usePublisherOrgGuide";
import { PublisherOrgMembershipPanel } from "./PublisherOrgMembershipPanel";
import { PublisherTagEditor } from "./PublisherTagEditor";
import { SpotlightGuideOverlay } from "../../common/SpotlightGuideOverlay";
import { ImageCropDialog } from "../../ui/ImageCropDialog";
import {
    PublisherSplitPanel,
    PublisherEntityListPane,
    PublisherEntityListItem,
    PublisherEmptyState,
    PublisherActionBar,
    PUBLISHER_CONTENT_STACK_CLASS,
    PUBLISHER_SECTION_CARD_CLASS,
    PUBLISHER_DEMO_CARD_CLASS,
} from "./PublisherEntityLayout";

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
    const [logoPreviewFailed, setLogoPreviewFailed] = React.useState(false);
    const [bannerPreviewFailed, setBannerPreviewFailed] = React.useState(false);
    const [logoUploadError, setLogoUploadError] = React.useState("");
    const [bannerUploadError, setBannerUploadError] = React.useState("");
    const [logoUploadWarning, setLogoUploadWarning] = React.useState("");
    const [bannerUploadWarning, setBannerUploadWarning] = React.useState("");
    const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState(false);
    const [mediaPickerTarget, setMediaPickerTarget] = React.useState(null); // 'logo' or 'banner'
    const [cropOpen, setCropOpen] = React.useState(false);
    const [cropPurpose, setCropPurpose] = React.useState("logo");
    const [cropTargetField, setCropTargetField] = React.useState(null);
    const [cropSource, setCropSource] = React.useState(null);
    const logoGuide = React.useMemo(() => getImageUploadGuide("logo"), []);
    const bannerGuide = React.useMemo(() => getImageUploadGuide("banner"), []);
    const filteredTagOptions = React.useMemo(() => {
        const needle = orgTagInput.trim().toLowerCase();
        const names = (tagOptions || []).map(t => t.name).filter(Boolean);
        if (!needle) return names;
        return names.filter(n => n.toLowerCase().includes(needle));
    }, [tagOptions, orgTagInput]);

    const {
        showGuide,
        guideIndex,
        guideSteps,
        currentGuide,
        guideSpotlightRect,
        startGuide,
        finishGuide,
        handleGuidePrev,
        handleGuideNext,
    } = usePublisherOrgGuide({
        t,
        viewMode,
        selectedOrgId,
        canManageOrgMembers,
    });
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

    const applyUploadedImage = React.useCallback(async (file, field) => {
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
        }
    }, [t, setOrgDraft]);

    const handleImageUpload = (field) => async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCropTargetField(field);
        setCropPurpose(field === "logoUrl" ? "logo" : "banner");
        setCropSource({ file, name: file.name });
        setCropOpen(true);
        event.target.value = "";
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

    return (
        <>
        <PublisherSplitPanel
            sidebar={(
                <PublisherEntityListPane
                    id="org-guide-list"
                    title={t("publisherOrgTab.orgList")}
                    onCreate={onStartCreate}
                    createAriaLabel={t("publisherOrgTab.createOrg")}
                    topActions={(
                        <div className={`flex items-center gap-1 pb-1 ${viewMode === "edit" && selectedOrgId ? "" : "invisible pointer-events-none h-0 overflow-hidden p-0 m-0"}`}>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => selectedOrgId && navigate(`/org/${selectedOrgId}`)}
                            >
                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                {t("publisherOrgTab.viewOrgPage")}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                disabled={isReadOnlyExistingOrg}
                                onClick={handleDeleteOrg}
                            >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                {t("publisherOrgTab.deleteOrg")}
                            </Button>
                        </div>
                    )}
                    isLoading={isLoading}
                    loadingLabel="載入組織資料中..."
                    emptyState={orgs.length === 0 ? (
                        <PublisherEmptyState
                            title={t("publisherOrgTab.noOrg")}
                            description={t("publisherOrgTab.emptyDemoDesc", "尚未建立組織時，教學會先用示範資料帶你了解表單、成員與邀請區。")}
                            actionLabel={t("publisherOrgTab.createNow")}
                            onAction={onStartCreate}
                            className="mx-1"
                        />
                    ) : null}
                >
                    {orgs.map((o) => (
                        <PublisherEntityListItem
                            key={o.id}
                            selected={selectedOrgId === o.id}
                            onClick={() => setSelectedOrgId(o.id)}
                            leading={(
                                <div className="flex h-8 w-8 items-center justify-center rounded border border-primary/10 bg-primary/10">
                                    <Building2 className="h-4 w-4 text-primary" />
                                </div>
                            )}
                            title={o.name}
                        />
                    ))}
                </PublisherEntityListPane>
            )}
            header={(
                <PublisherTabHeader
                    title={viewMode === "create" ? t("publisherOrgTab.createOrg") : t("publisherOrgTab.editOrg")}
                    description="管理組織資料、成員權限與邀請審核。"
                    actions={<div className="flex min-w-[260px] items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={startGuide}
                        >
                            <CircleHelp className="mr-1.5 h-3.5 w-3.5" />
                            {t("publisherOrgTab.guide")}
                        </Button>
                    </div>}
                />
            )}
            footer={(viewMode === "create" || selectedOrgId) ? (
                <PublisherActionBar id="org-guide-save">
                    <Button
                        onClick={viewMode === "create" ? handleCreateOrg : handleSaveOrg}
                        disabled={(viewMode === "create" ? isCreatingOrg : isSavingOrg) || !orgDraft.name.trim()}
                        className="min-w-[100px]"
                    >
                        {(viewMode === "create" ? isCreatingOrg : isSavingOrg) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {viewMode === "create" ? t("publisherOrgTab.createOrg") : t("publisherOrgTab.saveChanges")}
                    </Button>
                </PublisherActionBar>
            ) : null}
        >
            <div className={PUBLISHER_CONTENT_STACK_CLASS}>
                        {(viewMode === "create" || selectedOrgId) ? (
                            <>
                                {isReadOnlyExistingOrg && (
                                    <div
                                        className="rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.1)] px-3 py-2.5 text-xs text-[hsl(var(--destructive))]"
                                    >
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                            <div className="space-y-0.5">
                                                <p className="font-semibold">目前為唯讀模式</p>
                                                <p>你不是此組織的管理者或擁有者，無法修改設定。</p>
                                            </div>
                                        </div>
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
                                                        <p className="text-[color:var(--license-term-fg)]">{logoUploadWarning}</p>
                                                    ) : logoPreviewFailed ? (
                                                        <p className="text-[color:var(--license-term-fg)]">{t("publisherOrgTab.previewFailed")}</p>
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
                                                        <p className="text-[color:var(--license-term-fg)]">{bannerUploadWarning}</p>
                                                    ) : bannerPreviewFailed ? (
                                                        <p className="text-[color:var(--license-term-fg)]">{t("publisherOrgTab.bannerPreviewFailed")}</p>
                                                    ) : (
                                                        <p className="opacity-0">placeholder</p>
                                                    )}
                                                </div>
                                            </PublisherFormRow>
                                    </div>
                                    
                                        <PublisherFormRow label={t("publisherOrgTab.orgTags")}>
                                            <PublisherTagEditor
                                                tags={orgDraft.tags || []}
                                                setTags={(nextTags) => setOrgDraft((prev) => ({ ...prev, tags: nextTags }))}
                                                tagInput={orgTagInput}
                                                setTagInput={setOrgTagInput}
                                                parseTags={parseTags}
                                                addTags={addTags}
                                                getTagStyle={getTagStyle}
                                                filteredOptions={filteredTagOptions}
                                                inputId="org-tag-input"
                                                inputName="orgTagInput"
                                                inputAriaLabel={t("publisherOrgTab.addOrgTagAria")}
                                                addTagLabel={t("publisherOrgTab.addTag")}
                                                inputPlaceholder={t("publisherOrgTab.searchOrAddTag")}
                                                addQuotedTemplate={t("publisherOrgTab.addQuoted")}
                                                noMatchedTagLabel={t("publisherOrgTab.noMatchedTag")}
                                                emptyHintLabel={t("publisherOrgTab.inputTagHint")}
                                            />
                                        </PublisherFormRow>

                                        <PublisherOrgMembershipPanel
                                            t={t}
                                            isLoading={isLoading}
                                            orgMembers={orgMembers}
                                            canManageOrgMembers={canManageOrgMembers}
                                            currentUserId={currentUserId}
                                            handleChangeMemberRole={handleChangeMemberRole}
                                            handleRemoveMember={handleRemoveMember}
                                            handleRemovePersonaMember={handleRemovePersonaMember}
                                            inviteSearchQuery={inviteSearchQuery}
                                            setInviteSearchQuery={setInviteSearchQuery}
                                            inviteSearchResults={inviteSearchResults}
                                            isInviteSearching={isInviteSearching}
                                            handleInviteMember={handleInviteMember}
                                            orgRequests={orgRequests}
                                            handleAcceptRequest={handleAcceptRequest}
                                            handleDeclineRequest={handleDeclineRequest}
                                            orgInvites={orgInvites}
                                        />
                                    </div>
                                
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className={PUBLISHER_DEMO_CARD_CLASS}>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-base font-semibold">{t("publisherOrgTab.emptyDemoTitle", "這是組織管理示範")}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {t("publisherOrgTab.emptyDemoDesc", "尚未建立組織時，教學會先用示範資料帶你了解表單、成員與邀請區。")}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div id="org-guide-basic" className={`${PUBLISHER_SECTION_CARD_CLASS} space-y-3`}>
                                    <div className="text-sm font-semibold">{t("publisherOrgTab.emptyDemoBasicTitle", "示範：組織基本資訊")}</div>
                                    <div className="grid gap-2 md:grid-cols-2">
                                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
                                            <div className="text-muted-foreground">組織名稱</div>
                                            <div className="font-medium">示範組織名稱</div>
                                        </div>
                                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
                                            <div className="text-muted-foreground">網站</div>
                                            <div className="font-medium">https://example.org</div>
                                        </div>
                                    </div>
                                </div>

                                <div id="org-guide-members" className={`${PUBLISHER_SECTION_CARD_CLASS} space-y-2`}>
                                    <div className="text-sm font-semibold">{t("publisherOrgTab.emptyDemoMembersTitle", "示範：成員與角色")}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {t("publisherOrgTab.emptyDemoMembersDesc", "這裡會顯示帳號成員、作者身份，以及每位成員的組織角色。")}
                                    </p>
                                </div>

                                <div id="org-guide-invite" className={`${PUBLISHER_SECTION_CARD_CLASS} space-y-2`}>
                                    <div className="text-sm font-semibold">{t("publisherOrgTab.emptyDemoInviteTitle", "示範：邀請與申請")}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {t("publisherOrgTab.emptyDemoInviteDesc", "這裡可搜尋帳號發送邀請，並處理加入申請。")}
                                    </p>
                                </div>

                                <div id="org-guide-save" className="flex items-center justify-between rounded-lg border bg-background/60 px-3 py-2">
                                    <span className="text-xs text-muted-foreground">{t("publisherOrgTab.selectOrgToEdit")}</span>
                                    <Button variant="outline" onClick={onStartCreate}>{t("publisherOrgTab.orCreateNewOrg")}</Button>
                                </div>
                            </div>
                        )}
                    </div>
        </PublisherSplitPanel>

            <SpotlightGuideOverlay
                open={showGuide && Boolean(currentGuide)}
                zIndex={230}
                spotlightRect={guideSpotlightRect}
                currentStep={guideIndex + 1}
                totalSteps={guideSteps.length}
                title={currentGuide?.title}
                description={currentGuide?.description}
                onSkip={finishGuide}
                skipLabel={t("publisherOrgTab.guideSkip")}
                onPrev={handleGuidePrev}
                prevLabel={t("publisherOrgTab.guidePrev")}
                prevDisabled={guideIndex === 0}
                onNext={handleGuideNext}
                nextLabel={guideIndex === guideSteps.length - 1 ? t("publisherOrgTab.guideDone") : t("publisherOrgTab.guideNext")}
            />
            <MediaPicker
                open={isMediaPickerOpen}
                onOpenChange={setIsMediaPickerOpen}
                cropPurpose={mediaPickerTarget === "logo" ? "logo" : mediaPickerTarget === "banner" ? "banner" : null}
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
        </>
    );
}
