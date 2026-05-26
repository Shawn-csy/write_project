import React from 'react';
import { useNavigate } from "react-router-dom";
import { Loader2, Trash2, Building2, CircleHelp, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { MEDIA_FILE_ACCEPT } from "../../../lib/mediaLibrary";
import { getMediaCropStyle } from "../../../lib/mediaCropRef";
import { useI18n } from "../../../contexts/I18nContext";
import { MediaPicker } from "../../ui/MediaPicker";
import { PublisherFormRow } from "./PublisherFormRow";
import { PublisherTabHeader } from "./PublisherTabHeader";
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
import { usePublisherOrgTabState } from "../../../hooks/publisher/usePublisherOrgTabState";

interface OrgItem {
    id: string;
    name?: string;
    description?: string;
    website?: string;
    logoUrl?: string;
    bannerUrl?: string;
    tags?: string[];
}

interface OrgDraft {
    id: string;
    name: string;
    description: string;
    website: string;
    logoUrl: string;
    bannerUrl: string;
    tags: string[];
}

interface TagOption {
    name: string;
}

interface OrgMember {
  id: string;
  displayName?: string;
  handle?: string;
  email?: string;
  organizationRole?: string;
}

interface OrgInvite {
  id: string;
  invitedUser?: { email?: string; displayName?: string };
  invitedUserId?: string;
  status?: string;
}

interface OrgRequest {
  id: string;
  requester?: { email?: string; displayName?: string };
  requesterUserId?: string;
}

interface OrgMembersData {
    users?: OrgMember[];
    personas?: Array<Record<string, unknown>>;
}

interface PublisherOrgTabProps {
    orgs: OrgItem[];
    isLoading?: boolean;
    selectedOrgId: string | null;
    setSelectedOrgId: (id: string | null) => void;
    handleCreateOrg: () => void;
    isCreatingOrg: boolean;
    handleDeleteOrg: () => void;
    orgDraft: OrgDraft;
    setOrgDraft: React.Dispatch<React.SetStateAction<OrgDraft>>;
    handleSaveOrg: () => void;
    isSavingOrg: boolean;
    orgTagInput: string;
    setOrgTagInput: (value: string) => void;
    parseTags: (value: string) => string[];
    addTags: (next: string[] | string) => string[];
    getSuggestions: (value: string) => string[];
    getTagStyle: (tag: string) => React.CSSProperties;
    tagOptions?: TagOption[];
    orgMembers: OrgMembersData;
    orgInvites: OrgInvite[];
    orgRequests: OrgRequest[];
    canEditSelectedOrg?: boolean;
    currentUserId?: string;
    currentOrgRole?: string;
    canManageOrgMembers?: boolean;
    inviteSearchQuery: string;
    setInviteSearchQuery: (value: string) => void;
    inviteSearchResults: Array<{ id: string; [key: string]: unknown }>;
    isInviteSearching: boolean;
    handleInviteMember: (id: string) => void;
    handleAcceptRequest: (id: string) => void;
    handleDeclineRequest: (id: string) => void;
    handleRemoveMember: (id: string) => void;
    handleRemovePersonaMember: (id: string) => void;
    handleChangeMemberRole: (id: string, role: "admin" | "member") => void;
}

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
    currentOrgRole: _currentOrgRole,
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
}: PublisherOrgTabProps): React.JSX.Element {
    const { t } = useI18n();
    const navigate = useNavigate();

    const s = usePublisherOrgTabState({
        orgs, selectedOrgId, setSelectedOrgId,
        orgDraft, setOrgDraft,
        orgTagInput, tagOptions,
        canManageOrgMembers,
    });
    const logoCrop = getMediaCropStyle(String(orgDraft.logoUrl || ""));
    const bannerCrop = getMediaCropStyle(String(orgDraft.bannerUrl || ""));

    const isReadOnlyExistingOrg = s.viewMode === "edit" && Boolean(selectedOrgId) && !canEditSelectedOrg;

    return (
        <>
        <PublisherSplitPanel
            sidebar={(
                <PublisherEntityListPane
                    id="org-guide-list"
                    title={t("publisherOrgTab.orgList")}
                    onCreate={s.onStartCreate}
                    createAriaLabel={t("publisherOrgTab.createOrg")}
                    topActions={(
                        <div className={`flex items-center gap-1 pb-1 ${s.viewMode === "edit" && selectedOrgId ? "" : "invisible pointer-events-none h-0 overflow-hidden p-0 m-0"}`}>
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
                            onAction={s.onStartCreate}
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
                    title={s.viewMode === "create" ? t("publisherOrgTab.createOrg") : t("publisherOrgTab.editOrg")}
                    description="管理組織資料、成員權限與邀請審核。"
                    actions={<div className="flex min-w-[260px] items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={s.startGuide}
                        >
                            <CircleHelp className="mr-1.5 h-3.5 w-3.5" />
                            {t("publisherOrgTab.guide")}
                        </Button>
                    </div>}
                />
            )}
            footer={(s.viewMode === "create" || selectedOrgId) ? (
                <PublisherActionBar id="org-guide-save">
                    <Button
                        onClick={s.viewMode === "create" ? handleCreateOrg : handleSaveOrg}
                        disabled={(s.viewMode === "create" ? isCreatingOrg : isSavingOrg) || !orgDraft.name.trim()}
                        className="min-w-[100px]"
                    >
                        {(s.viewMode === "create" ? isCreatingOrg : isSavingOrg) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {s.viewMode === "create" ? t("publisherOrgTab.createOrg") : t("publisherOrgTab.saveChanges")}
                    </Button>
                </PublisherActionBar>
            ) : null}
        >
            <div className={PUBLISHER_CONTENT_STACK_CLASS}>
                {(s.viewMode === "create" || selectedOrgId) ? (
                    <>
                        {isReadOnlyExistingOrg && (
                            <div className="rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.1)] px-3 py-2.5 text-xs text-[hsl(var(--destructive))]">
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
                            {s.orgProgress < 100 && (
                                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{t("publisherOrgTab.progress")}</span>
                                        <span className="text-muted-foreground">{s.orgDone}/{s.orgChecklist.length} · {s.orgProgress}%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-muted">
                                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.orgProgress}%` }} />
                                    </div>
                                    {s.orgNextSteps.length > 0 && (
                                        <div className="text-xs text-muted-foreground">
                                            {t("publisherOrgTab.nextSteps").replace("{items}", s.orgNextSteps.map((item) => item.label).join("、"))}
                                        </div>
                                    )}
                                </div>
                            )}
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
                                                <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={s.handleImageUpload("logoUrl")} />
                                            </label>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 text-[11px] border bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                                                onClick={() => { s.setMediaPickerTarget("logo"); s.setIsMediaPickerOpen(true); }}
                                            >
                                                {t("mediaLibrary.selectFromLibrary", "從媒體庫選擇")}
                                            </Button>
                                        </div>
                                        <div className="space-y-0.5 text-[11px] text-muted-foreground">
                                            <p>{s.logoGuide.supported}</p>
                                            <p>{s.logoGuide.recommended}</p>
                                        </div>
                                        <div className="h-16 w-16 overflow-hidden rounded-md border bg-muted/20">
                                            {orgDraft.logoUrl && !s.logoPreviewFailed ? (
                                                <img
                                                    src={logoCrop.src}
                                                    style={logoCrop.style}
                                                    alt="org logo preview"
                                                    className="h-full w-full object-cover"
                                                    onError={() => s.setLogoPreviewFailed(true)}
                                                    onLoad={() => s.setLogoPreviewFailed(false)}
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">Logo</div>
                                            )}
                                        </div>
                                        <div className="min-h-[16px] text-[11px]">
                                            {s.logoUploadError ? (
                                                <p className="text-destructive">{s.logoUploadError}</p>
                                            ) : s.logoUploadWarning ? (
                                                <p className="text-[color:var(--license-term-fg)]">{s.logoUploadWarning}</p>
                                            ) : s.logoPreviewFailed ? (
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
                                                <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={s.handleImageUpload("bannerUrl")} />
                                            </label>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 text-[11px] border bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                                                onClick={() => { s.setMediaPickerTarget("banner"); s.setIsMediaPickerOpen(true); }}
                                            >
                                                {t("mediaLibrary.selectFromLibrary", "從媒體庫選擇")}
                                            </Button>
                                        </div>
                                        <div className="space-y-0.5 text-[11px] text-muted-foreground">
                                            <p>{s.bannerGuide.supported}</p>
                                            <p>{s.bannerGuide.recommended}</p>
                                        </div>
                                        <div className="h-20 overflow-hidden rounded-md border bg-muted/20">
                                            {orgDraft.bannerUrl && !s.bannerPreviewFailed ? (
                                                <img
                                                    src={bannerCrop.src}
                                                    style={bannerCrop.style}
                                                    alt="org banner preview"
                                                    className="h-full w-full object-cover"
                                                    onError={() => s.setBannerPreviewFailed(true)}
                                                    onLoad={() => s.setBannerPreviewFailed(false)}
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Banner</div>
                                            )}
                                        </div>
                                        <div className="min-h-[16px] text-[11px]">
                                            {s.bannerUploadError ? (
                                                <p className="text-destructive">{s.bannerUploadError}</p>
                                            ) : s.bannerUploadWarning ? (
                                                <p className="text-[color:var(--license-term-fg)]">{s.bannerUploadWarning}</p>
                                            ) : s.bannerPreviewFailed ? (
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
                                        filteredOptions={s.filteredTagOptions}
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
                            <Button variant="outline" onClick={s.onStartCreate}>{t("publisherOrgTab.orCreateNewOrg")}</Button>
                        </div>
                    </div>
                )}
            </div>
        </PublisherSplitPanel>

        <SpotlightGuideOverlay
            open={s.showGuide && Boolean(s.currentGuide)}
            zIndex={230}
            spotlightRect={s.guideSpotlightRect}
            currentStep={s.guideIndex + 1}
            totalSteps={s.guideSteps.length}
            title={s.currentGuide?.title}
            description={s.currentGuide?.description}
            onSkip={s.finishGuide}
            skipLabel={t("publisherOrgTab.guideSkip")}
            onPrev={s.handleGuidePrev}
            prevLabel={t("publisherOrgTab.guidePrev")}
            prevDisabled={s.guideIndex === 0}
            onNext={s.handleGuideNext}
            nextLabel={s.guideIndex === s.guideSteps.length - 1 ? t("publisherOrgTab.guideDone") : t("publisherOrgTab.guideNext")}
        />
        <MediaPicker
            open={s.isMediaPickerOpen}
            onOpenChange={s.setIsMediaPickerOpen}
            cropPurpose={s.mediaPickerTarget === "logo" ? "logo" : s.mediaPickerTarget === "banner" ? "banner" : null}
            onSelect={s.handleMediaPickerSelect}
        />
        <ImageCropDialog
            open={s.cropOpen}
            onOpenChange={s.setCropOpen}
            source={s.cropSource}
            purpose={s.cropPurpose}
            onConfirm={async (croppedFile) => {
                if (!s.cropTargetField || !croppedFile) return;
                await s.applyUploadedImage(croppedFile, s.cropTargetField);
            }}
        />
        </>
    );
}
