import React from 'react';
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Trash2, Building2, CircleHelp } from "lucide-react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
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
                                    <div
                                        className="rounded-lg border px-3 py-2 text-xs"
                                        style={{
                                            borderColor: "var(--license-term-border)",
                                            backgroundColor: "var(--license-term-bg)",
                                            color: "var(--license-term-fg)",
                                        }}
                                    >
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
                                                setTags={(nextTags) => setOrgDraft({ ...orgDraft, tags: nextTags })}
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
        </Card>
    );
}
