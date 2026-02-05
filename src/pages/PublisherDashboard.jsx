import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Plus, PanelLeftOpen } from "lucide-react";
import { ScriptMetadataDialog } from "../components/dashboard/ScriptMetadataDialog";
import { getMorandiTagStyle } from "../lib/tagColors";
import { getPersonas, createPersona, updatePersona, deletePersona, getOrganizations, createOrganization, updateOrganization, deleteOrganization, getUserScripts, getTags } from "../lib/db";
import { PublisherWorksTab } from "../components/dashboard/publisher/PublisherWorksTab";
import { PublisherProfileTab } from "../components/dashboard/publisher/PublisherProfileTab";
import { PublisherOrgTab } from "../components/dashboard/publisher/PublisherOrgTab";


export function PublisherDashboard({ isSidebarOpen, setSidebarOpen, openMobileMenu }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("works");
  const [editingScript, setEditingScript] = useState(null);
  
  // Data State
  const [personas, setPersonas] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [personaDraft, setPersonaDraft] = useState({ displayName: "", bio: "", website: "", avatar: "", organizationIds: [], tags: [], defaultLicense: "", defaultLicenseUrl: "", defaultLicenseTerms: [] });
  const [orgDraft, setOrgDraft] = useState({ id: "", name: "", description: "", website: "", logoUrl: "", tags: [] });
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
    loadData();
  }, []);

  const loadData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
        const [personaData, orgData, scriptData, tagData] = await Promise.all([
            getPersonas(),
            getOrganizations(),
            getUserScripts(),
            getTags()
        ]);
        setPersonas(personaData || []);
        setOrgs(orgData || []);
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
        if (preferredPersonaId && (personaData || []).some(p => p.id === preferredPersonaId)) {
            setSelectedPersonaId(preferredPersonaId);
        } else if ((personaData || []).length > 0) {
            setSelectedPersonaId(personaData[0].id);
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

  useEffect(() => {
      if (!selectedPersonaId) return;
      localStorage.setItem("preferredPersonaId", selectedPersonaId);
      const persona = personas.find(p => p.id === selectedPersonaId);
      if (persona) {
          setPersonaDraft({
              displayName: persona.displayName || "",
              bio: persona.bio || "",
              website: persona.website || "",
              avatar: persona.avatar || "",
              organizationIds: persona.organizationIds || [],
              organizationIds: persona.organizationIds || [],
              tags: persona.tags || [],
              defaultLicense: persona.defaultLicense || "",
              defaultLicenseUrl: persona.defaultLicenseUrl || "",
              defaultLicenseTerms: persona.defaultLicenseTerms || []
          });
          if ((persona.organizationIds || []).length > 0) {
              setSelectedOrgId(persona.organizationIds[0]);
          }
      }
  }, [selectedPersonaId, personas]);

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
          alert("Persona updated successfully!");
      } catch (e) {
          console.error("Failed to update persona", e);
          alert("Failed to update persona.");
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
              tags: orgDraft.tags
          });
          await loadData(true);
          alert("Organization updated successfully!");
      } catch (e) {
          console.error("Failed to update org", e);
          alert("Failed to update organization.");
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
      } catch (e) {
          console.error("Failed to create persona", e);
          alert("Failed to create persona.");
      } finally {
          setIsCreatingPersona(false);
      }
  };

  const handleDeletePersona = async () => {
      if (!selectedPersonaId) return;
      if (!confirm("Delete this persona?")) return;
      try {
          await deletePersona(selectedPersonaId);
          await loadData(true);
      } catch (e) {
          console.error("Failed to delete persona", e);
          alert("Failed to delete persona.");
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
              tags: orgDraft.tags
          });
          await loadData(true);
          setSelectedOrgId(created?.id || null);
      } catch (e) {
          console.error("Failed to create organization", e);
          alert("Failed to create organization.");
      } finally {
          setIsCreatingOrg(false);
      }
  };

  const handleDeleteOrg = async () => {
      if (!orgDraft?.id) return;
      if (!confirm("Delete this organization? This will unlink all scripts.")) return;
      try {
          await deleteOrganization(orgDraft.id);
          await loadData(true);
      } catch (e) {
          console.error("Failed to delete organization", e);
          alert("Failed to delete organization.");
      }
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
    <div className="container mx-auto p-6 max-w-6xl space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
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
             <Button>
                <Plus className="w-4 h-4 mr-2" />
                新增劇本
             </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full md:w-[400px] grid-cols-3">
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
             />
        </TabsContent>

        {/* 2. Profile Tab (Inline Editor) */}
        <TabsContent value="profile">
            <PublisherProfileTab
                selectedPersonaId={selectedPersonaId} setSelectedPersonaId={setSelectedPersonaId}
                personas={personas}
                handleCreatePersona={handleCreatePersona} isCreatingPersona={isCreatingPersona}
                handleDeletePersona={handleDeletePersona}
                personaDraft={personaDraft} setPersonaDraft={setPersonaDraft}
                orgs={orgs}
                personaTagInput={personaTagInput} setPersonaTagInput={setPersonaTagInput}
                handleSaveProfile={handleSaveProfile} isSavingProfile={isSavingProfile}
                parseTags={parseTags} addTags={addTags} getSuggestions={getSuggestions} getTagStyle={getTagStyle}
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
                handleDeleteOrg={handleDeleteOrg}
                orgDraft={orgDraft} setOrgDraft={setOrgDraft}
                handleSaveOrg={handleSaveOrg} isSavingOrg={isSavingOrg}
                orgTagInput={orgTagInput} setOrgTagInput={setOrgTagInput}
                parseTags={parseTags} addTags={addTags} getSuggestions={getSuggestions} getTagStyle={getTagStyle}
            />
        </TabsContent>

      </Tabs>
    </div>
    </div>
  );
}
