import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { PanelLeftOpen, FileText, UserRound, Building2, Layers3 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { ScriptMetadataDialog } from "../components/dashboard/ScriptMetadataDialog";
import { PublisherWorksTab } from "../components/dashboard/publisher/PublisherWorksTab";
import { PublisherProfileTab } from "../components/dashboard/publisher/PublisherProfileTab";
import { PublisherOrgTab } from "../components/dashboard/publisher/PublisherOrgTab";
import { PublisherSeriesTab } from "../components/dashboard/publisher/PublisherSeriesTab";
import { SpotlightGuideOverlay } from "../components/common/SpotlightGuideOverlay";
import { TOPBAR_OUTER_CLASS } from "../components/layout/topbarLayout";
import {
  STUDIO_TOPBAR_ACTIONS_CLASS,
  STUDIO_TOPBAR_INNER_CLASS,
  STUDIO_PAGE_CONTENT_CLASS,
  STUDIO_PAGE_PADDING_CLASS,
  STUDIO_TOPBAR_ROW_CLASS,
  STUDIO_TOPBAR_SURFACE_CLASS,
  STUDIO_TOPBAR_TITLE_WRAP_CLASS,
} from "../components/layout/studioTopbarTokens";
import { StudioTopbarQuickActions } from "../components/layout/StudioTopbarQuickActions";
import { usePublisherDashboardState } from "../hooks/publisher/usePublisherDashboardState";

interface PublisherDashboardProps {
  isSidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  openMobileMenu?: () => void;
}

export function PublisherDashboard({ isSidebarOpen, setSidebarOpen, openMobileMenu }: PublisherDashboardProps): React.JSX.Element {
  const s = usePublisherDashboardState({ isSidebarOpen, setSidebarOpen, openMobileMenu });

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Topbar */}
      <div className={`${TOPBAR_OUTER_CLASS} ${STUDIO_TOPBAR_SURFACE_CLASS}`}>
        <div className={STUDIO_TOPBAR_INNER_CLASS}>
          <div className={STUDIO_TOPBAR_ROW_CLASS}>
            <div className="lg:hidden">
              <Button variant="ghost" size="icon" onClick={() => s.openMobileMenu?.()} title={s.t("publisher.expandMenu")}>
                <PanelLeftOpen className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
            <div className={`hidden lg:block ${s.isSidebarOpen ? "lg:hidden" : ""}`}>
              <Button variant="ghost" size="icon" onClick={() => s.setSidebarOpen?.(true)} title={s.t("publisher.expandSidebar")}>
                <PanelLeftOpen className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
            <div className={`hidden sm:block ${STUDIO_TOPBAR_TITLE_WRAP_CLASS}`}>
              <div className="flex items-center gap-2">
                <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline-flex">
                  Studio
                </span>
                <h1 className="truncate font-serif text-lg font-semibold text-primary">{s.t("publisher.title")}</h1>
              </div>
              <p className="mt-0.5 hidden truncate text-[11px] text-muted-foreground sm:block">
                作品、作者、組織與系列的發佈資料集中管理
              </p>
            </div>
            <div className={STUDIO_TOPBAR_ACTIONS_CLASS}>
              <StudioTopbarQuickActions
                onOpenGuide={s.handleStartStudioGuide}
                onOpenGallery={() => s.navigate("/")}
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

          {/* Invites banner */}
          {s.myInvites.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/20 mb-6">
              <div className="text-sm font-medium mb-2">{s.t("publisher.myOrgInvites")}</div>
              <div className="space-y-2">
                {s.myInvites.map(inv => (
                  <div key={inv.id ?? ""} className="flex items-center justify-between text-sm">
                    <span>{s.t("publisher.inviteJoinOrg").replace("{orgId}", inv.orgId || "")}</span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => s.handleAcceptInvite(inv.id ?? "")}>{s.t("publisher.accept")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => s.handleDeclineInvite(inv.id ?? "")}>{s.t("publisher.decline")}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={s.activeTab} onValueChange={s.handleTabChange} className="space-y-4">
            <div className="sticky top-0 z-20 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-gradient-to-r from-[var(--morandi-tone-helper-bg)]/85 via-[var(--morandi-tone-helper-bg)]/45 to-background p-2.5 shadow-sm backdrop-blur">
              <TabsList ref={s.tabsGuideRef} className="grid h-auto w-full grid-cols-2 gap-1.5 bg-transparent p-0 md:grid-cols-4">
                <TabsTrigger value="works" style={s.tabTone.works} className="h-11 justify-start rounded-lg border border-transparent bg-background/75 px-3 text-muted-foreground transition-colors hover:bg-[color:var(--morandi-tone-helper-bg)]/55 hover:text-foreground data-[state=active]:border-[color:var(--morandi-tone-panel-border)] data-[state=active]:bg-[color:var(--morandi-tone-trigger-bg)] data-[state=active]:text-[color:var(--morandi-tone-trigger-fg)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--morandi-tone-helper-border)]">
                  <span className="flex items-center gap-2 text-xs sm:text-sm">
                    <FileText className="h-4 w-4" />
                    <span>{s.t("publisher.myWorks")}</span>
                    {s.renderTabCount(s.tabCounts.works)}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="profile" style={s.tabTone.profile} className="h-11 justify-start rounded-lg border border-transparent bg-background/75 px-3 text-muted-foreground transition-colors hover:bg-[color:var(--morandi-tone-helper-bg)]/55 hover:text-foreground data-[state=active]:border-[color:var(--morandi-tone-panel-border)] data-[state=active]:bg-[color:var(--morandi-tone-trigger-bg)] data-[state=active]:text-[color:var(--morandi-tone-trigger-fg)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--morandi-tone-helper-border)]">
                  <span className="flex items-center gap-2 text-xs sm:text-sm">
                    <UserRound className="h-4 w-4" />
                    <span>{s.t("publisher.authorIdentity")}</span>
                    {s.renderTabCount(s.tabCounts.profile)}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="org" style={s.tabTone.org} className="h-11 justify-start rounded-lg border border-transparent bg-background/75 px-3 text-muted-foreground transition-colors hover:bg-[color:var(--morandi-tone-helper-bg)]/55 hover:text-foreground data-[state=active]:border-[color:var(--morandi-tone-panel-border)] data-[state=active]:bg-[color:var(--morandi-tone-trigger-bg)] data-[state=active]:text-[color:var(--morandi-tone-trigger-fg)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--morandi-tone-helper-border)]">
                  <span className="flex items-center gap-2 text-xs sm:text-sm">
                    <Building2 className="h-4 w-4" />
                    <span>{s.t("publisher.organization")}</span>
                    {s.renderTabCount(s.tabCounts.org)}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="series" style={s.tabTone.series} className="h-11 justify-start rounded-lg border border-transparent bg-background/75 px-3 text-muted-foreground transition-colors hover:bg-[color:var(--morandi-tone-helper-bg)]/55 hover:text-foreground data-[state=active]:border-[color:var(--morandi-tone-panel-border)] data-[state=active]:bg-[color:var(--morandi-tone-trigger-bg)] data-[state=active]:text-[color:var(--morandi-tone-trigger-fg)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--morandi-tone-helper-border)]">
                  <span className="flex items-center gap-2 text-xs sm:text-sm">
                    <Layers3 className="h-4 w-4" />
                    <span>系列管理</span>
                    {s.renderTabCount(s.tabCounts.series)}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="works" style={s.tabTone.works} className="space-y-4 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3" data-guide-id="studio-works-panel">
              <PublisherWorksTab
                isLoading={s.isWorksLoading}
                scripts={s.scripts}
                personas={s.personas}
                setEditingScript={s.setEditingScript}
                navigate={s.navigate}
                formatDate={s.formatDate}
                onContinueEdit={(script) => s.navigate(`/edit/${script.id}?mode=edit`)}
              />
            </TabsContent>

            <TabsContent value="profile" style={s.tabTone.profile} className="rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3" data-guide-id="studio-profile-panel">
              <PublisherProfileTab
                selectedPersonaId={s.selectedPersonaId} setSelectedPersonaId={s.setSelectedPersonaId}
                personas={s.personas}
                selectedPersona={s.personas.find(p => p.id === s.selectedPersonaId) ?? null}
                handleCreatePersona={s.handleCreatePersona} isCreatingPersona={s.isCreatingPersona}
                handleDeletePersona={() => s.setConfirmDeletePersonaOpen(true)}
                personaDraft={s.personaDraft} setPersonaDraft={s.setPersonaDraft}
                orgs={s.orgsForPersona}
                isLoading={s.isMetaLoading}
                personaTagInput={s.personaTagInput} setPersonaTagInput={s.setPersonaTagInput}
                handleSaveProfile={s.handleSaveProfile} isSavingProfile={s.isSavingProfile}
                parseTags={s.parseTags}
                addTags={s.addTags}
                getSuggestions={(input: string) => s.getSuggestions(input, s.personaDraft.tags || [])}
                getTagStyle={s.getTagStyle}
                tagOptions={s.availableTags}
              />
            </TabsContent>

            <ScriptMetadataDialog
              open={!!s.editingScript}
              onOpenChange={(open) => !open && s.closePublishDialog()}
              script={s.editingScript}
              scriptId={typeof s.editingScript?.id === "string" ? s.editingScript.id : undefined}
              seriesOptions={s.seriesList.map((item) => ({ id: item.id, name: item.name || "" }))}
              preloadedData={{ personas: s.personas, orgs: s.orgsForPersona }}
              onSeriesCreated={(createdSeries) => {
                if (!createdSeries?.id) return;
                s.setSeriesList((prev) => {
                  const exists = prev.some((item) => item.id === createdSeries.id);
                  return exists ? prev : [createdSeries, ...prev];
                });
                s.setSelectedSeriesId(createdSeries.id);
              }}
              onSave={(updatedScript) => {
                s.closePublishDialog();
                s.setScripts(prev => prev.map(sc => sc.id === updatedScript.id ? { ...sc, ...updatedScript } : sc));
              }}
            />

            <TabsContent value="org" style={s.tabTone.org} className="rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3" data-guide-id="studio-org-panel">
              <PublisherOrgTab
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
                getTagStyle={s.getTagStyle}
                tagOptions={s.availableTags}
                isLoading={s.isMetaLoading || s.isOrgMembersLoading}
                orgMembers={s.orgMembers}
                orgInvites={s.orgInvites}
                orgRequests={s.orgRequests}
                canEditSelectedOrg={s.canManageOrgMembers}
                currentUserId={s.currentUserId}
                currentOrgRole={s.currentOrgRole}
                canManageOrgMembers={s.canManageOrgMembers}
                inviteSearchQuery={s.inviteSearchQuery}
                setInviteSearchQuery={s.setInviteSearchQuery}
                inviteSearchResults={s.inviteSearchResults}
                isInviteSearching={s.isInviteSearching}
                handleInviteMember={s.handleInviteMember}
                handleAcceptRequest={s.handleAcceptRequest}
                handleDeclineRequest={s.handleDeclineRequest}
                handleRemoveMember={s.handleRemoveMember}
                handleRemovePersonaMember={s.handleRemovePersonaMember}
                handleChangeMemberRole={s.handleChangeMemberRole}
              />
            </TabsContent>

            <TabsContent value="series" style={s.tabTone.series} className="rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3">
              <PublisherSeriesTab
                seriesList={s.seriesList}
                selectedSeriesId={s.selectedSeriesId}
                setSelectedSeriesId={s.setSelectedSeriesId}
                seriesDraft={s.seriesDraft}
                setSeriesDraft={s.setSeriesDraft}
                seriesScripts={(s.scripts || [])
                  .filter((script) => script.seriesId === s.selectedSeriesId)
                  .map((script) => ({ ...script, seriesOrder: script.seriesOrder ?? undefined }))
                  .sort((a, b) => {
                    const aOrder = Number.isFinite(Number(a.seriesOrder)) ? Number(a.seriesOrder) : Number.MAX_SAFE_INTEGER;
                    const bOrder = Number.isFinite(Number(b.seriesOrder)) ? Number(b.seriesOrder) : Number.MAX_SAFE_INTEGER;
                    if (aOrder !== bOrder) return aOrder - bOrder;
                    return Number(b.lastModified || 0) - Number(a.lastModified || 0);
                  })}
                onDetachScript={s.handleDetachScriptFromSeries}
                onCreateSeries={s.handleCreateSeries}
                onUpdateSeries={s.handleUpdateSeries}
                onDeleteSeries={s.handleDeleteSeries}
                isSaving={s.isSavingSeries}
              />
            </TabsContent>
          </Tabs>

          {/* Delete persona dialog */}
          <Dialog open={s.confirmDeletePersonaOpen} onOpenChange={s.setConfirmDeletePersonaOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{s.t("publisher.deletePersonaTitle")}</DialogTitle>
                <DialogDescription>{s.t("publisher.deletePersonaDesc")}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => s.setConfirmDeletePersonaOpen(false)}>{s.t("publisher.cancel")}</Button>
                <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={s.handleDeletePersona}>{s.t("publisher.confirmDelete")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete org dialog */}
          <Dialog open={s.confirmDeleteOrgOpen} onOpenChange={s.setConfirmDeleteOrgOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{s.t("publisher.deleteOrgTitle")}</DialogTitle>
                <DialogDescription>{s.t("publisher.deleteOrgDesc")}</DialogDescription>
              </DialogHeader>
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
