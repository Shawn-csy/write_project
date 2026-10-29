import React, { Suspense } from "react";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { usePublisherDashboardState } from "../hooks/publisher/usePublisherDashboardState";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { SpotlightGuideOverlay } from "../components/common/SpotlightGuideOverlay";
import { CommunityAdApplicationForm } from "../components/community/CommunityAdApplicationForm";
import { StudioPage, StudioPageHeader } from "../components/studio/StudioPage";

const PublisherProfileTabLazy = React.lazy(async () => {
  const mod = await import("../components/dashboard/publisher/PublisherProfileTab");
  return { default: mod.PublisherProfileTab };
});
const PublisherOrgTabLazy = React.lazy(async () => {
  const mod = await import("../components/dashboard/publisher/PublisherOrgTab");
  return { default: mod.PublisherOrgTab };
});

const tabFallback = <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
const underlineTabClass = "-mb-px h-11 shrink-0 gap-2 rounded-none border-b-2 border-transparent bg-transparent px-1 text-sm text-muted-foreground shadow-none hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none";

export default function CommunityWorkbenchPage(): React.JSX.Element {
  const s = usePublisherDashboardState({ mode: "community" });
  const { currentUser, profile, loading: authLoading } = useAuth();
  const { t } = useI18n();

  if (authLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />載入中…</div>;
  }

  const isDevPreview = import.meta.env.VITE_DEPLOY_ENV === "development";

  return (
    <StudioPage width="wide">
      <StudioPageHeader
        title={t("nav.identity", "公開身份")}
        description="你在公開台本上的筆名、介紹、組織與推廣申請。一個帳號可以有多個身份。"
        meta={isDevPreview ? <Badge variant="outline">DEV 預覽</Badge> : null}
      />
          {s.myInvites.length > 0 && (
            <div className="mb-6 space-y-2" role="region" aria-label={s.t("publisher.myOrgInvites")}>
              {s.myInvites.map((invite) => (
                <div key={invite.id ?? ""} className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[hsl(var(--status-ready-fg))]/25 bg-[hsl(var(--status-ready-bg))] px-4 py-3 text-sm">
                  <Building2 className="h-4 w-4 shrink-0 text-[hsl(var(--status-ready-fg))]" aria-hidden="true" />
                  <span className="min-w-[12rem] flex-1">{s.t("publisher.inviteJoinOrg").replace("{orgId}", invite.orgId || "")}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => s.handleDeclineInvite(invite.id ?? "")}>{s.t("publisher.decline")}</Button>
                    <Button size="sm" onClick={() => s.handleAcceptInvite(invite.id ?? "")}>{s.t("publisher.accept")}</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Tabs value={s.activeTab} onValueChange={s.handleTabChange} className="space-y-6">
            <TabsList ref={s.tabsGuideRef} className="flex h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
              <TabsTrigger value="profile" className={underlineTabClass}>
                {s.t("publisher.authorIdentity")}{s.renderTabCount(s.tabCounts.profile)}
              </TabsTrigger>
              <TabsTrigger value="org" className={underlineTabClass}>
                {s.t("publisher.organization")}{s.renderTabCount(s.tabCounts.org)}
              </TabsTrigger>
              <TabsTrigger value="advertising" className={underlineTabClass}>
                推廣申請
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-0" data-guide-id="studio-profile-panel">
              <Suspense fallback={tabFallback}>
                <PublisherProfileTabLazy
                  selectedPersonaId={s.selectedPersonaId} setSelectedPersonaId={s.setSelectedPersonaId}
                  personas={s.personas}
                  selectedPersona={s.personas.find((persona) => persona.id === s.selectedPersonaId) ?? null}
                  handleCreatePersona={s.handleCreatePersona} isCreatingPersona={s.isCreatingPersona}
                  handleDeletePersona={() => s.setConfirmDeletePersonaOpen(true)}
                  personaDraft={s.personaDraft} setPersonaDraft={s.setPersonaDraft}
                  orgs={s.orgsForPersona}
                  isLoading={s.isMetaLoading}
                  personaTagInput={s.personaTagInput} setPersonaTagInput={s.setPersonaTagInput}
                  handleSaveProfile={s.handleSaveProfile} isSavingProfile={s.isSavingProfile}
                  parseTags={s.parseTags} addTags={s.addTags}
                  getSuggestions={(input: string) => s.getSuggestions(input, s.personaDraft.tags || [])}
                  getTagStyle={s.getTagStyle} tagOptions={s.availableTags}
                />
              </Suspense>
            </TabsContent>

            <TabsContent value="org" className="mt-0" data-guide-id="studio-org-panel">
              <Suspense fallback={tabFallback}>
                <PublisherOrgTabLazy
                  orgs={s.orgsForPersona}
                  selectedOrgId={s.selectedOrgId} setSelectedOrgId={s.setSelectedOrgId}
                  handleCreateOrg={s.handleCreateOrg} isCreatingOrg={s.isCreatingOrg}
                  handleDeleteOrg={() => s.setConfirmDeleteOrgOpen(true)}
                  orgDraft={s.orgDraft} setOrgDraft={s.setOrgDraft}
                  handleSaveOrg={s.handleSaveOrg} isSavingOrg={s.isSavingOrg}
                  orgTagInput={s.orgTagInput} setOrgTagInput={s.setOrgTagInput}
                  parseTags={s.parseTags}
                  addTags={(next: string | string[]) => {
                    const incoming = Array.isArray(next) ? next : s.parseTags(next);
                    return s.addTags(s.orgDraft.tags || [], incoming);
                  }}
                  getSuggestions={(input: string) => s.getSuggestions(input, s.orgDraft.tags || [])}
                  getTagStyle={s.getTagStyle} tagOptions={s.availableTags}
                  isLoading={s.isMetaLoading || s.isOrgMembersLoading}
                  orgMembers={s.orgMembers} orgInvites={s.orgInvites} orgRequests={s.orgRequests}
                  canEditSelectedOrg={s.canManageOrgMembers}
                  currentUserId={s.currentUserId} currentOrgRole={s.currentOrgRole}
                  canManageOrgMembers={s.canManageOrgMembers}
                  inviteSearchQuery={s.inviteSearchQuery} setInviteSearchQuery={s.setInviteSearchQuery}
                  inviteSearchResults={s.inviteSearchResults} isInviteSearching={s.isInviteSearching}
                  handleInviteMember={s.handleInviteMember}
                  handleAcceptRequest={s.handleAcceptRequest} handleDeclineRequest={s.handleDeclineRequest}
                  handleRemoveMember={s.handleRemoveMember}
                  handleRemovePersonaMember={s.handleRemovePersonaMember}
                  handleChangeMemberRole={s.handleChangeMemberRole}
                />
              </Suspense>
            </TabsContent>

            <TabsContent value="advertising" className="mt-0 max-w-3xl">
              <CommunityAdApplicationForm
                personas={s.personas}
                organizations={s.orgsForPersona}
                contactName={String(profile?.displayName || currentUser?.displayName || "")}
                contactEmail={String(profile?.email || currentUser?.email || "")}
                onOpenProfiles={() => s.handleTabChange("profile")}
              />
            </TabsContent>
          </Tabs>

          <Dialog open={s.confirmDeletePersonaOpen} onOpenChange={s.setConfirmDeletePersonaOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{s.t("publisher.deletePersonaTitle")}</DialogTitle><DialogDescription>{s.t("publisher.deletePersonaDesc")}</DialogDescription></DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => s.setConfirmDeletePersonaOpen(false)}>{s.t("publisher.cancel")}</Button>
                <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={s.handleDeletePersona}>{s.t("publisher.confirmDelete")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={s.confirmDeleteOrgOpen} onOpenChange={s.setConfirmDeleteOrgOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{s.t("publisher.deleteOrgTitle")}</DialogTitle><DialogDescription>{s.t("publisher.deleteOrgDesc")}</DialogDescription></DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => s.setConfirmDeleteOrgOpen(false)}>{s.t("publisher.cancel")}</Button>
                <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={s.handleDeleteOrg}>{s.t("publisher.confirmDelete")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <SpotlightGuideOverlay
            open={s.showStudioGuide && Boolean(s.currentStudioGuide)}
            zIndex={220}
            spotlightRect={s.studioSpotlightRect}
            currentStep={s.studioGuideIndex + 1}
            totalSteps={s.studioGuideSteps.length}
            title={s.currentStudioGuide?.title}
            description={s.currentStudioGuide?.description}
            onSkip={s.finishStudioGuide}
            skipLabel={s.t("publisher.guideSkip")}
            onPrev={s.handleStudioGuidePrev}
            prevLabel={s.t("publisher.guidePrev")}
            prevDisabled={s.studioGuideIndex === 0}
            onNext={s.handleStudioGuideNext}
            nextLabel={s.studioGuideIndex === s.studioGuideSteps.length - 1 ? s.t("publisher.guideDone") : s.t("publisher.guideNext")}
          />
    </StudioPage>
  );
}
