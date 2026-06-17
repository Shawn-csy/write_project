import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/ui/toast";
import { useI18n } from "../../contexts/I18nContext";
import { getOrganizations, getOrganization } from "../../lib/api/organizations";
import { getUserProfile } from "../../lib/api/user";
import { getStudioBootstrap, getStudioPublishContext, getStudioScriptsPage } from "../../lib/api/studio";
import { getMorandiTagStyle } from "../../lib/tagColors";
import { MORANDI_STUDIO_TONE_VARS } from "../../constants/morandiPanelTones";
import { normalizeOrgIds } from "../dashboard/scriptMetadataUtils";
import { useStudioGuide } from "./useStudioGuide";
import { usePublisherSeriesEditor } from "./usePublisherSeriesEditor";
import { usePublisherOrgMemberActions } from "./usePublisherOrgMemberActions";
import { usePublisherOrgQueues } from "./usePublisherOrgQueues";
import { usePublisherCrudActions } from "./usePublisherCrudActions";
import { buildAffiliatedOrganizations } from "../../lib/orgAffiliation";
import type { PersonaLike, OrgData } from "../../types/persona";
import type { BaseScriptApi, StudioScriptCounts } from "../../types/api";

interface TagData { id: string; name: string; }
interface SeriesData { id: string; name?: string; summary?: string; coverUrl?: string; coverCrop?: { cx?: number; cy?: number; zoom?: number } | null; }
const STUDIO_PAGE_LIMIT = 24;

export type { SeriesData };

interface PublisherDashboardStateProps {
  isSidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  openMobileMenu?: () => void;
}

export function usePublisherDashboardState(props: PublisherDashboardStateProps) {
  const { isSidebarOpen, setSidebarOpen, openMobileMenu } = props;
  const { t } = useI18n();
  const { currentUser, profile: currentProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const resolveTabFromSearch = useCallback((search: string) => {
    const raw = new URLSearchParams(search || "").get("tab");
    return ["works", "profile", "org", "series"].includes(raw ?? "") ? (raw as string) : "works";
  }, []);

  const [activeTab, setActiveTab] = useState(() => resolveTabFromSearch(location.search));
  const [editingScript, setEditingScript] = useState<Partial<BaseScriptApi> | null>(null);
  const [confirmDeletePersonaOpen, setConfirmDeletePersonaOpen] = useState(false);
  const [confirmDeleteOrgOpen, setConfirmDeleteOrgOpen] = useState(false);
  const [personas, setPersonas] = useState<PersonaLike[]>([]);
  const [orgs, setOrgs] = useState<OrgData[]>([]);
  const [orgsForPersona, setOrgsForPersona] = useState<OrgData[]>([]);
  const [scripts, setScripts] = useState<BaseScriptApi[]>([]);
  const [scriptCounts, setScriptCounts] = useState<StudioScriptCounts | null>(null);
  const [scriptsNextOffset, setScriptsNextOffset] = useState<number | null>(null);
  const [isLoadingMoreWorks, setIsLoadingMoreWorks] = useState(false);
  const [worksQuery, setWorksQuery] = useState<{
    filter: "all" | "needs_work" | "ready" | "published";
    q: string;
    sort: "updated_desc" | "updated_asc" | "title_asc" | "views_desc";
  }>({ filter: "all", q: "", sort: "updated_desc" });
  const [availableTags, setAvailableTags] = useState<TagData[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [personaDraft, setPersonaDraft] = useState({
    displayName: "", bio: "", website: "",
    links: [] as Array<{ url?: string; label?: string }> | string,
    avatar: "", avatarCrop: null as { cx?: number; cy?: number; zoom?: number } | null,
    bannerUrl: "", bannerCrop: null as { cx?: number; cy?: number; zoom?: number } | null,
    organizationIds: [] as string[], tags: [] as string[],
    defaultLicenseCommercial: "", defaultLicenseDerivative: "", defaultLicenseNotify: "",
    defaultLicenseSpecialTerms: [] as string[],
  });
  const [personasLoadedAt, setPersonasLoadedAt] = useState(0);
  const [orgDraft, setOrgDraft] = useState({
    id: "", name: "", description: "", website: "",
    logoUrl: "", logoCrop: null as { cx?: number; cy?: number; zoom?: number } | null,
    bannerUrl: "", bannerCrop: null as { cx?: number; cy?: number; zoom?: number } | null,
    tags: [] as string[]
  });
  const [personaTagInput, setPersonaTagInput] = useState("");
  const [orgTagInput, setOrgTagInput] = useState("");
  const [isWorksLoading, setIsWorksLoading] = useState(true);
  const [isMetaLoading, setIsMetaLoading] = useState(true);

  const seriesEditor = usePublisherSeriesEditor({ scripts, setScripts, toast });
  const {
    seriesList, setSeriesList, selectedSeriesId, setSelectedSeriesId,
    seriesDraft, setSeriesDraft, isSavingSeries,
    selectedSeriesScripts, attachableScripts,
    handleCreateSeries, handleUpdateSeries, handleDeleteSeries,
    handleDetachScriptFromSeries, handleAttachScriptToSeries, handleReorderScriptInSeries,
    handleBatchReorderSeriesScripts,
  } = seriesEditor;

  const tabsGuideRef = useRef<HTMLDivElement | null>(null);
  const bootstrapRequestedRef = useRef(false);
  const worksQueryRef = useRef(worksQuery);

  useEffect(() => {
    worksQueryRef.current = worksQuery;
  }, [worksQuery]);

  useEffect(() => {
    bootstrapRequestedRef.current = false;
    setIsMetaLoading(Boolean(currentUser));
  }, [currentUser?.uid]);

  const {
    orgMembers, setOrgMembers, isOrgMembersLoading,
    orgInvites, setOrgInvites, orgRequests, setOrgRequests,
    myInvites, setMyInvites,
    inviteSearchQuery, setInviteSearchQuery,
    inviteSearchResults, setInviteSearchResults,
    isInviteSearching,
  } = usePublisherOrgQueues({ selectedOrgId, currentUser, enabled: activeTab === "org" });

  const formatDate = (ts: number | string | null | undefined): string => {
    if (!ts) return "-";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toISOString().slice(0, 10);
  };

  const parseTags = (value: string): string[] =>
    value.split(/,|，|、|#|\n|\t|;/).map(tag => tag.trim()).filter(Boolean);

  const addTags = (existing: string[], incoming: string[]): string[] => {
    const merged = [...existing];
    incoming.forEach(tag => { if (!merged.includes(tag)) merged.push(tag); });
    return merged;
  };

  const getSuggestions = (input: string, existing: string[]): string[] => {
    const needle = input.trim().toLowerCase();
    return (availableTags || [])
      .filter(tag => tag.name?.toLowerCase().includes(needle))
      .filter(tag => tag.name && !existing.includes(tag.name))
      .slice(0, 6)
      .map(tag => tag.name as string);
  };

  const currentUserIds = useMemo((): string[] =>
    Array.from(new Set([
      currentUser?.uid,
      (currentProfile as { id?: string } | null)?.id,
      (currentProfile as { uid?: string } | null)?.uid,
      (currentProfile as { userId?: string } | null)?.userId,
    ].filter((v): v is string => typeof v === "string")))
  , [currentProfile?.id, currentProfile?.uid, currentProfile?.userId, currentUser?.uid]);

  const currentUserId: string | undefined = currentUserIds[0];

  const currentOrgRole = useMemo((): string | undefined => {
    if (!selectedOrgId) return undefined;
    const me = (orgMembers?.users || []).find(u => u.id && currentUserIds.includes(u.id));
    const memberRole = (me?.role as string | undefined) || undefined;
    if (memberRole) return memberRole;
    const selectedOrg = (orgsForPersona || []).find(o => o.id === selectedOrgId);
    if (!selectedOrg) return undefined;
    const rawRole = selectedOrg.organizationRole ?? selectedOrg.myRole ?? selectedOrg.memberRole ?? selectedOrg.role;
    const fallbackRole = typeof rawRole === "string" ? rawRole : undefined;
    if (fallbackRole) return fallbackRole;
    const rawOwner = selectedOrg.ownerId ?? selectedOrg.ownerUid ?? selectedOrg.ownerUserId;
    const ownerId = typeof rawOwner === "string" ? rawOwner : undefined;
    if (ownerId && currentUserIds.includes(ownerId)) return "owner";
    return undefined;
  }, [selectedOrgId, orgMembers, currentUserIds, orgsForPersona]);

  const canManageOrgMembers = currentOrgRole === "owner" || currentOrgRole === "admin";

  const tabCounts = useMemo(() => ({
    works: scripts.length, profile: personas.length,
    org: orgsForPersona.length, series: seriesList.length,
  }), [scripts.length, personas.length, orgsForPersona.length, seriesList.length]);

  const tabTone = MORANDI_STUDIO_TONE_VARS;

  const allTagNames = Array.from(new Set([
    ...(availableTags || []).map(t => t.name).filter((n): n is string => Boolean(n)),
    ...(personaDraft.tags || []),
    ...(orgDraft.tags || []),
  ]));

  const getTagStyle = (name: string) => getMorandiTagStyle(name, allTagNames);

  const normalizeStudioScripts = useCallback((scriptData: BaseScriptApi[]) =>
    (scriptData || [])
      .filter(s => s.type !== "folder" && !s.isFolder)
  , []);

  const loadWorks = useCallback(async (isBackground = false, offset = 0) => {
    if (!currentUser) return;
    const query = worksQueryRef.current;
    if (!isBackground && offset === 0) setIsWorksLoading(true);
    if (offset > 0) setIsLoadingMoreWorks(true);
    try {
      const response = await getStudioScriptsPage({
        limit: STUDIO_PAGE_LIMIT,
        offset,
        status: query.filter,
        q: query.q,
        sort: query.sort,
        includeCounts: offset === 0,
      });
      const normalized = normalizeStudioScripts(response.items || []);
      setScripts(prev => offset > 0 ? [...prev, ...normalized.filter(item => !prev.some(existing => existing.id === item.id))] : normalized);
      if (offset === 0) setScriptCounts(response.counts || null);
      setScriptsNextOffset(typeof response.nextOffset === "number" ? response.nextOffset : null);
    } catch (e) {
      console.error("Failed to load scripts", e);
    } finally {
      if (!isBackground && offset === 0) setIsWorksLoading(false);
      if (offset > 0) setIsLoadingMoreWorks(false);
    }
  }, [currentUser, normalizeStudioScripts]);

  const loadBootstrap = useCallback(async () => {
    if (!currentUser) return;
    setIsWorksLoading(true);
    setIsMetaLoading(true);
    try {
      const data = await getStudioBootstrap(STUDIO_PAGE_LIMIT);
      setScripts(normalizeStudioScripts(data.scripts?.items || []));
      setScriptCounts(data.scripts?.counts || null);
      setScriptsNextOffset(typeof data.scripts?.nextOffset === "number" ? data.scripts.nextOffset : null);

      const normalizedPersonas = (data.personas || []).map(p => {
        let links = p?.links;
        if (typeof links === "string") { try { links = JSON.parse(links); } catch { links = []; } }
        if (!Array.isArray(links)) links = [];
        return { ...p, links, organizationIds: normalizeOrgIds(p?.organizationIds) };
      });
      const deduped = await buildAffiliatedOrganizations({
        ownedOrgs: data.organizations || [], profile: currentProfile,
        personas: normalizedPersonas, fetchOrganizationById: getOrganization,
      });
      setPersonas(normalizedPersonas);
      setPersonasLoadedAt(Date.now());
      setOrgs(data.organizations || []);
      setOrgsForPersona(deduped);
      setAvailableTags((data.tags || []).map((tag) => ({ id: String(tag.id ?? ""), name: String(tag.name || "") })));
      setSeriesList(data.series || []);
      setMyInvites(data.myInvites || []);
      const preferredPersonaId = localStorage.getItem("preferredPersonaId");
      const nextPersona = (preferredPersonaId && normalizedPersonas.find(p => p.id === preferredPersonaId)) || normalizedPersonas[0];
      if (nextPersona) setSelectedPersonaId(nextPersona.id);
      if (deduped.length > 0) setSelectedOrgId(prev => (prev && deduped.some(o => o.id === prev) ? prev : deduped[0].id));
    } catch (e) {
      console.error("Failed to load studio bootstrap", e);
    } finally {
      setIsWorksLoading(false);
      setIsMetaLoading(false);
      bootstrapRequestedRef.current = true;
    }
  }, [currentProfile, currentUser, normalizeStudioScripts, setMyInvites]);

  const loadData = useCallback(async (isBackground = false) => {
    if (!currentUser) return;
    if (isBackground) {
      await loadBootstrap();
      return;
    }
    await loadBootstrap();
  }, [currentUser, loadBootstrap]);

  useEffect(() => {
    if (!currentUser || bootstrapRequestedRef.current) return;
    loadBootstrap();
  }, [currentUser, loadBootstrap]);

  useEffect(() => {
    if (!currentUser || !bootstrapRequestedRef.current) return;
    let cancelled = false;
    const timerId = window.setTimeout(() => {
      if (!cancelled) loadWorks(false, 0);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [currentUser, loadWorks, worksQuery]);

  useEffect(() => {
    const nextTab = resolveTabFromSearch(location.search);
    setActiveTab(prev => prev === nextTab ? prev : nextTab);
  }, [location.search, resolveTabFromSearch]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const requestedScriptId = params.get("scriptId");
    const shouldOpenPublish = params.get("open") === "publish";
    if (!requestedScriptId || !shouldOpenPublish) return;
    const existing = (scripts || []).find(s => s.id === requestedScriptId);
    if (existing) {
      setActiveTab("works");
      setEditingScript(prev => prev?.id === existing.id ? prev : existing);
      return;
    }
    let cancelled = false;
    getStudioPublishContext(requestedScriptId)
      .then((target) => {
        if (cancelled || !target?.id) return;
        setScripts(prev => prev.some(item => item.id === target.id) ? prev : [target, ...prev]);
        setActiveTab("works");
        setEditingScript(prev => prev?.id === target.id ? prev : target);
      })
      .catch(e => console.error("Failed to load publish context", e));
    return () => { cancelled = true; };
  }, [location.search, scripts]);

  const handleWorksQueryChange = useCallback((next: {
    filter: "all" | "needs_work" | "ready" | "published";
    q: string;
    sort: "updated_desc" | "updated_asc" | "title_asc" | "views_desc";
  }) => {
    setWorksQuery(prev => (
      prev.filter === next.filter && prev.q === next.q && prev.sort === next.sort
        ? prev
        : next
    ));
  }, []);

  const handleLoadMoreWorks = useCallback(() => {
    if (typeof scriptsNextOffset !== "number" || isLoadingMoreWorks) return;
    loadWorks(false, scriptsNextOffset);
  }, [isLoadingMoreWorks, loadWorks, scriptsNextOffset]);

  useEffect(() => {
    if (!selectedPersonaId || personasLoadedAt === 0) return;
    localStorage.setItem("preferredPersonaId", selectedPersonaId);
    const persona = personas.find(p => p.id === selectedPersonaId);
    if (!persona) return;
    let links = persona.links;
    if (typeof links === "string") { try { links = JSON.parse(links); } catch { links = []; } }
    if (!Array.isArray(links)) links = [];
    setPersonaDraft({
      displayName: persona.displayName || "", bio: persona.bio || "",
      website: persona.website || "", links: links ?? [], avatar: persona.avatar || "",
      avatarCrop: (persona as { avatarCrop?: { cx?: number; cy?: number; zoom?: number } | null }).avatarCrop || null,
      bannerUrl: persona.bannerUrl || "",
      bannerCrop: (persona as { bannerCrop?: { cx?: number; cy?: number; zoom?: number } | null }).bannerCrop || null,
      organizationIds: persona.organizationIds || [],
      tags: persona.tags || [], defaultLicenseCommercial: persona.defaultLicenseCommercial || "",
      defaultLicenseDerivative: persona.defaultLicenseDerivative || "",
      defaultLicenseNotify: persona.defaultLicenseNotify || "",
      defaultLicenseSpecialTerms: persona.defaultLicenseSpecialTerms || [],
    });
    if ((persona.organizationIds || []).length > 0) {
      setSelectedOrgId((persona.organizationIds ?? [])[0] ?? null);
    }
  }, [selectedPersonaId, personasLoadedAt, personas]);

  useEffect(() => {
    if (!selectedOrgId) return;
    const org = orgs.find(o => o.id === selectedOrgId);
    if (org) setOrgDraft({
      id: org.id,
      name: org.name || "",
      description: org.description || "",
      website: org.website || "",
      logoUrl: org.logoUrl || "",
      logoCrop: (org as { logoCrop?: { cx?: number; cy?: number; zoom?: number } | null }).logoCrop || null,
      bannerUrl: org.bannerUrl || "",
      bannerCrop: (org as { bannerCrop?: { cx?: number; cy?: number; zoom?: number } | null }).bannerCrop || null,
      tags: org.tags || []
    });
  }, [selectedOrgId, orgs]);

  const handleTabChange = useCallback((nextTab: string) => {
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
    params.delete("scriptId"); params.delete("open");
    const query = params.toString();
    navigate(`/studio${query ? `?${query}` : ""}`, { replace: true });
  }, [location.search, navigate]);

  const refreshOrgChoices = async () => {
    if (!currentUser) return;
    try {
      const profile = currentProfile || await getUserProfile();
      const mergedOrgs = await buildAffiliatedOrganizations({
        ownedOrgs: orgs || [], profile, personas: personas || [], fetchOrganizationById: getOrganization,
      });
      setOrgsForPersona(mergedOrgs);
    } catch {}
  };

  const { handleInviteMember, handleAcceptRequest, handleDeclineRequest, handleRemoveMember,
    handleRemovePersonaMember, handleChangeMemberRole, handleAcceptInvite, handleDeclineInvite } =
    usePublisherOrgMemberActions({
      selectedOrgId, personas, t, toast, handleTabChange, refreshOrgChoices,
      setInviteSearchQuery, setInviteSearchResults, setOrgInvites, setOrgRequests, setOrgMembers, setMyInvites,
    });

  const { isSavingProfile, isSavingOrg, isCreatingPersona, isCreatingOrg,
    handleSaveProfile, handleSaveOrg, handleCreatePersona, handleDeletePersona, handleCreateOrg, handleDeleteOrg } =
    usePublisherCrudActions({
      selectedPersonaId, personaDraft, setSelectedPersonaId, setConfirmDeletePersonaOpen,
      orgDraft, setSelectedOrgId, setConfirmDeleteOrgOpen, loadData, t, toast,
    });

  const { showStudioGuide, studioGuideIndex, studioGuideSteps, currentStudioGuide, studioSpotlightRect,
    finishStudioGuide, handleStudioGuideNext, handleStudioGuidePrev, handleStartStudioGuide } =
    useStudioGuide({ t, currentUser, activeTab, handleTabChange, tabsGuideRef });

  const renderTabCount = (count: number) =>
    count ? React.createElement("span", { className: "rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground" }, count) : null;

  return {
    t, navigate, currentUser, isSidebarOpen, setSidebarOpen, openMobileMenu,
    activeTab, setActiveTab, handleTabChange,
    editingScript, setEditingScript, closePublishDialog,
    confirmDeletePersonaOpen, setConfirmDeletePersonaOpen,
    confirmDeleteOrgOpen, setConfirmDeleteOrgOpen,
    personas, orgs, orgsForPersona, scripts, setScripts, availableTags,
    scriptCounts, scriptsNextOffset, isLoadingMoreWorks,
    selectedPersonaId, setSelectedPersonaId,
    selectedOrgId, setSelectedOrgId,
    personaDraft, setPersonaDraft,
    orgDraft, setOrgDraft,
    personaTagInput, setPersonaTagInput,
    orgTagInput, setOrgTagInput,
    isWorksLoading, isMetaLoading, isOrgMembersLoading,
    seriesList, setSeriesList, selectedSeriesId, setSelectedSeriesId,
    seriesDraft, setSeriesDraft, isSavingSeries,
    selectedSeriesScripts, attachableScripts,
    orgMembers, orgInvites, orgRequests, myInvites,
    inviteSearchQuery, setInviteSearchQuery,
    inviteSearchResults, isInviteSearching,
    canManageOrgMembers, currentUserId, currentOrgRole,
    tabCounts, tabTone, renderTabCount, tabsGuideRef,
    parseTags, addTags, getSuggestions, getTagStyle, formatDate,
    handleWorksQueryChange, handleLoadMoreWorks,
    // CRUD
    isSavingProfile, isSavingOrg, isCreatingPersona, isCreatingOrg,
    handleSaveProfile, handleSaveOrg, handleCreatePersona, handleDeletePersona, handleCreateOrg, handleDeleteOrg,
    // series
    handleCreateSeries, handleUpdateSeries, handleDeleteSeries, handleDetachScriptFromSeries,
    handleAttachScriptToSeries, handleReorderScriptInSeries, handleBatchReorderSeriesScripts,
    // org members
    handleInviteMember, handleAcceptRequest, handleDeclineRequest, handleRemoveMember,
    handleRemovePersonaMember, handleChangeMemberRole, handleAcceptInvite, handleDeclineInvite,
    // guide
    showStudioGuide, studioGuideIndex, studioGuideSteps, currentStudioGuide, studioSpotlightRect,
    finishStudioGuide, handleStudioGuideNext, handleStudioGuidePrev, handleStartStudioGuide,
  };
}
