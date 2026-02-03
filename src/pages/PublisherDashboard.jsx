import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Edit, Eye, Trash2, Plus, Building2, Loader2 } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { ScriptMetadataDialog } from "../components/dashboard/ScriptMetadataDialog";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getMorandiTagStyle } from "../lib/tagColors";
import { getPersonas, createPersona, updatePersona, deletePersona, getOrganizations, createOrganization, updateOrganization, deleteOrganization, getUserScripts, getTags } from "../lib/db";
// import { useToast } from "../components/ui/use-toast"; // Toast not installed yet, using alert

export function PublisherDashboard() {
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
  const [personaDraft, setPersonaDraft] = useState({ displayName: "", bio: "", website: "", avatar: "", organizationIds: [], tags: [] });
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

  const SortableTag = ({ id, onRemove }) => {
      const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
      const style = {
          transform: CSS.Transform.toString(transform),
          transition,
          ...getTagStyle(id),
      };
      return (
          <span
              ref={setNodeRef}
              style={style}
              className="text-xs px-2 py-1 rounded-full flex items-center gap-1 cursor-grab"
              {...attributes}
              {...listeners}
          >
              {id}
              <button type="button" className="opacity-80 hover:opacity-100" onClick={onRemove}>×</button>
          </span>
      );
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

  const loadData = async () => {
    setIsLoading(true);
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
            .filter(s => s.type !== "folder")
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
        setIsLoading(false);
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
              tags: persona.tags || []
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
          await loadData();
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
          await loadData();
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
          await loadData();
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
          await loadData();
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
          await loadData();
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
          await loadData();
      } catch (e) {
          console.error("Failed to delete organization", e);
          alert("Failed to delete organization.");
      }
  };

  return (
    <div className="h-full overflow-y-auto">
    <div className="container mx-auto p-6 max-w-6xl space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight">發佈工作室</h1>
            <p className="text-muted-foreground mt-1">管理你的作者身份、作品與組織頁面。</p>
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
             <div className="grid gap-4">
                {isLoading ? (
                    <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div>
                ) : scripts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">尚未有任何作品</div>
                ) : scripts.map(script => (
                    <Card key={script.id} className="flex flex-col sm:flex-row overflow-hidden group">
                        {/* Thumbnail */}
                        <div className="w-full sm:w-32 h-32 bg-muted shrink-0 relative">
                             {script.cover ? (
                                <img src={script.cover} alt={script.title} className="w-full h-full object-cover" />
                             ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground bg-secondary/30">
                                    <span className="text-xs italic">No Cover</span>
                                </div>
                             )}
                        </div>
                        
                        {/* Details */}
                        <div className="flex-1 p-4 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-lg font-serif">{script.title}</h3>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                        <span>更新：{formatDate(script.lastModified)}</span>
                                        <span>•</span>
                                        <Badge variant={script.status === "Public" ? "default" : "secondary"} className="h-5 text-[10px]">
                                            {script.status === "Public" ? "公開" : "私人"}
                                        </Badge>
                                    </div>
                                </div>
                                
                                {/* Stats (Visible only if public) */}
                                {script.status === "Public" && (
                                    <div className="flex gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1"><Eye className="w-4 h-4" /> {script.views}</div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-border/50">
                                <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditingScript(script)}>
                                    <Edit className="w-3.5 h-3.5 mr-1.5" /> 編輯資訊
                                </Button>
                                {script.status === "Public" && (
                                     <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-muted-foreground hover:text-foreground"
                                        onClick={() => navigate(`/read/${script.id}`)}
                                     >
                                        <Eye className="w-3.5 h-3.5 mr-1.5" /> 查看公開頁
                                     </Button>
                                )}
                                <div className="flex-1"></div>
                                <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
             </div>
        </TabsContent>

        {/* 2. Profile Tab (Inline Editor) */}
        <TabsContent value="profile">
            <Card>
                <CardHeader>
                    <CardTitle>作者身份</CardTitle>
                    <CardDescription>選擇作者身份並編輯作者頁面資訊。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-3">
                        <label className="text-sm font-medium">作者身份</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Select value={selectedPersonaId || ""} onValueChange={setSelectedPersonaId}>
                                <SelectTrigger className="w-full sm:w-[280px]">
                                    <SelectValue placeholder="選擇身份" />
                                </SelectTrigger>
                                <SelectContent>
                                    {personas.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.displayName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={handleCreatePersona} disabled={isCreatingPersona || !personaDraft.displayName.trim()}>
                                    {isCreatingPersona && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> 建立
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDeletePersona} disabled={!selectedPersonaId}>
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> 刪除
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="space-y-2 flex flex-col items-center">
                            <Avatar className="w-24 h-24 border-2 border-muted">
                                <AvatarImage src={personaDraft.avatar || "https://github.com/shadcn.png"} />
                                <AvatarFallback>我</AvatarFallback>
                            </Avatar>
                            <Input
                                value={personaDraft.avatar}
                                onChange={e => setPersonaDraft({ ...personaDraft, avatar: e.target.value })}
                                placeholder="頭像網址"
                            />
                        </div>
                        <div className="flex-1 space-y-4">
                             <div className="grid gap-2">
                                <label className="text-sm font-medium">顯示名稱</label>
                                <Input 
                                    value={personaDraft.displayName} 
                                    onChange={e => setPersonaDraft({ ...personaDraft, displayName: e.target.value })} 
                                />
                             </div>
                             <div className="grid gap-2">
                                <label className="text-sm font-medium">簡介</label>
                                <Textarea 
                                    value={personaDraft.bio}
                                    onChange={e => setPersonaDraft({ ...personaDraft, bio: e.target.value })}
                                />
                             </div>
                             <div className="grid gap-2">
                                <label className="text-sm font-medium">網站</label>
                                <Input 
                                    value={personaDraft.website} 
                                    onChange={e => setPersonaDraft({ ...personaDraft, website: e.target.value })} 
                                    placeholder="https://" 
                                />
                             </div>
                              <div className="grid gap-2">
                                <label className="text-sm font-medium">所屬組織</label>
                                <div className="grid gap-2">
                                    {orgs.length === 0 ? (
                                        <div className="text-xs text-muted-foreground">尚未建立組織。</div>
                                    ) : (
                                        orgs.map(org => {
                                            const checked = (personaDraft.organizationIds || []).includes(org.id);
                                            return (
                                                <label key={org.id} className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(e) => {
                                                            const next = e.target.checked
                                                                ? [...(personaDraft.organizationIds || []), org.id]
                                                                : (personaDraft.organizationIds || []).filter(id => id !== org.id);
                                                            setPersonaDraft({ ...personaDraft, organizationIds: next });
                                                        }}
                                                    />
                                                    <span>{org.name}</span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                             </div>
                             <div className="grid gap-2">
                                <label className="text-sm font-medium">作者標籤</label>
                                <DndContext
                                  collisionDetection={closestCenter}
                                  onDragEnd={({ active, over }) => {
                                    if (!over || active.id === over.id) return;
                                    const items = personaDraft.tags || [];
                                    const oldIndex = items.indexOf(active.id);
                                    const newIndex = items.indexOf(over.id);
                                    setPersonaDraft({ ...personaDraft, tags: arrayMove(items, oldIndex, newIndex) });
                                  }}
                                >
                                  <SortableContext items={personaDraft.tags || []} strategy={horizontalListSortingStrategy}>
                                    <div className="flex flex-wrap gap-2">
                                      {(personaDraft.tags || []).map(tag => (
                                        <SortableTag
                                          key={tag}
                                          id={tag}
                                          onRemove={() => {
                                            setPersonaDraft({
                                              ...personaDraft,
                                              tags: (personaDraft.tags || []).filter(t => t !== tag),
                                            });
                                          }}
                                        />
                                      ))}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                                <Input
                                  value={personaTagInput}
                                  onChange={(e) => setPersonaTagInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === "," || e.key === "，") {
                                      e.preventDefault();
                                      const incoming = parseTags(personaTagInput);
                                      if (incoming.length === 0) return;
                                      setPersonaDraft({
                                        ...personaDraft,
                                        tags: addTags(personaDraft.tags || [], incoming),
                                      });
                                      setPersonaTagInput("");
                                    }
                                  }}
                                  onBlur={() => {
                                    const incoming = parseTags(personaTagInput);
                                    if (incoming.length === 0) return;
                                    setPersonaDraft({
                                      ...personaDraft,
                                      tags: addTags(personaDraft.tags || [], incoming),
                                    });
                                    setPersonaTagInput("");
                                  }}
                                  placeholder="輸入標籤（Enter 或逗號加入）"
                                />
                                {personaTagInput.trim() && (
                                  <div className="relative">
                                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-md p-2 flex flex-wrap gap-2">
                                    {getSuggestions(personaTagInput, personaDraft.tags || []).map(tag => (
                                      <button
                                        key={tag.id}
                                        type="button"
                                        className="text-xs px-2 py-1 rounded-full"
                                        style={getTagStyle(tag.name)}
                                        onClick={() => {
                                          setPersonaDraft({
                                            ...personaDraft,
                                            tags: addTags(personaDraft.tags || [], [tag.name]),
                                          });
                                          setPersonaTagInput("");
                                        }}
                                      >
                                        {tag.name}
                                      </button>
                                    ))}
                                    </div>
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground">可自由輸入或從現有標籤挑選。</div>
                             </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSaveProfile} disabled={isSavingProfile || !selectedPersonaId}>
                            {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            儲存
                        </Button>
                    </div>
                </CardContent>
            </Card>
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
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>組織設定</CardTitle>
                            <CardDescription>管理你的組織頁面與資訊。</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs font-normal">
                             <Building2 className="w-3 h-3 mr-1" />
                             管理者
                        </Badge>
                     </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    {orgs.length > 0 ? (
                        <>
                             <div className="grid gap-2">
                                <label className="text-sm font-medium">選擇組織</label>
                                <div className="flex items-center gap-3">
                                    <Select value={selectedOrgId || ""} onValueChange={setSelectedOrgId}>
                                        <SelectTrigger className="w-full sm:w-[280px]">
                                            <SelectValue placeholder="選擇組織" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {orgs.map(o => (
                                                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="sm" onClick={handleCreateOrg} disabled={isCreatingOrg || !orgDraft.name.trim()}>
                                        {isCreatingOrg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Plus className="w-3.5 h-3.5 mr-1.5" /> 建立
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDeleteOrg} disabled={!orgDraft?.id}>
                                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> 刪除
                                    </Button>
                                </div>
                             </div>
                             {/* Org Info */}
                             <div className="space-y-4">
                                 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">基本資訊</h3>
                                 <div className="grid gap-2">
                                    <label className="text-sm font-medium">組織名稱</label>
                                    <Input 
                                        value={orgDraft.name} 
                                        onChange={e => setOrgDraft({ ...orgDraft, name: e.target.value })}
                                    />
                                 </div>
                                 <div className="grid gap-2">
                                     <label className="text-sm font-medium">描述</label>
                                     <Input 
                                        value={orgDraft.description} 
                                        onChange={e => setOrgDraft({ ...orgDraft, description: e.target.value })}
                                     />
                                 </div>
                                 <div className="grid gap-2">
                                     <label className="text-sm font-medium">網站</label>
                                     <Input 
                                        value={orgDraft.website} 
                                        onChange={e => setOrgDraft({ ...orgDraft, website: e.target.value })}
                                        placeholder="https://"
                                     />
                                 </div>
                                 <div className="grid gap-2">
                                     <label className="text-sm font-medium">Logo 圖片網址</label>
                                     <Input 
                                        value={orgDraft.logoUrl} 
                                        onChange={e => setOrgDraft({ ...orgDraft, logoUrl: e.target.value })}
                                        placeholder="https://"
                                     />
                                 </div>
                                 <div className="grid gap-2">
                                     <label className="text-sm font-medium">組織標籤</label>
                                     <DndContext
                                       collisionDetection={closestCenter}
                                       onDragEnd={({ active, over }) => {
                                         if (!over || active.id === over.id) return;
                                         const items = orgDraft.tags || [];
                                         const oldIndex = items.indexOf(active.id);
                                         const newIndex = items.indexOf(over.id);
                                         setOrgDraft({ ...orgDraft, tags: arrayMove(items, oldIndex, newIndex) });
                                       }}
                                     >
                                       <SortableContext items={orgDraft.tags || []} strategy={horizontalListSortingStrategy}>
                                         <div className="flex flex-wrap gap-2">
                                           {(orgDraft.tags || []).map(tag => (
                                             <SortableTag
                                               key={tag}
                                               id={tag}
                                               onRemove={() => {
                                                 setOrgDraft({
                                                   ...orgDraft,
                                                   tags: (orgDraft.tags || []).filter(t => t !== tag),
                                                 });
                                               }}
                                             />
                                           ))}
                                         </div>
                                       </SortableContext>
                                     </DndContext>
                                     <Input
                                       value={orgTagInput}
                                       onChange={(e) => setOrgTagInput(e.target.value)}
                                       onKeyDown={(e) => {
                                         if (e.key === "Enter" || e.key === "," || e.key === "，") {
                                           e.preventDefault();
                                           const incoming = parseTags(orgTagInput);
                                           if (incoming.length === 0) return;
                                           setOrgDraft({
                                             ...orgDraft,
                                             tags: addTags(orgDraft.tags || [], incoming),
                                           });
                                           setOrgTagInput("");
                                         }
                                       }}
                                       onBlur={() => {
                                         const incoming = parseTags(orgTagInput);
                                         if (incoming.length === 0) return;
                                         setOrgDraft({
                                           ...orgDraft,
                                           tags: addTags(orgDraft.tags || [], incoming),
                                         });
                                         setOrgTagInput("");
                                       }}
                                       placeholder="輸入標籤（Enter 或逗號加入）"
                                     />
                                     {orgTagInput.trim() && (
                                       <div className="relative">
                                         <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-md p-2 flex flex-wrap gap-2">
                                         {getSuggestions(orgTagInput, orgDraft.tags || []).map(tag => (
                                           <button
                                             key={tag.id}
                                             type="button"
                                             className="text-xs px-2 py-1 rounded-full"
                                             style={getTagStyle(tag.name)}
                                             onClick={() => {
                                               setOrgDraft({
                                                 ...orgDraft,
                                                 tags: addTags(orgDraft.tags || [], [tag.name]),
                                               });
                                               setOrgTagInput("");
                                             }}
                                           >
                                             {tag.name}
                                           </button>
                                         ))}
                                         </div>
                                       </div>
                                     )}
                                     <div className="text-xs text-muted-foreground">可自由輸入或從現有標籤挑選。</div>
                                 </div>
                             </div>
                             
                             {/* Members (Read Only for now or separate component needed for management) */}
                             <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Members</h3>
                                    <Button variant="outline" size="sm">
                                        <Plus className="w-3 h-3 mr-1.5" /> Invite
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground italic">Member management coming soon.</p>
                             </div>
                             
                             <div className="flex justify-end">
                                <Button onClick={handleSaveOrg} disabled={isSavingOrg || !orgDraft?.id}>
                                    {isSavingOrg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    儲存
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>尚未建立任何組織。</p>
                            <div className="max-w-md mx-auto mt-4 space-y-3 text-left">
                                <Input
                                    value={orgDraft.name}
                                    onChange={e => setOrgDraft({ ...orgDraft, name: e.target.value })}
                                    placeholder="組織名稱"
                                />
                                <Input
                                    value={orgDraft.description}
                                    onChange={e => setOrgDraft({ ...orgDraft, description: e.target.value })}
                                    placeholder="描述"
                                />
                                <Input
                                    value={orgDraft.website}
                                    onChange={e => setOrgDraft({ ...orgDraft, website: e.target.value })}
                                    placeholder="https://"
                                />
                                <Input
                                    value={orgDraft.logoUrl}
                                    onChange={e => setOrgDraft({ ...orgDraft, logoUrl: e.target.value })}
                                    placeholder="Logo 圖片網址"
                                />
                                <DndContext
                                  collisionDetection={closestCenter}
                                  onDragEnd={({ active, over }) => {
                                    if (!over || active.id === over.id) return;
                                    const items = orgDraft.tags || [];
                                    const oldIndex = items.indexOf(active.id);
                                    const newIndex = items.indexOf(over.id);
                                    setOrgDraft({ ...orgDraft, tags: arrayMove(items, oldIndex, newIndex) });
                                  }}
                                >
                                  <SortableContext items={orgDraft.tags || []} strategy={horizontalListSortingStrategy}>
                                    <div className="flex flex-wrap gap-2">
                                      {(orgDraft.tags || []).map(tag => (
                                        <SortableTag
                                          key={tag}
                                          id={tag}
                                          onRemove={() => {
                                            setOrgDraft({
                                              ...orgDraft,
                                              tags: (orgDraft.tags || []).filter(t => t !== tag),
                                            });
                                          }}
                                        />
                                      ))}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                                <Input
                                  value={orgTagInput}
                                  onChange={(e) => setOrgTagInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === "," || e.key === "，") {
                                      e.preventDefault();
                                      const incoming = parseTags(orgTagInput);
                                      if (incoming.length === 0) return;
                                      setOrgDraft({
                                        ...orgDraft,
                                        tags: addTags(orgDraft.tags || [], incoming),
                                      });
                                      setOrgTagInput("");
                                    }
                                  }}
                                  onBlur={() => {
                                    const incoming = parseTags(orgTagInput);
                                    if (incoming.length === 0) return;
                                    setOrgDraft({
                                      ...orgDraft,
                                      tags: addTags(orgDraft.tags || [], incoming),
                                    });
                                    setOrgTagInput("");
                                  }}
                                  placeholder="輸入標籤（Enter 或逗號加入）"
                                />
                                {orgTagInput.trim() && (
                                  <div className="relative">
                                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-md p-2 flex flex-wrap gap-2">
                                      {getSuggestions(orgTagInput, orgDraft.tags || []).map(tag => (
                                        <button
                                          key={tag.id}
                                          type="button"
                                          className="text-xs px-2 py-1 rounded-full"
                                          style={getTagStyle(tag.name)}
                                          onClick={() => {
                                            setOrgDraft({
                                              ...orgDraft,
                                              tags: addTags(orgDraft.tags || [], [tag.name]),
                                            });
                                            setOrgTagInput("");
                                          }}
                                        >
                                          {tag.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <Button onClick={handleCreateOrg} disabled={isCreatingOrg || !orgDraft.name.trim()} className="w-full">
                                    {isCreatingOrg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    建立組織
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
    </div>
  );
}
