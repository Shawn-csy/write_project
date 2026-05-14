import React from "react";

declare const __APP_VERSION__: string;
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PublicTopBar } from "../components/public/PublicTopBar";
import { PublicHeroMarquee } from "../components/public/PublicHeroMarquee";
import { GalleryFilterBar } from "../components/gallery/GalleryFilterBar";
import { GalleryMobileFilterSheet } from "../components/gallery/GalleryMobileFilterSheet";
import { GalleryScriptsView } from "../components/gallery/GalleryScriptsView";
import { GalleryAuthorsView, GalleryOrgsView } from "../components/gallery/GalleryPeopleView";
import { R18ConsentDialog } from "../components/public/R18ConsentDialog";
import { TermsConsentDialog } from "../components/public/TermsConsentDialog";
import { HelpView } from "../components/gallery/views/HelpView";
import { AboutView } from "../components/gallery/views/AboutView";
import { LicenseView } from "../components/gallery/views/LicenseView";
import { CircleHelp, LayoutDashboard, LogIn, Scale, Search, SlidersHorizontal, X } from "lucide-react";
import { usePublicGalleryState, preloadStudioEntry } from "../hooks/public/usePublicGalleryState";
import type { GalleryView, GalleryViewMode } from "../hooks/public/usePublicGalleryState";

export default function PublicGalleryPage() {
  const appVersion = __APP_VERSION__ ?? "dev";
  const {
    t, navigate, currentUser, login,
    view, setView, normalizeView,
    viewMode, handleViewModeChange, normalizeViewMode,
    selectedTags, setSelectedTags,
    selectedAuthorTags, setAuthorTags,
    selectedOrgTags, setOrgTags,
    usageFilter, setUsageFilter,
    segmentFilter, setSegmentFilter,
    searchTerm, setSearchTerm,
    featuredLaneMode, setFeaturedLaneMode,
    isLoading, isLoadingPeople,
    isMobileFilterOpen, setIsMobileFilterOpen,
    homepageBanner,
    filteredScripts, topViewedScriptsPreview, latestScriptsPreview,
    featuredLaneScripts, featuredSeries,
    allTags, licenseTagShortcuts, topTags,
    filteredAuthors, filteredOrgs, authorTags, orgTags,
    isDefaultView, hasScriptFilters,
    mobileResultCount, activeMobileFilterCount,
    tabs, scriptSegmentTabs, usageOptions, featuredViewTabs,
    handleScriptClick,
    pendingR18Route, setPendingR18Route, confirmR18Consent,
    termsDialogOpen, setTermsDialogOpen,
    termsScrollRef, termsReadToBottom, termsRequireScroll,
    acceptedChecks, isSubmittingTerms, canConfirmTerms,
    missingRequiredCheckCount, handleTermsScroll, toggleRequiredCheck,
    confirmTermsConsent, pendingScript, setPendingScript,
    termsConfig,
  } = usePublicGalleryState();

  const bannerSlides = (() => {
    const items = Array.isArray(homepageBanner?.items) ? homepageBanner!.items : [];
    const valid = items.filter(item => item && (item.title || item.content || item.link || item.imageUrl));
    if (valid.length > 0) {
      return valid.map((item, idx) => ({
        id: item.id || `admin-homepage-banner-${idx + 1}`,
        title: item.title || "", content: item.content || "",
        subtitle: item.content || "", link: item.link || "", imageUrl: item.imageUrl || "",
      }));
    }
    if (homepageBanner && (homepageBanner.title || homepageBanner.content || homepageBanner.link || homepageBanner.imageUrl)) {
      return [{ id: "admin-homepage-banner", title: homepageBanner.title || "", content: homepageBanner.content || "", subtitle: homepageBanner.content || "", link: homepageBanner.link || "", imageUrl: homepageBanner.imageUrl || "" }];
    }
    return undefined;
  })();

  const resetScriptFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
    setUsageFilter("all");
    setSegmentFilter("all");
  };

  const isFilterableView = view === "scripts" || view === "authors" || view === "orgs";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <PublicTopBar
        fullBleed
        tabs={tabs}
        activeTab={view}
        onTabChange={(next) => setView(normalizeView(next))}
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="h-10 w-10 lg:hidden"
              onClick={() => setIsMobileFilterOpen(true)} title={t("publicGallery.mobileFilter", "篩選")} aria-label={t("publicGallery.mobileFilter", "篩選")}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="w-10 px-0 sm:w-auto sm:px-3" onClick={() => setView("license")} title={t("publicGallery.licenseTerms")} aria-label={t("publicGallery.licenseTerms")}>
                <Scale className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">{t("publicGallery.licenseTerms")}</span>
              </Button>
              <Button variant="ghost" size="sm" className="w-10 px-0 sm:w-auto sm:px-3" onClick={() => setView("help")} title={t("publicGallery.help")} aria-label={t("publicGallery.help")}>
                <CircleHelp className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">{t("publicGallery.help")}</span>
              </Button>
            </div>
            {currentUser ? (
              <Button variant="default" size="sm" className="w-10 px-0 sm:w-auto sm:px-3"
                onClick={() => navigate("/dashboard")} onMouseEnter={preloadStudioEntry} onFocus={preloadStudioEntry}
                title={t("publicGallery.goStudio")} aria-label={t("publicGallery.goStudio")}>
                <LayoutDashboard className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">{t("publicGallery.goStudio")}</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="w-10 px-0 sm:w-auto sm:px-3"
                onClick={async () => { try { await login(); } catch(e) { console.error(e); } }}
                onMouseEnter={preloadStudioEntry} onFocus={preloadStudioEntry}
                title={t("publicGallery.login")} aria-label={t("publicGallery.login")}>
                <LogIn className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">{t("publicGallery.login")}</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Hero banner */}
      {view === "scripts" && <PublicHeroMarquee fullBleed slides={bannerSlides} />}

      {/* Main content */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-20">
        {/* Segment tabs (scripts only) */}
        {view === "scripts" && (
          <div className="mb-4 sm:mb-6 overflow-x-auto border-b border-border/70">
            <div className="flex min-w-max items-end gap-1">
              {scriptSegmentTabs.map(seg => (
                <button key={seg.key} type="button" onClick={() => setSegmentFilter(seg.key)}
                  className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${segmentFilter === seg.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}>
                  {seg.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Featured lane tabs (mobile, scripts default view) */}
        {view === "scripts" && isDefaultView && (
          <div className="mb-4 overflow-x-auto lg:hidden">
            <div className="flex min-w-max items-center gap-2">
              {featuredViewTabs.map(tab => {
                const isActive = (featuredLaneMode || "featured") === tab.key;
                return (
                  <Button key={tab.key} type="button" size="sm" variant={isActive ? "default" : "outline"}
                    className={`h-8 rounded-full px-3 text-xs ${isActive ? "border border-primary bg-primary text-primary-foreground shadow ring-1 ring-primary/35" : "border-border/60 bg-background text-muted-foreground"}`}
                    onClick={() => setFeaturedLaneMode(tab.key === "featured" ? false : tab.key)}>
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {isFilterableView && (
          <>
            {/* Mobile search + filter bar */}
            <div className="mb-3 space-y-2 lg:hidden">
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder={view === "scripts" ? t("publicGallery.searchScripts", "搜尋劇本...") : view === "authors" ? t("publicGallery.searchAuthors", "搜尋作者...") : t("publicGallery.searchOrgs", "搜尋組織...")}
                    className="h-9 rounded-full border-border/70 bg-background/90 pl-8 pr-8 text-sm" />
                  {searchTerm && (
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setSearchTerm("")} aria-label={t("publicGallery.clearSearch", "清除搜尋")}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button type="button" size="sm" variant="outline" className="relative h-9 rounded-full px-3 text-xs" onClick={() => setIsMobileFilterOpen(true)}>
                  <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                  {t("publicGallery.mobileFilter", "篩選")}
                  {activeMobileFilterCount > 0 && (
                    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{activeMobileFilterCount}</span>
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{mobileResultCount} {view === "scripts" ? t("publicReader.worksUnit", "部") : t("publicGallery.results", "筆")}</span>
                {view === "scripts" && hasScriptFilters && (
                  <Button type="button" size="sm" variant="ghost" className="h-7 rounded-full px-2 text-xs text-muted-foreground" onClick={resetScriptFilters}>
                    {t("publicGallery.clearFilters")}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
              {/* Desktop filter sidebar */}
              <aside id="desktop-filter-panel" className="hidden lg:block w-[280px] shrink-0">
                <div className="sticky top-24 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 shadow-sm backdrop-blur">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">{t("publicGallery.mobileFilterTitle", "篩選與搜尋")}</p>
                  <GalleryFilterBar
                    searchTerm={searchTerm} onSearchChange={setSearchTerm}
                    selectedTags={view === "scripts" ? selectedTags : view === "authors" ? selectedAuthorTags : selectedOrgTags}
                    onSelectTags={view === "scripts" ? setSelectedTags : view === "authors" ? setAuthorTags : setOrgTags}
                    featuredTags={view === "scripts" ? topTags : []}
                    tags={view === "scripts" ? allTags : view === "authors" ? authorTags : orgTags}
                    placeholder={view === "scripts" ? t("publicGallery.searchScripts", "搜尋劇本...") : view === "authors" ? t("publicGallery.searchAuthors", "搜尋作者...") : t("publicGallery.searchOrgs", "搜尋組織...")}
                    showViewToggle={false} viewValue={viewMode}
                    onViewChange={(value) => handleViewModeChange(normalizeViewMode(value) as GalleryViewMode)}
                    viewOptions={[{ value: "standard", label: t("publicGallery.viewStandard", "圖文排版") }, { value: "compact", label: t("publicGallery.viewCompact", "緊湊排版") }]}
                    quickFilters={[]}
                    quickTagFilters={view === "scripts" ? licenseTagShortcuts.map(tag => ({ value: tag, label: tag.replace(/^授權:/, "").replace(/^License:/, "") })) : []}
                  />
                </div>
              </aside>

              {/* Main content area */}
              <div className="flex-1 min-w-0 flex flex-col">
                {/* Desktop usage/view toolbar (scripts only) */}
                {view === "scripts" && (
                  <div className="mb-4 hidden lg:flex items-center gap-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="shrink-0 text-xs font-medium text-foreground">{t("galleryFilterBar.usageRights", "使用權限")}</span>
                      {usageOptions.map(opt => (
                        <Button key={opt.value} type="button" size="sm" variant={usageFilter === opt.value ? "default" : "outline"}
                          className={`h-7 min-w-[92px] rounded-full px-3 text-xs transition-colors ${usageFilter === opt.value ? "border border-primary bg-primary text-primary-foreground shadow ring-1 ring-primary/35" : "border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-muted/60 hover:text-foreground"}`}
                          onClick={() => setUsageFilter(opt.value)}>
                          {opt.label}
                        </Button>
                      ))}
                      {hasScriptFilters && (
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={resetScriptFilters}>
                          {t("publicGallery.clearFilters")}
                        </Button>
                      )}
                    </div>
                    <div className="h-6 w-px bg-border/70" aria-hidden="true" />
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-xs font-medium text-foreground">{t("publicGallery.viewMode", "顯示模式")}</span>
                      {(["standard", "compact"] as GalleryViewMode[]).map(mode => (
                        <Button key={mode} type="button" size="sm" variant={viewMode === mode ? "default" : "outline"}
                          className={`h-7 rounded-full px-3 text-xs transition-colors ${viewMode === mode ? "border border-primary bg-primary text-primary-foreground shadow ring-1 ring-primary/35" : "border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-muted/60 hover:text-foreground"}`}
                          onClick={() => handleViewModeChange(mode)}>
                          {mode === "standard" ? t("publicGallery.viewStandard", "圖文排版") : t("publicGallery.viewCompact", "緊湊排版")}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* View content */}
                {view === "scripts" && (
                  <GalleryScriptsView
                    t={t} isLoading={isLoading} viewMode={viewMode}
                    isDefaultView={isDefaultView} featuredLaneMode={featuredLaneMode} setFeaturedLaneMode={setFeaturedLaneMode}
                    filteredScripts={filteredScripts} topViewedScriptsPreview={topViewedScriptsPreview}
                    latestScriptsPreview={latestScriptsPreview} featuredLaneScripts={featuredLaneScripts}
                    featuredSeries={featuredSeries} hasScriptFilters={hasScriptFilters}
                    resetScriptFilters={resetScriptFilters} handleScriptClick={handleScriptClick}
                    onNavigateSeries={(name) => navigate(`/series/${encodeURIComponent(name)}`)}
                  />
                )}
                {view === "authors" && (
                  <GalleryAuthorsView t={t} isLoadingPeople={isLoadingPeople} filteredAuthors={filteredAuthors}
                    onAuthorClick={(id) => navigate(`/author/${id}`)}
                    onAuthorTagClick={(tag) => setAuthorTags([tag])} />
                )}
                {view === "orgs" && (
                  <GalleryOrgsView t={t} isLoadingPeople={isLoadingPeople} filteredOrgs={filteredOrgs}
                    onOrgClick={(id) => navigate(`/org/${id}`)}
                    onOrgTagClick={(tag) => setOrgTags([tag])} />
                )}
              </div>
            </div>
          </>
        )}

        {view === "help" && <HelpView />}
        {view === "license" && <LicenseView />}
        {view === "about" && <AboutView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/20">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t("publicGallery.footerText")}</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-wide text-muted-foreground/70">v{appVersion}</span>
            <Button variant="link" size="sm" className="h-auto px-0 text-xs" onClick={() => setView("about")}>{t("publicGallery.about")}</Button>
          </div>
        </div>
      </footer>

      {/* Overlays */}
      <GalleryMobileFilterSheet
        open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}
        view={view === "authors" || view === "orgs" ? view : "scripts"}
        searchTerm={searchTerm} onSearchChange={setSearchTerm}
        selectedTags={selectedTags} selectedAuthorTags={selectedAuthorTags} selectedOrgTags={selectedOrgTags}
        onSelectScriptTags={setSelectedTags} onSelectAuthorTags={setAuthorTags} onSelectOrgTags={setOrgTags}
        allTags={allTags} authorTags={authorTags} orgTags={orgTags} topTags={topTags}
        licenseTagShortcuts={licenseTagShortcuts}
        usageFilter={usageFilter} usageOptions={usageOptions} onSetUsageFilter={setUsageFilter}
        viewMode={viewMode} onViewModeChange={handleViewModeChange}
        hasScriptFilters={hasScriptFilters} onResetScriptFilters={resetScriptFilters}
      />

      <TermsConsentDialog
        open={termsDialogOpen}
        onOpenChange={(open) => { if (!open && !isSubmittingTerms) { setTermsDialogOpen(false); setPendingScript(null); } }}
        termsConfig={termsConfig} termsScrollRef={termsScrollRef}
        termsReadToBottom={termsReadToBottom} termsRequireScroll={termsRequireScroll}
        acceptedChecks={acceptedChecks} isSubmittingTerms={isSubmittingTerms}
        canConfirmTerms={canConfirmTerms} missingRequiredCheckCount={missingRequiredCheckCount}
        handleTermsScroll={handleTermsScroll}
        toggleRequiredCheck={(checkId, checked) => toggleRequiredCheck(checkId, checked === true)}
        onConfirm={confirmTermsConsent}
        onCancel={() => { setTermsDialogOpen(false); setPendingScript(null); }}
        confirmLabel={undefined}
      />

      <R18ConsentDialog
        open={!!pendingR18Route}
        onOpenChange={(open) => !open && setPendingR18Route(null)}
        onConfirm={confirmR18Consent}
      />
    </div>
  );
}
