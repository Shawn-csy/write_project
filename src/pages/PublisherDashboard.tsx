import React, { Suspense } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { PanelLeftOpen, FileText, Layers3, ExternalLink } from "lucide-react";
import { PublisherWorksTab } from "../components/dashboard/publisher/PublisherWorksTab";
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
import { openPublicPath } from "../lib/publicNavigation";
import { deriveChapterRows } from "../lib/publisher/seriesEditorModel";

const ScriptMetadataDialogLazy = React.lazy(async () => {
  const mod = await import("../components/dashboard/ScriptMetadataDialog");
  return { default: mod.ScriptMetadataDialog };
});
const PublisherSeriesTabLazy = React.lazy(async () => {
  const mod = await import("../components/dashboard/publisher/PublisherSeriesTab");
  return { default: mod.PublisherSeriesTab };
});
const StudioExternalScriptsTabLazy = React.lazy(async () => {
  const mod = await import("../components/dashboard/publisher/StudioExternalScriptsTab");
  return { default: mod.StudioExternalScriptsTab };
});

const tabFallback = <div className="p-6 text-sm text-muted-foreground">Loading...</div>;

interface PublisherDashboardProps {
  isSidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  openMobileMenu?: () => void;
}

export function PublisherDashboard({ isSidebarOpen, setSidebarOpen, openMobileMenu }: PublisherDashboardProps): React.JSX.Element {
  const s = usePublisherDashboardState({ isSidebarOpen, setSidebarOpen, openMobileMenu, mode: "studio" });

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
            <div className={STUDIO_TOPBAR_TITLE_WRAP_CLASS}>
              <div className="flex items-center gap-2">
                <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline-flex">
                  Studio
                </span>
                <h1 className="truncate text-sm font-semibold text-foreground sm:text-lg">{s.t("publisher.title")}</h1>
              </div>
            </div>
            <div className={STUDIO_TOPBAR_ACTIONS_CLASS}>
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

          {/* Tabs */}
          <Tabs value={s.activeTab} onValueChange={s.handleTabChange} className="space-y-4">
            <div className="sticky top-0 z-20 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-gradient-to-r from-[var(--morandi-tone-helper-bg)]/85 via-[var(--morandi-tone-helper-bg)]/45 to-background p-1.5 backdrop-blur">
              <TabsList ref={s.tabsGuideRef} className="grid h-auto w-full grid-cols-3 gap-1.5 bg-transparent p-0">
                <TabsTrigger value="works" style={s.tabTone.works} className="h-10 sm:h-8 justify-start rounded-lg border border-transparent bg-background/75 px-3 text-muted-foreground transition-colors hover:bg-[color:var(--morandi-tone-helper-bg)]/55 hover:text-foreground data-[state=active]:border-[color:var(--morandi-tone-panel-border)] data-[state=active]:bg-[color:var(--morandi-tone-trigger-bg)] data-[state=active]:text-[color:var(--morandi-tone-trigger-fg)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--morandi-tone-helper-border)]">
                  <span className="flex items-center gap-2 text-xs sm:text-sm">
                    <FileText className="h-4 w-4" />
                    <span className="sm:hidden">作品</span><span className="hidden sm:inline">{s.t("publisher.myWorks")}</span>
                    {s.renderTabCount(s.tabCounts.works)}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="series" style={s.tabTone.series} className="h-10 sm:h-8 justify-start rounded-lg border border-transparent bg-background/75 px-3 text-muted-foreground transition-colors hover:bg-[color:var(--morandi-tone-helper-bg)]/55 hover:text-foreground data-[state=active]:border-[color:var(--morandi-tone-panel-border)] data-[state=active]:bg-[color:var(--morandi-tone-trigger-bg)] data-[state=active]:text-[color:var(--morandi-tone-trigger-fg)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--morandi-tone-helper-border)]">
                  <span className="flex items-center gap-2 text-xs sm:text-sm">
                    <Layers3 className="h-4 w-4" />
                    <span className="sm:hidden">系列</span><span className="hidden sm:inline">系列管理</span>
                    {s.renderTabCount(s.tabCounts.series)}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="external" style={s.tabTone.works} className="h-10 sm:h-8 justify-start rounded-lg border border-transparent bg-background/75 px-3 text-muted-foreground transition-colors hover:bg-[color:var(--morandi-tone-helper-bg)]/55 hover:text-foreground data-[state=active]:border-[color:var(--morandi-tone-panel-border)] data-[state=active]:bg-[color:var(--morandi-tone-trigger-bg)] data-[state=active]:text-[color:var(--morandi-tone-trigger-fg)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--morandi-tone-helper-border)]">
                  <span className="flex items-center gap-2 text-xs sm:text-sm">
                    <ExternalLink className="h-4 w-4" />
                    <span className="sm:hidden">外部發布</span><span className="hidden sm:inline">外部連結發布</span>
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
                formatDate={s.formatDate}
                onContinueEdit={(script) => s.navigate(`/edit/${script.id}?mode=edit`)}
                serverCounts={s.scriptCounts}
                externalPagination
                hasMore={typeof s.scriptsNextOffset === "number"}
                isLoadingMore={s.isLoadingMoreWorks}
                onLoadMore={s.handleLoadMoreWorks}
                onQueryChange={s.handleWorksQueryChange}
              />
            </TabsContent>

            {s.editingScript && (
              <Suspense fallback={null}>
                <ScriptMetadataDialogLazy
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
              </Suspense>
            )}

            <TabsContent value="series" style={s.tabTone.series} className="rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3">
              {s.activeTab === "series" && (
                <Suspense fallback={tabFallback}>
                  <PublisherSeriesTabLazy
                    seriesList={s.seriesList}
                    selectedSeriesId={s.selectedSeriesId}
                    setSelectedSeriesId={s.setSelectedSeriesId}
                    seriesDraft={s.seriesDraft}
                    setSeriesDraft={s.setSeriesDraft}
                    isDirty={s.isSeriesDraftDirty}
                    seriesScripts={deriveChapterRows(s.selectedSeriesScripts || [])}
                    selectedSeriesScripts={s.selectedSeriesScripts || []}
                    attachableScripts={s.attachableScripts || []}
                    onDetachScript={s.handleDetachScriptFromSeries}
                    onAttachScript={s.handleAttachScriptToSeries}
                    onReorderScript={s.handleReorderScriptInSeries}
                    onBatchReorderScripts={s.handleBatchReorderSeriesScripts}
                    onCreateSeries={s.handleCreateSeries}
                    onUpdateSeries={s.handleUpdateSeries}
                    onDeleteSeries={s.handleDeleteSeries}
                    isSaving={s.isSavingSeries}
                  />
                </Suspense>
              )}
            </TabsContent>

            <TabsContent value="external" style={s.tabTone.works} className="rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3">
              {s.activeTab === "external" && (
                <Suspense fallback={tabFallback}>
                  <StudioExternalScriptsTabLazy personas={s.personas} />
                </Suspense>
              )}
            </TabsContent>
          </Tabs>

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
