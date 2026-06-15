import React from 'react';
import { Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../../ui/avatar";
import { MediaPicker } from "../../ui/MediaPicker";
import { ImageCropDialog } from "../../ui/ImageCropDialog";
import { PublisherTabHeader } from "./PublisherTabHeader";
import {
  PublisherSplitPanel, PublisherEntityListPane, PublisherEntityListItem,
  PublisherEmptyState, PublisherActionBar, PUBLISHER_CONTENT_STACK_CLASS,
} from "./PublisherEntityLayout";
import { PersonaProfileChecklist } from "./PersonaProfileChecklist";
import { PersonaProfileForm } from "./PersonaProfileForm";
import { usePublisherProfileState } from "../../../hooks/publisher/usePublisherProfileState";
import { getMediaCropStyle } from "../../../lib/mediaCropRef";
import { openPublicPath } from "../../../lib/publicNavigation";
import type { PersonaItem, PersonaDraft, OrgItem } from "../../../hooks/publisher/usePublisherProfileState";

interface TagOption { name: string; }

interface PublisherProfileTabProps {
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
  isLoading?: boolean;
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

export function PublisherProfileTab(props: PublisherProfileTabProps): React.JSX.Element {
  const {
    selectedPersonaId, setSelectedPersonaId, personas, selectedPersona,
    handleCreatePersona, isCreatingPersona, handleDeletePersona,
    personaDraft, setPersonaDraft, orgs, isLoading = false,
    personaTagInput, setPersonaTagInput, handleSaveProfile, isSavingProfile,
    parseTags, addTags, getSuggestions: _getSuggestions, getTagStyle, tagOptions = [],
  } = props;

  const state = usePublisherProfileState({
    selectedPersonaId, setSelectedPersonaId, personas, selectedPersona,
    handleCreatePersona, isCreatingPersona, handleDeletePersona,
    personaDraft, setPersonaDraft, orgs, personaTagInput, setPersonaTagInput,
    handleSaveProfile, isSavingProfile, parseTags, addTags,
    getSuggestions: _getSuggestions, getTagStyle, tagOptions,
  });

  const {
    t, viewMode, onStartCreate,
    orgSearchQuery, setOrgSearchQuery, orgSearchResults, isOrgSearching, myOrgRequests,
    avatarPreviewFailed, setAvatarPreviewFailed,
    bannerPreviewFailed, setBannerPreviewFailed,
    avatarUploadError, bannerUploadError, avatarUploadWarning, bannerUploadWarning,
    isMediaPickerOpen, setIsMediaPickerOpen, mediaPickerTarget, setMediaPickerTarget,
    cropOpen, setCropOpen, cropPurpose, cropTargetField, cropSource,
    avatarGuide, bannerGuide, hasPersona, filteredTagOptions, safeLinks,
    profileProgress, profileDone, profileNextSteps, missingRequiredFields, suggestedFields,
    jumpToRequiredField, applyUploadedImage, handleImageUpload, handleRequestJoinOrg, handleMediaPickerSelect, handleMediaPickerSelectMedia,
  } = state;

  const profileChecklistLength = 6; // matches hook's checklist array length

  return (
    <PublisherSplitPanel
      sidebar={(
        <PublisherEntityListPane
          id="publisher-persona-list"
          title={t("publisherProfileTab.authorList")}
          onCreate={onStartCreate}
          createAriaLabel={t("publisherProfileTab.createIdentity")}
          topActions={(
            <div className={`flex items-center gap-1 pb-1 ${viewMode === "edit" && selectedPersonaId ? "" : "invisible pointer-events-none h-0 overflow-hidden p-0 m-0"}`}>
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => selectedPersonaId && openPublicPath(`/author/${selectedPersonaId}`)}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                {t("publisherProfileTab.viewAuthorPage")}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:bg-destructive/10" onClick={handleDeletePersona}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {t("publisherProfileTab.deleteIdentity")}
              </Button>
            </div>
          )}
          isLoading={isLoading}
          loadingLabel="載入作者資料中..."
          emptyState={personas.length === 0 ? (
            <PublisherEmptyState
              title={t("publisherProfileTab.noPersona")}
              description={t("publisherProfileTab.emptyDemoDesc", "建立第一個作者身份後，可在公開頁展示頭像、簡介、連結與標籤。")}
              actionLabel={t("publisherProfileTab.createNow")}
              onAction={onStartCreate}
              className="mx-1"
            />
          ) : null}
        >
          {personas.map((p) => {
            const avatarCrop = getMediaCropStyle(
              String(p.avatar || ""),
              (p as { avatarCrop?: { cx?: number; cy?: number; zoom?: number } | null }).avatarCrop
            );
            return (
              <PublisherEntityListItem
                key={p.id}
                selected={selectedPersonaId === p.id}
                onClick={() => setSelectedPersonaId(p.id)}
                leading={
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={avatarCrop.src} style={avatarCrop.style as React.CSSProperties} />
                    <AvatarFallback>{p.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                }
                title={p.displayName}
              />
            );
          })}
        </PublisherEntityListPane>
      )}
      header={(
        <PublisherTabHeader
          title={viewMode === "create" ? t("publisherProfileTab.createIdentity") : t("publisherProfileTab.editIdentity")}
          description="編輯作者名稱、個人簡介、圖片與作者頁展示內容。"
        />
      )}
      footer={(viewMode === "create" || selectedPersonaId) ? (
        <PublisherActionBar>
          <Button
            onClick={viewMode === "create" ? handleCreatePersona : handleSaveProfile}
            disabled={(viewMode === "create" ? isCreatingPersona : isSavingProfile) || !personaDraft.displayName.trim()}
            className="min-w-[100px]"
          >
            {(viewMode === "create" ? isCreatingPersona : isSavingProfile) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {viewMode === "create" ? t("publisherProfileTab.createIdentityShort") : t("publisherProfileTab.saveChanges")}
          </Button>
        </PublisherActionBar>
      ) : null}
    >
      <div className={PUBLISHER_CONTENT_STACK_CLASS}>
        {(viewMode === "create" || selectedPersonaId) ? (
          <>
            <PersonaProfileChecklist
              t={t}
              profileProgress={profileProgress}
              profileDone={profileDone}
              profileChecklistLength={profileChecklistLength}
              profileNextSteps={profileNextSteps}
              missingRequiredFields={missingRequiredFields}
              suggestedFields={suggestedFields}
              jumpToRequiredField={jumpToRequiredField}
            />
            <PersonaProfileForm
              t={t}
              personaDraft={personaDraft} setPersonaDraft={setPersonaDraft}
              orgs={orgs} safeLinks={safeLinks}
              avatarPreviewFailed={avatarPreviewFailed} setAvatarPreviewFailed={setAvatarPreviewFailed}
              bannerPreviewFailed={bannerPreviewFailed} setBannerPreviewFailed={setBannerPreviewFailed}
              avatarUploadError={avatarUploadError} bannerUploadError={bannerUploadError}
              avatarUploadWarning={avatarUploadWarning} bannerUploadWarning={bannerUploadWarning}
              avatarGuide={avatarGuide} bannerGuide={bannerGuide}
              handleImageUpload={handleImageUpload}
              onOpenAvatarMediaPicker={() => { setMediaPickerTarget("avatar"); setIsMediaPickerOpen(true); }}
              onOpenBannerMediaPicker={() => { setMediaPickerTarget("banner"); setIsMediaPickerOpen(true); }}
              hasPersona={hasPersona}
              orgSearchQuery={orgSearchQuery} setOrgSearchQuery={setOrgSearchQuery}
              isOrgSearching={isOrgSearching} orgSearchResults={orgSearchResults}
              handleRequestJoinOrg={handleRequestJoinOrg} myOrgRequests={myOrgRequests}
              personaTagInput={personaTagInput} setPersonaTagInput={setPersonaTagInput}
              parseTags={parseTags} addTags={addTags} getTagStyle={getTagStyle}
              filteredTagOptions={filteredTagOptions}
            />
          </>
        ) : !hasPersona ? (
          <div className="h-[420px] flex items-center justify-center">
            <Card className="w-full max-w-xl border-dashed p-5">
              <div className="mb-4">
                <h4 className="text-base font-semibold">{t("publisherProfileTab.emptyDemoTitle", "這是作者身份示範")}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{t("publisherProfileTab.emptyDemoDesc", "建立第一個作者身份後，可在公開頁展示頭像、簡介、連結與標籤。")}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border"><AvatarFallback>D</AvatarFallback></Avatar>
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
                <Button onClick={onStartCreate}><Plus className="mr-1.5 h-4 w-4" />{t("publisherProfileTab.createNow")}</Button>
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
        )}
      </div>

      <MediaPicker
        open={isMediaPickerOpen} onOpenChange={setIsMediaPickerOpen}
        cropPurpose={mediaPickerTarget === "avatar" ? "avatar" : mediaPickerTarget === "banner" ? "banner" : null}
        onSelect={handleMediaPickerSelect}
        onSelectMedia={handleMediaPickerSelectMedia}
      />
      <ImageCropDialog
        open={cropOpen} onOpenChange={setCropOpen}
        source={cropSource} purpose={cropPurpose}
        onConfirm={async (croppedFile) => { if (!cropTargetField) return; await applyUploadedImage(croppedFile, cropTargetField); }}
      />
    </PublisherSplitPanel>
  );
}
