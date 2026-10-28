import React, { Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CircleUserRound,
  Loader2,
  Megaphone,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { openPublicPath } from "../lib/publicNavigation";
import { usePublisherDashboardState } from "../hooks/publisher/usePublisherDashboardState";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { SpotlightGuideOverlay } from "../components/common/SpotlightGuideOverlay";
import { StudioTopbarQuickActions } from "../components/layout/StudioTopbarQuickActions";
import { CommunityAdApplicationForm } from "../components/community/CommunityAdApplicationForm";
import { TOPBAR_OUTER_CLASS } from "../components/layout/topbarLayout";
import {
  STUDIO_PAGE_CONTENT_CLASS,
  STUDIO_PAGE_PADDING_CLASS,
  STUDIO_TOPBAR_ACTIONS_CLASS,
  STUDIO_TOPBAR_INNER_CLASS,
  STUDIO_TOPBAR_ROW_CLASS,
  STUDIO_TOPBAR_SURFACE_CLASS,
  STUDIO_TOPBAR_TITLE_WRAP_CLASS,
} from "../components/layout/studioTopbarTokens";

const PublisherProfileTabLazy = React.lazy(async () => {
  const mod = await import("../components/dashboard/publisher/PublisherProfileTab");
  return { default: mod.PublisherProfileTab };
});
const PublisherOrgTabLazy = React.lazy(async () => {
  const mod = await import("../components/dashboard/publisher/PublisherOrgTab");
  return { default: mod.PublisherOrgTab };
});

const tabFallback = <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
const workbenchTabClass = "h-11 justify-start rounded-lg border border-transparent bg-background/75 px-3 text-muted-foreground transition-colors hover:bg-[color:var(--morandi-tone-helper-bg)]/55 hover:text-foreground data-[state=active]:border-[color:var(--morandi-tone-panel-border)] data-[state=active]:bg-[color:var(--morandi-tone-trigger-bg)] data-[state=active]:text-[color:var(--morandi-tone-trigger-fg)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--morandi-tone-helper-border)]";

export interface CommunityWorkbenchPageProps {
  isSidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  openMobileMenu?: () => void;
}

export default function CommunityWorkbenchPage({
  isSidebarOpen,
  setSidebarOpen,
  openMobileMenu,
}: CommunityWorkbenchPageProps): React.JSX.Element {
  const s = usePublisherDashboardState({ isSidebarOpen, setSidebarOpen, openMobileMenu, mode: "community" });
  const { currentUser, profile, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const isAdmin = Boolean(profile?.isAdmin);

  if (authLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />載入中…</div>;
  }

  const isDevPreview = import.meta.env.VITE_DEPLOY_ENV === "development";

  return (
    <div className="flex h-full flex-col bg-background">
      <div className={`${TOPBAR_OUTER_CLASS} ${STUDIO_TOPBAR_SURFACE_CLASS}`}>
        <div className={STUDIO_TOPBAR_INNER_CLASS}>
          <div className={STUDIO_TOPBAR_ROW_CLASS}>
            <div className="lg:hidden">
              <Button variant="ghost" size="icon" onClick={() => openMobileMenu?.()} title={t("publisher.expandMenu")}>
                <PanelLeftOpen className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
            <div className={`hidden lg:block ${isSidebarOpen ? "lg:hidden" : ""}`}>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen?.(true)} title={t("publisher.expandSidebar")}>
                <PanelLeftOpen className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
            <div className={STUDIO_TOPBAR_TITLE_WRAP_CLASS}>
              <div className="flex items-center gap-2">
                <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline-flex">Community</span>
                <h1 className="truncate font-serif text-lg font-semibold text-primary">社群工作台</h1>
                {isDevPreview && <Badge variant="outline" className="hidden sm:inline-flex">DEV 預覽</Badge>}
              </div>
            </div>
            <div className={STUDIO_TOPBAR_ACTIONS_CLASS}>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate("/superadmin")}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">超管工作台</span>
                </Button>
              )}
              <StudioTopbarQuickActions
                onOpenGuide={s.handleStartStudioGuide}
                onOpenGallery={() => openPublicPath("/")}
                guideLabel={s.t("publisher.guide")}
                galleryLabel={s.t("nav.gallery", "公開台本")}
                languageLabel={s.t("settings.language")}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto ${STUDIO_PAGE_PADDING_CLASS}`}>
        <div className={STUDIO_PAGE_CONTENT_CLASS}>
          {s.myInvites.length > 0 && (
            <div className="mb-4 rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 text-sm font-medium">{s.t("publisher.myOrgInvites")}</div>
              <div className="space-y-2">
                {s.myInvites.map((invite) => (
                  <div key={invite.id ?? ""} className="flex items-center justify-between gap-3 text-sm">
                    <span>{s.t("publisher.inviteJoinOrg").replace("{orgId}", invite.orgId || "")}</span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => s.handleAcceptInvite(invite.id ?? "")}>{s.t("publisher.accept")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => s.handleDeclineInvite(invite.id ?? "")}>{s.t("publisher.decline")}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Tabs value={s.activeTab} onValueChange={s.handleTabChange} className="space-y-4">
            <div className="sticky top-0 z-20 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-gradient-to-r from-[var(--morandi-tone-helper-bg)]/85 via-[var(--morandi-tone-helper-bg)]/45 to-background p-2.5 shadow-sm backdrop-blur">
              <TabsList ref={s.tabsGuideRef} className="grid h-auto w-full grid-cols-2 gap-1.5 bg-transparent p-0 md:grid-cols-3">
                <TabsTrigger value="profile" style={s.tabTone.profile} className={workbenchTabClass}>
                  <span className="flex items-center gap-2 text-xs sm:text-sm"><CircleUserRound className="h-4 w-4" /><span>{s.t("publisher.authorIdentity")}</span>{s.renderTabCount(s.tabCounts.profile)}</span>
                </TabsTrigger>
                <TabsTrigger value="org" style={s.tabTone.org} className={workbenchTabClass}>
                  <span className="flex items-center gap-2 text-xs sm:text-sm"><Building2 className="h-4 w-4" /><span>{s.t("publisher.organization")}</span>{s.renderTabCount(s.tabCounts.org)}</span>
                </TabsTrigger>
                <TabsTrigger value="advertising" className={workbenchTabClass}>
                  <span className="flex items-center gap-2 text-xs sm:text-sm"><Megaphone className="h-4 w-4" /><span>廣告申請</span></span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profile" style={s.tabTone.profile} className="rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3" data-guide-id="studio-profile-panel">
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

            <TabsContent value="org" style={s.tabTone.org} className="rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3" data-guide-id="studio-org-panel">
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

            <TabsContent value="advertising" className="rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3">
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
        </div>
      </div>
    </div>
  );
}
