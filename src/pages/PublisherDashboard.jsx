import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { PanelLeftOpen, FileText, UserRound, Building2, Layers3, CircleHelp } from "lucide-react";
import { LanguageSwitcher } from "../components/common/LanguageSwitcher";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { ScriptMetadataDialog } from "../components/dashboard/ScriptMetadataDialog";
import { getMorandiTagStyle } from "../lib/tagColors";
import { MORANDI_STUDIO_TONE_VARS } from "../constants/morandiPanelTones";
import { getUserScripts } from "../lib/api/scripts";
import { getTags } from "../lib/api/tags";
import { getSeries } from "../lib/api/series";
import {
  getOrganizations,
  getOrganization,
} from "../lib/api/organizations";
import { getPersonas } from "../lib/api/personas";
import { getUserProfile } from "../lib/api/user";
import { getPublicPersona } from "../lib/api/public";
import { PublisherWorksTab } from "../components/dashboard/publisher/PublisherWorksTab";
import { PublisherProfileTab } from "../components/dashboard/publisher/PublisherProfileTab";
import { PublisherOrgTab } from "../components/dashboard/publisher/PublisherOrgTab";
import { PublisherSeriesTab } from "../components/dashboard/publisher/PublisherSeriesTab";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/ui/toast";
import { useI18n } from "../contexts/I18nContext";
import { normalizeOrgIds } from "../hooks/dashboard/scriptMetadataUtils";
import { useStudioGuide } from "../hooks/publisher/useStudioGuide";
import { usePublisherSeriesActions } from "../hooks/publisher/usePublisherSeriesActions";
import { usePublisherOrgMemberActions } from "../hooks/publisher/usePublisherOrgMemberActions";
import { usePublisherOrgQueues } from "../hooks/publisher/usePublisherOrgQueues";
import { usePublisherCrudActions } from "../hooks/publisher/usePublisherCrudActions";
import { buildAffiliatedOrganizations } from "../lib/orgAffiliation";
import { SpotlightGuideOverlay } from "../components/common/SpotlightGuideOverlay";
import { TOPBAR_INNER_CLASS, TOPBAR_OUTER_CLASS } from "../components/layout/topbarLayout";


export function PublisherDashboard({ isSidebarOpen, setSidebarOpen, openMobileMenu }) {
  const { t } = useI18n();
  const { currentUser, profile: currentProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const resolveTabFromSearch = React.useCallback((search) => {
      const raw = new URLSearchParams(search || "").get("tab");
      return ["works", "profile", "org", "series"].includes(raw) ? raw : "works";
  }, []);
  const [activeTab, setActiveTab] = useState(() => resolveTabFromSearch(location.search));
  const [editingScript, setEditingScript] = useState(null);
  const [confirmDeletePersonaOpen, setConfirmDeletePersonaOpen] = useState(false);
  const [confirmDeleteOrgOpen, setConfirmDeleteOrgOpen] = useState(false);
  
  // Data State
  const [personas, setPersonas] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [orgsForPersona, setOrgsForPersona] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [personaDraft, setPersonaDraft] = useState({
    displayName: "",
    bio: "",
    website: "",
    links: [],
    avatar: "",
    bannerUrl: "",
    organizationIds: [],
    tags: [],
    defaultLicenseCommercial: "",
    defaultLicenseDerivative: "",
    defaultLicenseNotify: "",
    defaultLicenseSpecialTerms: [],
  });
  const [personasLoadedAt, setPersonasLoadedAt] = useState(0);
  const [orgDraft, setOrgDraft] = useState({ id: "", name: "", description: "", website: "", logoUrl: "", bannerUrl: "", tags: [] });
  const [personaTagInput, setPersonaTagInput] = useState("");
  const [orgTagInput, setOrgTagInput] = useState("");
  const [isWorksLoading, setIsWorksLoading] = useState(true);
  const [isMetaLoading, setIsMetaLoading] = useState(true);
  const [seriesList, setSeriesList] = useState([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [seriesDraft, setSeriesDraft] = useState({ name: "", summary: "", coverUrl: "" });
  const [isSavingSeries, setIsSavingSeries] = useState(false);
  const tabsGuideRef = useRef(null);

  const {
      orgMembers,
      setOrgMembers,
      isOrgMembersLoading,
      orgInvites,
      setOrgInvites,
      orgRequests,
      setOrgRequests,
      myInvites,
      setMyInvites,
      inviteSearchQuery,
      setInviteSearchQuery,
      inviteSearchResults,
      setInviteSearchResults,
      isInviteSearching,
  } = usePublisherOrgQueues({
      selectedOrgId,
      currentUser,
  });

  const formatDate = (ts) => {
      if (!ts) return "-";
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return "-";
      return d.toISOString().slice(0, 10);
  };

  const parseTags = (value) => value
      .split(/,|，|、|#|\n|\t|;/)
      .map(t => t.trim())
      .filter(Boolean);

  const addTags = (existing, incoming) => {
      const merged = [...existing];
      incoming.forEach(t => {
          if (!merged.includes(t)) merged.push(t);
      });
      return merged;
  };

  const getSuggestions = (input, existing) => {
      const needle = input.trim().toLowerCase();
      return (availableTags || [])
          .filter(t => t.name.toLowerCase().includes(needle))
          .filter(t => !existing.includes(t.name))
          .slice(0, 6);
  };


  const currentUserIds = React.useMemo(() => {
      return Array.from(new Set([
          currentUser?.uid,
          currentProfile?.id,
          currentProfile?.uid,
          currentProfile?.userId,
      ].filter(Boolean)));
  }, [currentProfile?.id, currentProfile?.uid, currentProfile?.userId, currentUser?.uid]);
  const currentUserId = currentUserIds[0] || null;
  const currentOrgRole = React.useMemo(() => {
      if (!selectedOrgId) return null;
      const me = (orgMembers?.users || []).find((u) => currentUserIds.includes(u.id));
      const memberRole = me?.organizationRole || null;
      if (memberRole) return memberRole;
      const selectedOrg = (orgsForPersona || []).find((o) => o.id === selectedOrgId);
      const fallbackRole =
          selectedOrg?.organizationRole ||
          selectedOrg?.myRole ||
          selectedOrg?.memberRole ||
          selectedOrg?.role ||
          null;
      if (fallbackRole) return fallbackRole;
      const ownerId = selectedOrg?.ownerId || selectedOrg?.ownerUid || selectedOrg?.ownerUserId || null;
      if (ownerId && currentUserIds.includes(ownerId)) return "owner";
      return null;
  }, [selectedOrgId, orgMembers, currentUserIds, orgsForPersona]);
  const canManageOrgMembers = currentOrgRole === "owner" || currentOrgRole === "admin";
  const tabCounts = React.useMemo(() => ({
      works: scripts.length,
      profile: personas.length,
      org: orgsForPersona.length,
      series: seriesList.length,
  }), [scripts.length, personas.length, orgsForPersona.length, seriesList.length]);
  const tabTone = MORANDI_STUDIO_TONE_VARS;
  const renderTabCount = (count) => (
      count ? <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{count}</span> : null
  );

  const allTagNames = Array.from(new Set([
      ...(availableTags || []).map(t => t.name),
      ...(personaDraft.tags || []),
      ...(orgDraft.tags || []),
  ]));

  const getTagStyle = (name) => getMorandiTagStyle(name, allTagNames);

  useEffect(() => {
    if (!currentUser) return;
    loadData();
  }, [currentUser]);

  useEffect(() => {
      const nextTab = resolveTabFromSearch(location.search);
      setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
  }, [location.search, resolveTabFromSearch]);

  useEffect(() => {
      const params = new URLSearchParams(location.search || "");
      const requestedScriptId = params.get("scriptId");
      const shouldOpenPublish = params.get("open") === "publish";
      if (!requestedScriptId || !shouldOpenPublish) return;
      const target = (scripts || []).find((s) => s.id === requestedScriptId);
      if (!target) return;
      setActiveTab("works");
      setEditingScript((prev) => (prev?.id === target.id ? prev : target));
  }, [location.search, scripts]);

  const handleTabChange = useCallback((nextTab) => {
      setActiveTab(nextTab);
      const params = new URLSearchParams(location.search || "");
      if (!nextTab || nextTab === "works") params.delete("tab");
      else params.set("tab", nextTab);
      const query = params.toString();
      navigate(`/studio${query ? `?${query}` : ""}`, { replace: true });
  }, [location.search, navigate]);

  const closePublishDialog = useCallback(() => {
      setEditingScript(null);
      const params = new URLSearchParams(location.search || "");
      params.delete("scriptId");
      params.delete("open");
      const query = params.toString();
      navigate(`/studio${query ? `?${query}` : ""}`, { replace: true });
  }, [location.search, navigate]);

  const {
      showStudioGuide,
      studioGuideIndex,
      studioGuideSteps,
      currentStudioGuide,
      studioSpotlightRect,
      finishStudioGuide,
      handleStudioGuideNext,
      handleStudioGuidePrev,
      handleStartStudioGuide,
  } = useStudioGuide({
      t,
      currentUser,
      activeTab,
      handleTabChange,
      tabsGuideRef,
  });

  // personaDraft is fully driven by selectedPersonaId effect above

  const loadData = async (isBackground = false) => {
    if (!currentUser) return;
    if (!isBackground) setIsWorksLoading(true);

    try {
        const scriptData = await getUserScripts();
        const sortedScripts = (scriptData || [])
            .filter(s => s.type !== "folder" && !s.isFolder)
            .sort((a, b) => {
                const aPublic = a.status === "Public" || a.isPublic;
                const bPublic = b.status === "Public" || b.isPublic;
                if (aPublic !== bPublic) return aPublic ? -1 : 1;
                return (b.lastModified || 0) - (a.lastModified || 0);
            });
        setScripts(sortedScripts);
    } catch (e) {
        console.error("Failed to load scripts", e);
    } finally {
        if (!isBackground) setIsWorksLoading(false);
    }

    try {
        setIsMetaLoading(true);
        const [personaData, orgData, tagData, seriesData] = await Promise.all([
            getPersonas(),
            getOrganizations(),
            getTags(),
            getSeries(),
        ]);
        let normalizedPersonas = (personaData || []).map(p => {
            let links = p?.links;
            if (typeof links === "string") {
                try { links = JSON.parse(links); } catch { links = []; }
            }
            if (!Array.isArray(links)) links = [];
            const organizationIds = normalizeOrgIds(p?.organizationIds);
            return { ...p, links, organizationIds };
        });
        // Enrich missing links from public persona as fallback
        const needsEnrich = normalizedPersonas.filter(p => (p.links || []).length === 0);
        if (needsEnrich.length > 0) {
            const enriched = await Promise.all(needsEnrich.map(async (p) => {
                try {
                    const pub = await getPublicPersona(p.id);
                    if (pub?.links && pub.links.length > 0) {
                        return { ...p, links: pub.links };
                    }
                } catch {}
                return p;
            }));
            const enrichMap = new Map(enriched.map(p => [p.id, p]));
            normalizedPersonas = normalizedPersonas.map(p => enrichMap.get(p.id) || p);
        }
        setPersonas(normalizedPersonas);
        setPersonasLoadedAt(Date.now());
        setOrgs(orgData || []);
        const deduped = await buildAffiliatedOrganizations({
          ownedOrgs: orgData || [],
          profile: currentProfile,
          personas: normalizedPersonas,
          fetchOrganizationById: getOrganization,
        });
        setOrgsForPersona(deduped);
        setAvailableTags(tagData || []);
        setSeriesList(seriesData || []);
        const preferredPersonaId = localStorage.getItem("preferredPersonaId");
        const personasForSelection = normalizedPersonas;
        const nextPersona =
            (preferredPersonaId && personasForSelection.find(p => p.id === preferredPersonaId)) ||
            personasForSelection[0];
        if (nextPersona) {
            setSelectedPersonaId(nextPersona.id);
        }
        if (deduped.length > 0) {
            setSelectedOrgId((prev) => (prev && deduped.some((o) => o.id === prev) ? prev : deduped[0].id));
        }
    } catch (e) {
        console.error("Failed to load studio data", e);
    } finally {
        setIsMetaLoading(false);
    }
  };

  const {
      handleCreateSeries,
      handleUpdateSeries,
      handleDeleteSeries,
      handleDetachScriptFromSeries,
  } = usePublisherSeriesActions({
      selectedSeriesId,
      seriesDraft,
      setIsSavingSeries,
      setSeriesList,
      setSelectedSeriesId,
      setSeriesDraft,
      setScripts,
      toast,
  });

  const refreshOrgChoices = async () => {
      if (!currentUser) return;
      try {
          const profile = currentProfile || await getUserProfile();
          const mergedOrgs = await buildAffiliatedOrganizations({
            ownedOrgs: orgs || [],
            profile,
            personas: personas || [],
            fetchOrganizationById: getOrganization,
          });
          setOrgsForPersona(mergedOrgs);
      } catch {
          // ignore
      }
  };

  useEffect(() => {
      if (!selectedPersonaId || personasLoadedAt === 0) return;
      localStorage.setItem("preferredPersonaId", selectedPersonaId);
      let ignore = false;
      const run = async () => {
          const persona = personas.find(p => p.id === selectedPersonaId);
          if (!persona) return;
          let links = persona.links;
          if (typeof links === "string") {
              try { links = JSON.parse(links); } catch { links = []; }
          }
          if (!Array.isArray(links)) links = [];
          if (links.length === 0) {
              try {
                  const publicPersona = await getPublicPersona(selectedPersonaId);
                  if (publicPersona?.links && publicPersona.links.length > 0) {
                      links = publicPersona.links;
                  }
              } catch {}
          }
          if (ignore) return;
          setPersonaDraft({
              displayName: persona.displayName || "",
              bio: persona.bio || "",
              website: persona.website || "",
              links,
              avatar: persona.avatar || "",
              bannerUrl: persona.bannerUrl || "",
              organizationIds: persona.organizationIds || [],
              tags: persona.tags || [],
              defaultLicenseCommercial: persona.defaultLicenseCommercial || "",
              defaultLicenseDerivative: persona.defaultLicenseDerivative || "",
              defaultLicenseNotify: persona.defaultLicenseNotify || "",
              defaultLicenseSpecialTerms: persona.defaultLicenseSpecialTerms || []
          });
          if ((persona.organizationIds || []).length > 0) {
              setSelectedOrgId(persona.organizationIds[0]);
          }
      };
      run();
      return () => { ignore = true; };
  }, [selectedPersonaId, personasLoadedAt, personas]);

  const {
      handleInviteMember,
      handleAcceptRequest,
      handleDeclineRequest,
      handleRemoveMember,
      handleRemovePersonaMember,
      handleChangeMemberRole,
      handleAcceptInvite,
      handleDeclineInvite,
  } = usePublisherOrgMemberActions({
      selectedOrgId,
      personas,
      t,
      toast,
      handleTabChange,
      refreshOrgChoices,
      setInviteSearchQuery,
      setInviteSearchResults,
      setOrgInvites,
      setOrgRequests,
      setOrgMembers,
      setMyInvites,
  });

  useEffect(() => {
      if (!selectedOrgId) return;
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
      }
  }, [selectedOrgId, orgs]);
  const {
      isSavingProfile,
      isSavingOrg,
      isCreatingPersona,
      isCreatingOrg,
      handleSaveProfile,
      handleSaveOrg,
      handleCreatePersona,
      handleDeletePersona,
      handleCreateOrg,
      handleDeleteOrg,
  } = usePublisherCrudActions({
      selectedPersonaId,
      personaDraft,
      setSelectedPersonaId,
      setConfirmDeletePersonaOpen,
      orgDraft,
      setSelectedOrgId,
      setConfirmDeleteOrgOpen,
      loadData,
      t,
      toast,
  });

  return (
    <div className="flex h-full flex-col bg-background">
      <div className={`${TOPBAR_OUTER_CLASS} shrink-0`}>
        <div className={`${TOPBAR_INNER_CLASS} h-16 flex items-center gap-3`}>
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openMobileMenu?.()}
              title={t("publisher.expandMenu")}
            >
              <PanelLeftOpen className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
          <div className={`hidden lg:block ${isSidebarOpen ? "lg:hidden" : ""}`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen && setSidebarOpen(true)}
              title={t("publisher.expandSidebar")}
            >
              <PanelLeftOpen className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif font-semibold text-lg text-primary">{t("publisher.title")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher selectClassName="h-8 bg-background/70 backdrop-blur" />
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={handleStartStudioGuide}>
              <CircleHelp className="w-4 h-4 mr-1.5" />
              {t("publisher.guide")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => navigate("/")}
            >
              {t("nav.gallery", "公開台本")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto w-full max-w-6xl space-y-6 animate-in fade-in duration-500">

      {myInvites.length > 0 && (
        <div className="border rounded-lg p-4 bg-muted/20 mb-6">
          <div className="text-sm font-medium mb-2">{t("publisher.myOrgInvites")}</div>
          <div className="space-y-2">
            {myInvites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between text-sm">
                <span>{t("publisher.inviteJoinOrg").replace("{orgId}", inv.orgId)}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAcceptInvite(inv.id)}>{t("publisher.accept")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeclineInvite(inv.id)}>{t("publisher.decline")}</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="sticky top-0 z-20 rounded-lg border bg-background/95 p-2 backdrop-blur">
            <TabsList ref={tabsGuideRef} className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 h-auto bg-transparent p-0">
                <TabsTrigger
                  value="works"
                  style={tabTone.works}
                  className="h-11 justify-start px-3 border border-transparent bg-background/70 text-muted-foreground transition-colors hover:bg-[color:var(--morandi-tone-helper-bg)]/50 hover:text-foreground data-[state=active]:border-[color:var(--morandi-tone-panel-border)] data-[state=active]:bg-[color:var(--morandi-tone-trigger-bg)] data-[state=active]:text-[color:var(--morandi-tone-trigger-fg)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--morandi-tone-helper-border)]"
                >
                    <span className="flex items-center gap-2 text-xs sm:text-sm">
                        <FileText className="h-4 w-4" />
                        <span>{t("publisher.myWorks")}</span>
                        {renderTabCount(tabCounts.works)}
                    </span>
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  style={tabTone.profile}
                  className="h-11 justify-start px-3 border border-transparent bg-background/70 text-muted-foreground transition-colors hover:bg-[color:var(--morandi-tone-helper-bg)]/50 hover:text-foreground data-[state=active]:border-[color:var(--morandi-tone-panel-border)] data-[state=active]:bg-[color:var(--morandi-tone-trigger-bg)] data-[state=active]:text-[color:var(--morandi-tone-trigger-fg)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--morandi-tone-helper-border)]"
                >
                    <span className="flex items-center gap-2 text-xs sm:text-sm">
                        <UserRound className="h-4 w-4" />
                        <span>{t("publisher.authorIdentity")}</span>
                        {renderTabCount(tabCounts.profile)}
                    </span>
                </TabsTrigger>
                <TabsTrigger
                  value="org"
                  style={tabTone.org}
                  className="h-11 justify-start px-3 border border-transparent bg-background/70 text-muted-foreground transition-colors hover:bg-[color:var(--morandi-tone-helper-bg)]/50 hover:text-foreground data-[state=active]:border-[color:var(--morandi-tone-panel-border)] data-[state=active]:bg-[color:var(--morandi-tone-trigger-bg)] data-[state=active]:text-[color:var(--morandi-tone-trigger-fg)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--morandi-tone-helper-border)]"
                >
                    <span className="flex items-center gap-2 text-xs sm:text-sm">
                        <Building2 className="h-4 w-4" />
                        <span>{t("publisher.organization")}</span>
                        {renderTabCount(tabCounts.org)}
                    </span>
                </TabsTrigger>
                <TabsTrigger
                  value="series"
                  style={tabTone.series}
                  className="h-11 justify-start px-3 border border-transparent bg-background/70 text-muted-foreground transition-colors hover:bg-[color:var(--morandi-tone-helper-bg)]/50 hover:text-foreground data-[state=active]:border-[color:var(--morandi-tone-panel-border)] data-[state=active]:bg-[color:var(--morandi-tone-trigger-bg)] data-[state=active]:text-[color:var(--morandi-tone-trigger-fg)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--morandi-tone-helper-border)]"
                >
                    <span className="flex items-center gap-2 text-xs sm:text-sm">
                        <Layers3 className="h-4 w-4" />
                        <span>系列管理</span>
                        {renderTabCount(tabCounts.series)}
                    </span>
                </TabsTrigger>
            </TabsList>
        </div>

        {/* 1. My Works Tab */}
        <TabsContent
          value="works"
          style={tabTone.works}
          className="space-y-4 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-3"
          data-guide-id="studio-works-panel"
        >
             <PublisherWorksTab 
                isLoading={isWorksLoading} 
                scripts={scripts} 
                personas={personas}
                setEditingScript={setEditingScript} 
                navigate={navigate} 
                formatDate={formatDate} 
                onContinueEdit={(script) => navigate(`/edit/${script.id}?mode=edit`)}
             />
        </TabsContent>

        {/* 2. Profile Tab (Inline Editor) */}
        <TabsContent
          value="profile"
          style={tabTone.profile}
          className="rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-3"
          data-guide-id="studio-profile-panel"
        >
            <PublisherProfileTab
                selectedPersonaId={selectedPersonaId} setSelectedPersonaId={setSelectedPersonaId}
                personas={personas}
                selectedPersona={personas.find(p => p.id === selectedPersonaId)}
                handleCreatePersona={handleCreatePersona} isCreatingPersona={isCreatingPersona}
                handleDeletePersona={() => setConfirmDeletePersonaOpen(true)}
                personaDraft={personaDraft} setPersonaDraft={setPersonaDraft}
                orgs={orgsForPersona}
                isLoading={isMetaLoading}
                personaTagInput={personaTagInput} setPersonaTagInput={setPersonaTagInput}
                handleSaveProfile={handleSaveProfile} isSavingProfile={isSavingProfile}
                parseTags={parseTags} addTags={addTags} getSuggestions={getSuggestions} getTagStyle={getTagStyle}
                tagOptions={availableTags}
            />
        </TabsContent>

        <ScriptMetadataDialog 
            open={!!editingScript} 
            onOpenChange={(open) => !open && closePublishDialog()} 
            script={editingScript}
            seriesOptions={seriesList}
            onSeriesCreated={(createdSeries) => {
                if (!createdSeries?.id) return;
                setSeriesList((prev) => {
                    const exists = prev.some((item) => item.id === createdSeries.id);
                    return exists ? prev : [createdSeries, ...prev];
                });
                setSelectedSeriesId(createdSeries.id);
            }}
            onSave={(updatedScript) => {
                closePublishDialog();
                setScripts(prev => prev.map(s => s.id === updatedScript.id ? { ...s, ...updatedScript } : s));
            }}
        />

        {/* 3. Organization Tab */}
        <TabsContent
          value="org"
          style={tabTone.org}
          className="rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-3"
          data-guide-id="studio-org-panel"
        >
                <PublisherOrgTab 
                orgs={orgsForPersona} 
                selectedOrgId={selectedOrgId} setSelectedOrgId={setSelectedOrgId}
                handleCreateOrg={handleCreateOrg} isCreatingOrg={isCreatingOrg}
                handleDeleteOrg={() => setConfirmDeleteOrgOpen(true)}
                orgDraft={orgDraft} setOrgDraft={setOrgDraft}
                handleSaveOrg={handleSaveOrg} isSavingOrg={isSavingOrg}
                orgTagInput={orgTagInput} setOrgTagInput={setOrgTagInput}
                parseTags={parseTags} addTags={addTags} getSuggestions={getSuggestions} getTagStyle={getTagStyle}
                tagOptions={availableTags}
                isLoading={isMetaLoading || isOrgMembersLoading}
                orgMembers={orgMembers}
                orgInvites={orgInvites}
                orgRequests={orgRequests}
                canEditSelectedOrg={canManageOrgMembers}
                currentUserId={currentUserId}
                currentOrgRole={currentOrgRole}
                canManageOrgMembers={canManageOrgMembers}
                inviteSearchQuery={inviteSearchQuery}
                setInviteSearchQuery={setInviteSearchQuery}
                inviteSearchResults={inviteSearchResults}
                isInviteSearching={isInviteSearching}
                handleInviteMember={handleInviteMember}
                handleAcceptRequest={handleAcceptRequest}
                handleDeclineRequest={handleDeclineRequest}
                handleRemoveMember={handleRemoveMember}
                handleRemovePersonaMember={handleRemovePersonaMember}
                handleChangeMemberRole={handleChangeMemberRole}
                />
        </TabsContent>

        <TabsContent
          value="series"
          style={tabTone.series}
          className="rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-3"
        >
            <PublisherSeriesTab
              seriesList={seriesList}
              selectedSeriesId={selectedSeriesId}
              setSelectedSeriesId={setSelectedSeriesId}
              seriesDraft={seriesDraft}
              setSeriesDraft={setSeriesDraft}
              seriesScripts={(scripts || [])
                  .filter((script) => script.seriesId === selectedSeriesId)
                  .sort((a, b) => {
                      const aOrder = Number.isFinite(Number(a.seriesOrder)) ? Number(a.seriesOrder) : Number.MAX_SAFE_INTEGER;
                      const bOrder = Number.isFinite(Number(b.seriesOrder)) ? Number(b.seriesOrder) : Number.MAX_SAFE_INTEGER;
                      if (aOrder !== bOrder) return aOrder - bOrder;
                      return (b.lastModified || 0) - (a.lastModified || 0);
                  })}
              onDetachScript={handleDetachScriptFromSeries}
              onCreateSeries={handleCreateSeries}
              onUpdateSeries={handleUpdateSeries}
              onDeleteSeries={handleDeleteSeries}
              isSaving={isSavingSeries}
            />
        </TabsContent>

      </Tabs>

      <Dialog open={confirmDeletePersonaOpen} onOpenChange={setConfirmDeletePersonaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("publisher.deletePersonaTitle")}</DialogTitle>
            <DialogDescription>{t("publisher.deletePersonaDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeletePersonaOpen(false)}>{t("publisher.cancel")}</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeletePersona}>{t("publisher.confirmDelete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOrgOpen} onOpenChange={setConfirmDeleteOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("publisher.deleteOrgTitle")}</DialogTitle>
            <DialogDescription>{t("publisher.deleteOrgDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOrgOpen(false)}>{t("publisher.cancel")}</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteOrg}>{t("publisher.confirmDelete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SpotlightGuideOverlay
        open={showStudioGuide && Boolean(currentStudioGuide)}
        zIndex={220}
        spotlightRect={studioSpotlightRect}
        currentStep={studioGuideIndex + 1}
        totalSteps={studioGuideSteps.length}
        title={currentStudioGuide?.title}
        description={currentStudioGuide?.description}
        onSkip={finishStudioGuide}
        skipLabel={t("publisher.guideSkip")}
        onPrev={handleStudioGuidePrev}
        prevLabel={t("publisher.guidePrev")}
        prevDisabled={studioGuideIndex === 0}
        onNext={handleStudioGuideNext}
        nextLabel={studioGuideIndex === studioGuideSteps.length - 1 ? t("publisher.guideDone") : t("publisher.guideNext")}
      />
      </div>
    </div>
    </div>
  );
}
