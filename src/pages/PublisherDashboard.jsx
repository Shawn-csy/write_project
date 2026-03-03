import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { PanelLeftOpen, FileText, UserRound, Building2, Layers3, CircleHelp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { ScriptMetadataDialog } from "../components/dashboard/ScriptMetadataDialog";
import { getMorandiTagStyle } from "../lib/tagColors";
import { MORANDI_STUDIO_TONE_VARS } from "../constants/morandiPanelTones";
import { getPersonas, createPersona, updatePersona, deletePersona, getOrganizations, createOrganization, updateOrganization, deleteOrganization, getUserScripts, getTags, getOrganizationMembers, getOrganizationInvites, getOrganizationRequests, inviteOrganizationMember, acceptOrganizationRequest, declineOrganizationRequest, getMyOrganizationInvites, acceptOrganizationInvite, declineOrganizationInvite, searchUsers, getUserProfile, getOrganization, getPublicPersona, getSeries, createSeries, updateSeries, deleteSeries, updateScript, removeOrganizationMember, removeOrganizationPersona, updateOrganizationMemberRole } from "../lib/db";
import { PublisherWorksTab } from "../components/dashboard/publisher/PublisherWorksTab";
import { PublisherProfileTab } from "../components/dashboard/publisher/PublisherProfileTab";
import { PublisherOrgTab } from "../components/dashboard/publisher/PublisherOrgTab";
import { PublisherSeriesTab } from "../components/dashboard/publisher/PublisherSeriesTab";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/ui/toast";
import { useI18n } from "../contexts/I18nContext";

const STUDIO_GUIDE_STORAGE_KEY = "studio-guide-seen-v1";


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
  const [orgMembers, setOrgMembers] = useState({ users: [], personas: [] });
  const [orgInvites, setOrgInvites] = useState([]);
  const [orgRequests, setOrgRequests] = useState([]);
  const [myInvites, setMyInvites] = useState([]);
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const [inviteSearchResults, setInviteSearchResults] = useState([]);
  const [isInviteSearching, setIsInviteSearching] = useState(false);
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
  const [isOrgMembersLoading, setIsOrgMembersLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [seriesList, setSeriesList] = useState([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [seriesDraft, setSeriesDraft] = useState({ name: "", summary: "", coverUrl: "" });
  const [isSavingSeries, setIsSavingSeries] = useState(false);
  const [showStudioGuide, setShowStudioGuide] = useState(false);
  const [studioGuideIndex, setStudioGuideIndex] = useState(0);
  const [studioSpotlightRect, setStudioSpotlightRect] = useState(null);
  const tabsGuideRef = useRef(null);
  const worksTabGuideRef = useRef(null);
  const profileTabGuideRef = useRef(null);
  const orgTabGuideRef = useRef(null);

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

  const normalizeOrgIds = (value) => {
      if (Array.isArray(value)) return value.filter(Boolean);
      if (!value) return [];
      if (typeof value === "string") {
          try {
              const parsed = JSON.parse(value);
              return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
          } catch {
              return [];
          }
      }
      return [];
  };

  const resolveProfileOrgIds = (profile) => {
      const fromIds = normalizeOrgIds(profile?.organizationIds);
      const fromSingle = profile?.organizationId ? [profile.organizationId] : [];
      return Array.from(new Set([...fromIds, ...fromSingle].filter(Boolean)));
  };

  const currentUserId = currentUser?.uid || currentProfile?.id || null;
  const currentOrgRole = React.useMemo(() => {
      if (!currentUserId || !selectedOrgId) return null;
      const me = (orgMembers?.users || []).find((u) => u.id === currentUserId);
      return me?.organizationRole || null;
  }, [currentUserId, selectedOrgId, orgMembers]);
  const canManageOrgMembers = currentOrgRole === "owner" || currentOrgRole === "admin";
  const tabCounts = React.useMemo(() => ({
      works: scripts.length,
      profile: personas.length,
      org: orgsForPersona.length,
      series: seriesList.length,
  }), [scripts.length, personas.length, orgsForPersona.length, seriesList.length]);
  const tabDescriptions = React.useMemo(() => ({
      works: "管理作品公開狀態、封面與授權資訊",
      profile: "管理作者身份、作者頁顯示內容與組織展示",
      org: "管理組織資訊、成員與角色權限",
      series: "管理系列封面、摘要與收錄作品",
  }), []);
  const tabTone = MORANDI_STUDIO_TONE_VARS;
  const renderTabCount = (count) => (
      count ? <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{count}</span> : null
  );
  const studioGuideSteps = useMemo(() => ([
      {
          title: t("publisher.guideTabsTitle"),
          description: t("publisher.guideTabsDesc"),
          target: "tabs",
          tab: "works",
      },
      {
          title: t("publisher.guideWorksTitle"),
          description: t("publisher.guideWorksDesc"),
          target: "works",
          tab: "works",
      },
      {
          title: t("publisher.guideProfileTitle"),
          description: t("publisher.guideProfileDesc"),
          target: "profile",
          tab: "profile",
      },
      {
          title: t("publisher.guideOrgTitle"),
          description: t("publisher.guideOrgDesc"),
          target: "org",
          tab: "org",
      },
  ]), [t]);
  const currentStudioGuide = showStudioGuide ? studioGuideSteps[studioGuideIndex] : null;

  const buildAffiliatedOrgs = async (ownedOrgs, profile, personaList) => {
      const baseOrgs = ownedOrgs || [];
      const memberOrgIds = resolveProfileOrgIds(profile);
      let mergedOrgs = baseOrgs;
      const extraOrgIds = new Set();

      memberOrgIds.forEach((oid) => {
          if (!baseOrgs.some((o) => o.id === oid)) extraOrgIds.add(oid);
      });

      (personaList || []).forEach((p) => {
          (p.organizationIds || []).forEach((oid) => {
              if (!baseOrgs.some((o) => o.id === oid)) extraOrgIds.add(oid);
          });
      });

      if (extraOrgIds.size > 0) {
          const fetched = [];
          for (const oid of extraOrgIds) {
              try {
                  const org = await getOrganization(oid);
                  if (org) fetched.push(org);
              } catch {
                  // ignore not found/forbidden
              }
          }
          mergedOrgs = [...mergedOrgs, ...fetched].filter(Boolean);
      }

      const deduped = [];
      const seen = new Set();
      for (const o of mergedOrgs) {
          if (!o || !o.id || seen.has(o.id)) continue;
          seen.add(o.id);
          deduped.push(o);
      }
      return deduped;
  };


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

  const handleTabChange = useCallback((nextTab) => {
      setActiveTab(nextTab);
      const params = new URLSearchParams(location.search || "");
      if (!nextTab || nextTab === "works") params.delete("tab");
      else params.set("tab", nextTab);
      const query = params.toString();
      navigate(`/studio${query ? `?${query}` : ""}`, { replace: true });
  }, [location.search, navigate]);

  const resolveStudioGuideTarget = useCallback(() => {
      if (!currentStudioGuide) return null;
      if (currentStudioGuide.target === "tabs") return tabsGuideRef.current;
      if (currentStudioGuide.target === "works") return document.querySelector('[data-guide-id="studio-works-panel"]');
      if (currentStudioGuide.target === "profile") return document.querySelector('[data-guide-id="studio-profile-panel"]');
      if (currentStudioGuide.target === "org") return document.querySelector('[data-guide-id="studio-org-panel"]');
      return null;
  }, [currentStudioGuide]);

  const refreshStudioSpotlight = useCallback(() => {
      if (!showStudioGuide) {
          setStudioSpotlightRect(null);
          return;
      }
      const target = resolveStudioGuideTarget();
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const pad = 10;
      setStudioSpotlightRect({
          top: Math.max(8, rect.top - pad),
          left: Math.max(8, rect.left - pad),
          width: Math.max(64, rect.width + pad * 2),
          height: Math.max(48, rect.height + pad * 2),
      });
  }, [resolveStudioGuideTarget, showStudioGuide]);

  const jumpStudioGuide = useCallback((index) => {
      const next = studioGuideSteps[index];
      if (!next) return;
      if (next.tab && activeTab !== next.tab) {
          handleTabChange(next.tab);
      }
      setStudioGuideIndex(index);
      setShowStudioGuide(true);
  }, [activeTab, handleTabChange, studioGuideSteps]);

  const finishStudioGuide = useCallback(() => {
      setShowStudioGuide(false);
      setStudioGuideIndex(0);
      setStudioSpotlightRect(null);
      handleTabChange("works");
      try {
          localStorage.setItem(STUDIO_GUIDE_STORAGE_KEY, "1");
      } catch (err) {
          console.error("Failed to persist studio guide state", err);
      }
  }, [handleTabChange]);

  const handleStudioGuideNext = useCallback(() => {
      if (studioGuideIndex >= studioGuideSteps.length - 1) {
          finishStudioGuide();
          return;
      }
      jumpStudioGuide(studioGuideIndex + 1);
  }, [finishStudioGuide, jumpStudioGuide, studioGuideIndex, studioGuideSteps.length]);

  const handleStudioGuidePrev = useCallback(() => {
      if (studioGuideIndex <= 0) return;
      jumpStudioGuide(studioGuideIndex - 1);
  }, [jumpStudioGuide, studioGuideIndex]);

  const handleStartStudioGuide = useCallback(() => {
      jumpStudioGuide(0);
  }, [jumpStudioGuide]);

  useEffect(() => {
      if (!currentUser) return;
      try {
          const seen = localStorage.getItem(STUDIO_GUIDE_STORAGE_KEY) === "1";
          if (!seen) {
              jumpStudioGuide(0);
              localStorage.setItem(STUDIO_GUIDE_STORAGE_KEY, "1");
          }
      } catch (err) {
          console.error("Failed to read studio guide state", err);
      }
  }, [currentUser, jumpStudioGuide]);

  useEffect(() => {
      if (!showStudioGuide) return;
      const raf = window.requestAnimationFrame(refreshStudioSpotlight);
      window.addEventListener("resize", refreshStudioSpotlight);
      window.addEventListener("scroll", refreshStudioSpotlight, true);
      return () => {
          window.cancelAnimationFrame(raf);
          window.removeEventListener("resize", refreshStudioSpotlight);
          window.removeEventListener("scroll", refreshStudioSpotlight, true);
      };
  }, [showStudioGuide, studioGuideIndex, activeTab, refreshStudioSpotlight]);

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
        const deduped = await buildAffiliatedOrgs(orgData || [], currentProfile, normalizedPersonas);
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

  const handleCreateSeries = async () => {
      if (!seriesDraft.name.trim()) return;
      setIsSavingSeries(true);
      try {
          const created = await createSeries({
              name: seriesDraft.name.trim(),
              summary: seriesDraft.summary || "",
              coverUrl: seriesDraft.coverUrl || "",
          });
          setSeriesList((prev) => [created, ...prev]);
          setSelectedSeriesId(created.id);
          toast({ title: "已建立系列" });
      } catch (error) {
          console.error("Failed to create series", error);
          toast({ title: "建立系列失敗", variant: "destructive" });
      } finally {
          setIsSavingSeries(false);
      }
  };

  const handleUpdateSeries = async () => {
      if (!selectedSeriesId || !seriesDraft.name.trim()) return;
      setIsSavingSeries(true);
      try {
          const updated = await updateSeries(selectedSeriesId, {
              name: seriesDraft.name.trim(),
              summary: seriesDraft.summary || "",
              coverUrl: seriesDraft.coverUrl || "",
          });
          setSeriesList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          toast({ title: "已更新系列" });
      } catch (error) {
          console.error("Failed to update series", error);
          toast({ title: "更新系列失敗", variant: "destructive" });
      } finally {
          setIsSavingSeries(false);
      }
  };

  const handleDeleteSeries = async () => {
      if (!selectedSeriesId) return;
      setIsSavingSeries(true);
      try {
          await deleteSeries(selectedSeriesId);
          setSeriesList((prev) => prev.filter((s) => s.id !== selectedSeriesId));
          setSelectedSeriesId("");
          setSeriesDraft({ name: "", summary: "", coverUrl: "" });
          setScripts((prev) => prev.map((s) => (s.seriesId === selectedSeriesId ? { ...s, seriesId: null, seriesOrder: null, series: null } : s)));
          toast({ title: "已刪除系列" });
      } catch (error) {
          console.error("Failed to delete series", error);
          toast({ title: "刪除系列失敗", variant: "destructive" });
      } finally {
          setIsSavingSeries(false);
      }
  };

  const handleDetachScriptFromSeries = async (scriptId, seriesId) => {
      if (!scriptId || !seriesId) return;
      try {
          await updateScript(scriptId, { seriesId: null, seriesOrder: null });
          setScripts((prev) =>
              prev.map((script) =>
                  script.id === scriptId
                      ? { ...script, seriesId: null, seriesOrder: null, series: null }
                      : script
              )
          );
          setSeriesList((prev) =>
              prev.map((series) =>
                  series.id === seriesId
                      ? { ...series, scriptCount: Math.max(0, Number(series.scriptCount || 0) - 1) }
                      : series
              )
          );
          toast({ title: "已從系列移除作品" });
      } catch (error) {
          console.error("Failed to detach script from series", error);
          toast({ title: "移除失敗", variant: "destructive" });
      }
  };

  const refreshOrgChoices = async () => {
      if (!currentUser) return;
      try {
          const profile = currentProfile || await getUserProfile();
          const mergedOrgs = await buildAffiliatedOrgs(orgs || [], profile, personas || []);
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

  useEffect(() => {
      const loadMembers = async () => {
          if (!selectedOrgId || !currentUser) return;
          setIsOrgMembersLoading(true);
          setOrgMembers({ users: [], personas: [] });
          try {
              const data = await getOrganizationMembers(selectedOrgId);
              setOrgMembers(data || { users: [], personas: [] });
          } catch (e) {
              console.error("Failed to load organization members", e);
              setOrgMembers({ users: [], personas: [] });
          } finally {
              setIsOrgMembersLoading(false);
          }
      };
      loadMembers();
  }, [selectedOrgId, currentUser]);

  useEffect(() => {
      const loadOrgQueues = async () => {
          if (!selectedOrgId || !currentUser) return;
          setOrgInvites([]);
          setOrgRequests([]);
          setInviteSearchQuery("");
          setInviteSearchResults([]);
          setIsInviteSearching(false);
          try {
              const [inv, req] = await Promise.all([
                  getOrganizationInvites(selectedOrgId),
                  getOrganizationRequests(selectedOrgId)
              ]);
              setOrgInvites(inv?.invites || []);
              setOrgRequests(req?.requests || []);
          } catch (e) {
              // likely 403 if current role cannot manage org queue
              setOrgInvites([]);
              setOrgRequests([]);
          }
      };
      loadOrgQueues();
  }, [selectedOrgId, currentUser]);

  useEffect(() => {
      const loadMyInvites = async () => {
          if (!currentUser) return;
          try {
              const data = await getMyOrganizationInvites();
              setMyInvites(data?.invites || []);
          } catch (e) {
              setMyInvites([]);
          }
      };
      loadMyInvites();
  }, [currentUser]);

  useEffect(() => {
      if (!inviteSearchQuery) {
          setInviteSearchResults([]);
          return;
      }
      const delay = setTimeout(async () => {
          setIsInviteSearching(true);
          try {
              const results = await searchUsers(inviteSearchQuery);
              setInviteSearchResults(results || []);
          } catch (e) {
              setInviteSearchResults([]);
          } finally {
              setIsInviteSearching(false);
          }
      }, 400);
      return () => clearTimeout(delay);
  }, [inviteSearchQuery]);

  const handleInviteMember = async (userId) => {
      if (!selectedOrgId) return;
      await inviteOrganizationMember(selectedOrgId, userId);
      setInviteSearchQuery("");
      setInviteSearchResults([]);
      const inv = await getOrganizationInvites(selectedOrgId);
      setOrgInvites(inv?.invites || []);
  };

  const handleAcceptRequest = async (requestId) => {
      await acceptOrganizationRequest(requestId);
      const req = await getOrganizationRequests(selectedOrgId);
      setOrgRequests(req?.requests || []);
      const members = await getOrganizationMembers(selectedOrgId);
      setOrgMembers(members || { users: [], personas: [] });
  };

  const handleDeclineRequest = async (requestId) => {
      await declineOrganizationRequest(requestId);
      const req = await getOrganizationRequests(selectedOrgId);
      setOrgRequests(req?.requests || []);
  };

  const handleRemoveMember = async (userId) => {
      if (!selectedOrgId || !userId) return;
      await removeOrganizationMember(selectedOrgId, userId);
      const members = await getOrganizationMembers(selectedOrgId);
      setOrgMembers(members || { users: [], personas: [] });
  };

  const handleRemovePersonaMember = async (personaId) => {
      if (!selectedOrgId || !personaId) return;
      await removeOrganizationPersona(selectedOrgId, personaId);
      const members = await getOrganizationMembers(selectedOrgId);
      setOrgMembers(members || { users: [], personas: [] });
  };

  const handleChangeMemberRole = async (userId, role) => {
      if (!selectedOrgId || !userId || !role) return;
      await updateOrganizationMemberRole(selectedOrgId, userId, role);
      const members = await getOrganizationMembers(selectedOrgId);
      setOrgMembers(members || { users: [], personas: [] });
  };

  const handleAcceptInvite = async (inviteId) => {
      if (!personas.length) {
          toast({
              title: t("publisher.noPersonaBeforeJoinOrg", "請先建立作者身份"),
              description: t("publisher.noPersonaBeforeJoinOrgDesc", "加入組織前請先建立至少一個作者身份。"),
              variant: "destructive",
          });
          handleTabChange("profile");
          return;
      }
      await acceptOrganizationInvite(inviteId);
      const mine = await getMyOrganizationInvites();
      setMyInvites(mine?.invites || []);
      await refreshOrgChoices();
  };

  const handleDeclineInvite = async (inviteId) => {
      await declineOrganizationInvite(inviteId);
      const mine = await getMyOrganizationInvites();
      setMyInvites(mine?.invites || []);
  };

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

  const handleSaveProfile = async () => {
      if (!selectedPersonaId) return;
      setIsSavingProfile(true);
      try {
          await updatePersona(selectedPersonaId, personaDraft);
          await loadData(true);
          toast({ title: t("publisher.updatedPersona") });
      } catch (e) {
          console.error("Failed to update persona", e);
          toast({ title: t("publisher.updatePersonaFailed"), variant: "destructive" });
      } finally {
          setIsSavingProfile(false);
      }
  };

  const handleSaveOrg = async () => {
      if (!orgDraft?.id) return;
      setIsSavingOrg(true);
      try {
          await updateOrganization(orgDraft.id, {
              name: orgDraft.name,
              description: orgDraft.description,
              website: orgDraft.website,
              logoUrl: orgDraft.logoUrl,
              bannerUrl: orgDraft.bannerUrl,
              tags: orgDraft.tags
          });
          await loadData(true);
          toast({ title: t("publisher.updatedOrg") });
      } catch (e) {
          console.error("Failed to update org", e);
          toast({ title: t("publisher.updateOrgFailed"), variant: "destructive" });
      } finally {
          setIsSavingOrg(false);
      }
  };

  const handleCreatePersona = async () => {
      if (!personaDraft.displayName.trim()) return;
      setIsCreatingPersona(true);
      try {
          const created = await createPersona(personaDraft);
          await loadData(true);
          setSelectedPersonaId(created?.id || null);
          toast({ title: t("publisher.createdPersona") });
      } catch (e) {
          console.error("Failed to create persona", e);
          toast({ title: t("publisher.createPersonaFailed"), variant: "destructive" });
      } finally {
          setIsCreatingPersona(false);
      }
  };

  const handleDeletePersona = async () => {
      if (!selectedPersonaId) return;
      try {
          await deletePersona(selectedPersonaId);
          await loadData(true);
          setConfirmDeletePersonaOpen(false);
          toast({ title: t("publisher.deletedPersona") });
      } catch (e) {
          console.error("Failed to delete persona", e);
          toast({ title: t("publisher.deletePersonaFailed"), variant: "destructive" });
      }
  };

  const handleCreateOrg = async () => {
      if (!orgDraft.name.trim()) return;
      setIsCreatingOrg(true);
      try {
          const created = await createOrganization({
              name: orgDraft.name,
              description: orgDraft.description,
              website: orgDraft.website,
              logoUrl: orgDraft.logoUrl,
              bannerUrl: orgDraft.bannerUrl,
              tags: orgDraft.tags
          });
          await loadData(true);
          setSelectedOrgId(created?.id || null);
          toast({ title: t("publisher.createdOrg") });
      } catch (e) {
          console.error("Failed to create organization", e);
          toast({ title: t("publisher.createOrgFailed"), variant: "destructive" });
      } finally {
          setIsCreatingOrg(false);
      }
  };

  const handleDeleteOrg = async () => {
      if (!orgDraft?.id) return;
      try {
          await deleteOrganization(orgDraft.id);
          await loadData(true);
          setConfirmDeleteOrgOpen(false);
          toast({ title: t("publisher.deletedOrg") });
      } catch (e) {
          console.error("Failed to delete organization", e);
          toast({ title: t("publisher.deleteOrgFailed"), variant: "destructive" });
      }
  };

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-background">
    <div className="container mx-auto p-6 max-w-6xl space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <div className="lg:hidden">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openMobileMenu?.()}
                    title={t("publisher.expandMenu")}
                    className="-ml-2"
                >
                    <PanelLeftOpen className="w-5 h-5 text-muted-foreground" />
                </Button>
            </div>
            {/* Desktop Sidebar Toggle */}
            <div className={`hidden lg:block ${isSidebarOpen ? "lg:hidden" : ""}`}>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSidebarOpen && setSidebarOpen(true)}
                    title={t("publisher.expandSidebar")}
                    className="-ml-2"
                >
                    <PanelLeftOpen className="w-5 h-5 text-muted-foreground" />
                </Button>
            </div>
            
             {/* Mobile Menu Toggle (Assuming openMobileMenu is passed or handled via Context/MainLayout logic, but here we might need to rely on MainLayout context if not passed) */}
            {/* Ideally openMobileMenu should be passed. App.jsx didn't pass it yet. Let's rely on setSidebarOpen usually being sufficient or we need openMobileMenu.
                Actually MainLayout passes setIsMobileDrawerOpen to children? No.
                App.jsx routes don't easily pass it.
                Let's stick to Desktop Toggle first which is the complaint.
            */}

            <div>
                <h1 className="text-3xl font-serif font-bold tracking-tight">{t("publisher.title")}</h1>
                <p className="text-muted-foreground mt-1">{t("publisher.subtitle")}</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={handleStartStudioGuide}>
                <CircleHelp className="w-4 h-4 mr-1.5" />
                {t("publisher.guide")}
            </Button>
        </div>
      </div>

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
                  ref={worksTabGuideRef}
                  value="works"
                  style={tabTone.works}
                  className="h-11 justify-start px-3 border border-transparent transition-colors data-[state=active]:border-[var(--morandi-tone-panel-border)] data-[state=active]:bg-[var(--morandi-tone-trigger-bg)] data-[state=active]:text-[var(--morandi-tone-trigger-fg)]"
                >
                    <span className="flex items-center gap-2 text-xs sm:text-sm">
                        <FileText className="h-4 w-4" />
                        <span>{t("publisher.myWorks")}</span>
                        {renderTabCount(tabCounts.works)}
                    </span>
                </TabsTrigger>
                <TabsTrigger
                  ref={profileTabGuideRef}
                  value="profile"
                  style={tabTone.profile}
                  className="h-11 justify-start px-3 border border-transparent transition-colors data-[state=active]:border-[var(--morandi-tone-panel-border)] data-[state=active]:bg-[var(--morandi-tone-trigger-bg)] data-[state=active]:text-[var(--morandi-tone-trigger-fg)]"
                >
                    <span className="flex items-center gap-2 text-xs sm:text-sm">
                        <UserRound className="h-4 w-4" />
                        <span>{t("publisher.authorIdentity")}</span>
                        {renderTabCount(tabCounts.profile)}
                    </span>
                </TabsTrigger>
                <TabsTrigger
                  ref={orgTabGuideRef}
                  value="org"
                  style={tabTone.org}
                  className="h-11 justify-start px-3 border border-transparent transition-colors data-[state=active]:border-[var(--morandi-tone-panel-border)] data-[state=active]:bg-[var(--morandi-tone-trigger-bg)] data-[state=active]:text-[var(--morandi-tone-trigger-fg)]"
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
                  className="h-11 justify-start px-3 border border-transparent transition-colors data-[state=active]:border-[var(--morandi-tone-panel-border)] data-[state=active]:bg-[var(--morandi-tone-trigger-bg)] data-[state=active]:text-[var(--morandi-tone-trigger-fg)]"
                >
                    <span className="flex items-center gap-2 text-xs sm:text-sm">
                        <Layers3 className="h-4 w-4" />
                        <span>系列管理</span>
                        {renderTabCount(tabCounts.series)}
                    </span>
                </TabsTrigger>
            </TabsList>
            <div
              style={tabTone[activeTab] || tabTone.works}
              className="mt-2 rounded-md border-l-4 border-[var(--morandi-tone-helper-border)] bg-[var(--morandi-tone-helper-bg)] px-2 py-1.5 text-xs text-[var(--morandi-tone-helper-fg)]"
            >
                {tabDescriptions[activeTab] || tabDescriptions.works}
            </div>
        </div>

        {/* 1. My Works Tab */}
        <TabsContent
          value="works"
          style={tabTone.works}
          className="space-y-4 rounded-xl border border-[var(--morandi-tone-panel-border)] bg-[var(--morandi-tone-panel-bg)] p-3"
          data-guide-id="studio-works-panel"
        >
             <PublisherWorksTab 
                isLoading={isWorksLoading} 
                scripts={scripts} 
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
          className="rounded-xl border border-[var(--morandi-tone-panel-border)] bg-[var(--morandi-tone-panel-bg)] p-3"
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
            onOpenChange={(open) => !open && setEditingScript(null)} 
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
                setEditingScript(null);
                setScripts(prev => prev.map(s => s.id === updatedScript.id ? { ...s, ...updatedScript } : s));
            }}
        />

        {/* 3. Organization Tab */}
        <TabsContent
          value="org"
          style={tabTone.org}
          className="rounded-xl border border-[var(--morandi-tone-panel-border)] bg-[var(--morandi-tone-panel-bg)] p-3"
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
          className="rounded-xl border border-[var(--morandi-tone-panel-border)] bg-[var(--morandi-tone-panel-bg)] p-3"
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
      {showStudioGuide && currentStudioGuide && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[220] pointer-events-none">
          {studioSpotlightRect ? (
            <>
              <div className="absolute left-0 top-0 bg-black/75 pointer-events-auto" style={{ width: "100%", height: studioSpotlightRect.top }} />
              <div className="absolute left-0 bg-black/75 pointer-events-auto" style={{ top: studioSpotlightRect.top, width: studioSpotlightRect.left, height: studioSpotlightRect.height }} />
              <div
                className="absolute right-0 bg-black/75 pointer-events-auto"
                style={{
                    top: studioSpotlightRect.top,
                    left: studioSpotlightRect.left + studioSpotlightRect.width,
                    height: studioSpotlightRect.height,
                }}
              />
              <div className="absolute left-0 bg-black/75 pointer-events-auto" style={{ top: studioSpotlightRect.top + studioSpotlightRect.height, width: "100%", bottom: 0 }} />
              <div
                className="absolute rounded-xl border-2 border-primary shadow-[0_0_40px_rgba(255,255,255,0.12)] pointer-events-none"
                style={{
                    top: studioSpotlightRect.top,
                    left: studioSpotlightRect.left,
                    width: studioSpotlightRect.width,
                    height: studioSpotlightRect.height,
                }}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-black/75 pointer-events-auto" />
          )}
          <div className="absolute right-6 bottom-6 w-[380px] max-w-[calc(100vw-3rem)] rounded-xl border bg-background p-4 shadow-2xl pointer-events-auto">
              <div className="text-xs text-muted-foreground">{studioGuideIndex + 1}/{studioGuideSteps.length}</div>
              <div className="text-base font-semibold mt-1">{currentStudioGuide.title}</div>
              <p className="text-sm text-muted-foreground mt-1">{currentStudioGuide.description}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={finishStudioGuide}>
                  {t("publisher.guideSkip")}
                </Button>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={handleStudioGuidePrev} disabled={studioGuideIndex === 0}>
                    {t("publisher.guidePrev")}
                  </Button>
                  <Button type="button" size="sm" onClick={handleStudioGuideNext}>
                    {studioGuideIndex === studioGuideSteps.length - 1 ? t("publisher.guideDone") : t("publisher.guideNext")}
                  </Button>
                </div>
              </div>
          </div>
        </div>,
        document.body
      )}
    </div>
    </div>
  );
}
