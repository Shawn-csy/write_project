import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Plus, PanelLeftOpen, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { ScriptMetadataDialog } from "../components/dashboard/ScriptMetadataDialog";
import { getMorandiTagStyle } from "../lib/tagColors";
import { getPersonas, createPersona, updatePersona, deletePersona, getOrganizations, createOrganization, updateOrganization, deleteOrganization, getUserScripts, getTags, getOrganizationMembers, getOrganizationInvites, getOrganizationRequests, inviteOrganizationMember, acceptOrganizationRequest, declineOrganizationRequest, getMyOrganizationInvites, acceptOrganizationInvite, declineOrganizationInvite, searchUsers, getUserProfile, getOrganization, getPublicPersona, createScript } from "../lib/db";
import { PublisherWorksTab } from "../components/dashboard/publisher/PublisherWorksTab";
import { PublisherProfileTab } from "../components/dashboard/publisher/PublisherProfileTab";
import { PublisherOrgTab } from "../components/dashboard/publisher/PublisherOrgTab";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/ui/toast";


export function PublisherDashboard({ isSidebarOpen, setSidebarOpen, openMobileMenu }) {
  const { currentUser, profile: currentProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("works");
  const [editingScript, setEditingScript] = useState(null);
  const [isCreatingScript, setIsCreatingScript] = useState(false);
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
  const [personaDraft, setPersonaDraft] = useState({ displayName: "", bio: "", website: "", links: [], avatar: "", bannerUrl: "", organizationIds: [], tags: [], defaultLicense: "", defaultLicenseUrl: "", defaultLicenseTerms: [] });
  const [personasLoadedAt, setPersonasLoadedAt] = useState(0);
  const [orgDraft, setOrgDraft] = useState({ id: "", name: "", description: "", website: "", logoUrl: "", bannerUrl: "", tags: [] });
  const [personaTagInput, setPersonaTagInput] = useState("");
  const [orgTagInput, setOrgTagInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const formatDate = (ts) => {
      if (!ts) return "-";
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return "-";
      return d.toISOString().slice(0, 10);
  };

  const parseTags = (value) => value
      .split(/,|，/)
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

  // personaDraft is fully driven by selectedPersonaId effect above

  const loadData = async (isBackground = false) => {
    if (!currentUser) return;
    if (!isBackground) setIsLoading(true);
    try {
        const [personaData, orgData, scriptData, tagData] = await Promise.all([
            getPersonas(),
            getOrganizations(),
            getUserScripts(),
            getTags(),
        ]);
        let normalizedPersonas = (personaData || []).map(p => {
            let links = p?.links;
            if (typeof links === "string") {
                try { links = JSON.parse(links); } catch { links = []; }
            }
            if (!Array.isArray(links)) links = [];
            return { ...p, links };
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
        const memberOrgId = currentProfile?.organizationId;
        let mergedOrgs = orgData || [];
        const extraOrgIds = new Set();
        if (memberOrgId && !(orgData || []).some(o => o.id === memberOrgId)) {
            extraOrgIds.add(memberOrgId);
        }
        (personaData || []).forEach(p => {
            (p.organizationIds || []).forEach(oid => {
                if (!(orgData || []).some(o => o.id === oid)) {
                    extraOrgIds.add(oid);
                }
            });
        });
        if (extraOrgIds.size > 0) {
            const fetched = [];
            for (const oid of extraOrgIds) {
                try {
                    const org = await getOrganization(oid);
                    if (org) fetched.push(org);
                } catch {}
            }
            mergedOrgs = [...mergedOrgs, ...fetched].filter(Boolean);
        }
        // de-dupe by id
        const deduped = [];
        const seen = new Set();
        for (const o of mergedOrgs) {
            if (!o || !o.id || seen.has(o.id)) continue;
            seen.add(o.id);
            deduped.push(o);
        }
        setOrgsForPersona(deduped);
        const sortedScripts = (scriptData || [])
            .filter(s => s.type !== "folder" && !s.isFolder)
            .sort((a, b) => {
                const aPublic = a.status === "Public" || a.isPublic;
                const bPublic = b.status === "Public" || b.isPublic;
                if (aPublic !== bPublic) return aPublic ? -1 : 1;
                return (b.lastModified || 0) - (a.lastModified || 0);
            });
        setScripts(sortedScripts);
        setAvailableTags(tagData || []);
        const preferredPersonaId = localStorage.getItem("preferredPersonaId");
        const personasForSelection = normalizedPersonas;
        const nextPersona =
            (preferredPersonaId && personasForSelection.find(p => p.id === preferredPersonaId)) ||
            personasForSelection[0];
        if (nextPersona) {
            setSelectedPersonaId(nextPersona.id);
        }
        if ((orgData || []).length > 0) {
            setSelectedOrgId(orgData[0].id);
        }
    } catch (e) {
        console.error("Failed to load studio data", e);
    } finally {
        if (!isBackground) setIsLoading(false);
    }
  };

  const refreshOrgChoices = async () => {
      if (!currentUser) return;
      try {
          const profile = currentProfile || await getUserProfile();
          const memberOrgId = profile?.organizationId;
          let mergedOrgs = orgs || [];
          if (memberOrgId && !(orgs || []).some(o => o.id === memberOrgId)) {
              try {
                  const memberOrg = await getOrganization(memberOrgId);
                  mergedOrgs = [...(orgs || []), memberOrg].filter(Boolean);
              } catch {
                  mergedOrgs = orgs || [];
              }
          }
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
              defaultLicense: persona.defaultLicense || "",
              defaultLicenseUrl: persona.defaultLicenseUrl || "",
              defaultLicenseTerms: persona.defaultLicenseTerms || []
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
          try {
              const data = await getOrganizationMembers(selectedOrgId);
              setOrgMembers(data || { users: [], personas: [] });
          } catch (e) {
              console.error("Failed to load organization members", e);
              setOrgMembers({ users: [], personas: [] });
          }
      };
      loadMembers();
  }, [selectedOrgId, currentUser]);

  useEffect(() => {
      const loadOrgQueues = async () => {
          if (!selectedOrgId || !currentUser) return;
          const isOwner = orgs.some(o => o.id === selectedOrgId);
          if (!isOwner) {
              setOrgInvites([]);
              setOrgRequests([]);
              return;
          }
          try {
              const [inv, req] = await Promise.all([
                  getOrganizationInvites(selectedOrgId),
                  getOrganizationRequests(selectedOrgId)
              ]);
              setOrgInvites(inv?.invites || []);
              setOrgRequests(req?.requests || []);
          } catch (e) {
              // likely 403 if not owner
              setOrgInvites([]);
              setOrgRequests([]);
          }
      };
      loadOrgQueues();
  }, [selectedOrgId, currentUser, orgs]);

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

  const handleAcceptInvite = async (inviteId) => {
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
          toast({ title: "作者身份已更新" });
      } catch (e) {
          console.error("Failed to update persona", e);
          toast({ title: "更新作者身份失敗", variant: "destructive" });
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
          toast({ title: "組織已更新" });
      } catch (e) {
          console.error("Failed to update org", e);
          toast({ title: "更新組織失敗", variant: "destructive" });
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
          toast({ title: "已建立作者身份" });
      } catch (e) {
          console.error("Failed to create persona", e);
          toast({ title: "建立作者身份失敗", variant: "destructive" });
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
          toast({ title: "作者身份已刪除" });
      } catch (e) {
          console.error("Failed to delete persona", e);
          toast({ title: "刪除作者身份失敗", variant: "destructive" });
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
          toast({ title: "已建立組織" });
      } catch (e) {
          console.error("Failed to create organization", e);
          toast({ title: "建立組織失敗", variant: "destructive" });
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
          toast({ title: "組織已刪除" });
      } catch (e) {
          console.error("Failed to delete organization", e);
          toast({ title: "刪除組織失敗", variant: "destructive" });
      }
  };

  const handleCreateScript = async () => {
      if (isCreatingScript) return;
      setIsCreatingScript(true);
      try {
          const id = await createScript("Untitled Script", "script", "/");
          navigate(`/edit/${id}?mode=edit`);
      } catch (e) {
          console.error("Failed to create script", e);
          toast({ title: "建立劇本失敗", description: "請稍後再試。", variant: "destructive" });
      } finally {
          setIsCreatingScript(false);
      }
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
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
                    title="展開選單"
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
                    title="展開側邊欄"
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
                <h1 className="text-3xl font-serif font-bold tracking-tight">發佈工作室</h1>
                <p className="text-muted-foreground mt-1">管理你的作者身份、作品與組織頁面。</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
             <Button onClick={handleCreateScript} disabled={isCreatingScript}>
                {isCreatingScript ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                新增劇本
             </Button>
        </div>
      </div>

      {myInvites.length > 0 && (
        <div className="border rounded-lg p-4 bg-muted/20 mb-6">
          <div className="text-sm font-medium mb-2">我的組織邀請</div>
          <div className="space-y-2">
            {myInvites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between text-sm">
                <span>邀請加入組織：{inv.orgId}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAcceptInvite(inv.id)}>接受</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeclineInvite(inv.id)}>拒絕</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full md:w-[400px] grid-cols-1 sm:grid-cols-3 gap-1 h-auto sm:h-9">
            <TabsTrigger value="works">我的作品</TabsTrigger>
            <TabsTrigger value="profile">作者身份</TabsTrigger>
            <TabsTrigger value="org">組織</TabsTrigger>
        </TabsList>

        {/* 1. My Works Tab */}
        <TabsContent value="works" className="space-y-4">
             <PublisherWorksTab 
                isLoading={isLoading} 
                scripts={scripts} 
                setEditingScript={setEditingScript} 
                navigate={navigate} 
                formatDate={formatDate} 
                onContinueEdit={(script) => navigate(`/edit/${script.id}?mode=edit`)}
             />
        </TabsContent>

        {/* 2. Profile Tab (Inline Editor) */}
        <TabsContent value="profile">
            <PublisherProfileTab
                selectedPersonaId={selectedPersonaId} setSelectedPersonaId={setSelectedPersonaId}
                personas={personas}
                selectedPersona={personas.find(p => p.id === selectedPersonaId)}
                handleCreatePersona={handleCreatePersona} isCreatingPersona={isCreatingPersona}
                handleDeletePersona={() => setConfirmDeletePersonaOpen(true)}
                personaDraft={personaDraft} setPersonaDraft={setPersonaDraft}
                orgs={orgsForPersona}
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
            onSave={(updatedScript) => {
                setEditingScript(null);
                setScripts(prev => prev.map(s => s.id === updatedScript.id ? { ...s, ...updatedScript } : s));
            }}
        />

        {/* 3. Organization Tab */}
        <TabsContent value="org">
                <PublisherOrgTab 
                orgs={orgs} 
                selectedOrgId={selectedOrgId} setSelectedOrgId={setSelectedOrgId}
                handleCreateOrg={handleCreateOrg} isCreatingOrg={isCreatingOrg}
                handleDeleteOrg={() => setConfirmDeleteOrgOpen(true)}
                orgDraft={orgDraft} setOrgDraft={setOrgDraft}
                handleSaveOrg={handleSaveOrg} isSavingOrg={isSavingOrg}
                orgTagInput={orgTagInput} setOrgTagInput={setOrgTagInput}
                parseTags={parseTags} addTags={addTags} getSuggestions={getSuggestions} getTagStyle={getTagStyle}
                tagOptions={availableTags}
                orgMembers={orgMembers}
                orgInvites={orgInvites}
                orgRequests={orgRequests}
                isOrgOwner={orgs.some(o => o.id === selectedOrgId)}
                inviteSearchQuery={inviteSearchQuery}
                setInviteSearchQuery={setInviteSearchQuery}
                inviteSearchResults={inviteSearchResults}
                isInviteSearching={isInviteSearching}
                handleInviteMember={handleInviteMember}
                handleAcceptRequest={handleAcceptRequest}
                handleDeclineRequest={handleDeclineRequest}
                />
        </TabsContent>

      </Tabs>

      <Dialog open={confirmDeletePersonaOpen} onOpenChange={setConfirmDeletePersonaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>刪除作者身份？</DialogTitle>
            <DialogDescription>這個操作無法復原，相關公開頁面將失效。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeletePersonaOpen(false)}>取消</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeletePersona}>確認刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOrgOpen} onOpenChange={setConfirmDeleteOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>刪除組織？</DialogTitle>
            <DialogDescription>此操作會解除與作品的關聯，且無法復原。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOrgOpen(false)}>取消</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteOrg}>確認刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
