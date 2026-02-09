import React from 'react';
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../../ui/card";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "../../ui/avatar";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableTag } from "./SortableTag";
import { MetadataLicenseTab } from "../metadata/MetadataLicenseTab";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { searchOrganizations, requestToJoinOrganization } from "../../../lib/db";

export function PublisherProfileTab({
    selectedPersonaId, setSelectedPersonaId,
    personas,
    selectedPersona,
    handleCreatePersona, isCreatingPersona,
    handleDeletePersona,
    personaDraft, setPersonaDraft,
    orgs,
    personaTagInput, setPersonaTagInput,
    handleSaveProfile, isSavingProfile,
    parseTags, addTags, getSuggestions, getTagStyle,
    tagOptions = []
}) {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = React.useState("edit"); // edit or create
    const [orgSearchQuery, setOrgSearchQuery] = React.useState("");
    const [orgSearchResults, setOrgSearchResults] = React.useState([]);
    const [isOrgSearching, setIsOrgSearching] = React.useState(false);
    const [tagOpen, setTagOpen] = React.useState(false);
    const filteredTagOptions = React.useMemo(() => {
        const needle = personaTagInput.trim().toLowerCase();
        const names = (tagOptions || []).map(t => t.name).filter(Boolean);
        if (!needle) return names;
        return names.filter(n => n.toLowerCase().includes(needle));
    }, [tagOptions, personaTagInput]);

    React.useEffect(() => {
        if (selectedPersonaId) {
            setViewMode("edit");
        }
    }, [selectedPersonaId]);

    React.useEffect(() => {
        if (!orgSearchQuery) {
            setOrgSearchResults([]);
            return;
        }
        const delay = setTimeout(async () => {
            setIsOrgSearching(true);
            try {
                const results = await searchOrganizations(orgSearchQuery);
                setOrgSearchResults(results || []);
            } catch (e) {
                setOrgSearchResults([]);
            } finally {
                setIsOrgSearching(false);
            }
        }, 400);
        return () => clearTimeout(delay);
    }, [orgSearchQuery]);

    const handleRequestJoinOrg = async (orgId) => {
        await requestToJoinOrganization(orgId);
        setOrgSearchQuery("");
        setOrgSearchResults([]);
    };

    const safeLinks = React.useMemo(() => {
        const draftLinks = personaDraft.links;
        const fallback = selectedPersona?.links || [];
        if (Array.isArray(draftLinks) && draftLinks.length > 0) return draftLinks;
        if (Array.isArray(draftLinks) && draftLinks.length === 0 && fallback.length > 0) return fallback;
        if (Array.isArray(draftLinks)) return draftLinks;
        if (typeof personaDraft.links === "string") {
            try {
                const parsed = JSON.parse(personaDraft.links);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    }, [personaDraft.links, selectedPersona]);

    const onStartCreate = () => {
        setSelectedPersonaId(null);
        setPersonaDraft({ 
            displayName: "", 
            bio: "", 
            website: "", 
            links: [],
            avatar: "", 
            bannerUrl: "",
            organizationIds: [], 
            tags: [], 
            defaultLicense: "", 
            defaultLicenseUrl: "", 
            defaultLicenseTerms: [] 
        });
        setViewMode("create");
    };

    return (
        <Card className="flex flex-col md:flex-row h-auto md:h-[calc(100dvh-220px)] min-h-0 md:min-h-[500px] overflow-hidden border">
            {/* Left Sidebar: List */}
            <div className="w-full md:w-[280px] border-b md:border-b-0 md:border-r flex flex-col bg-muted/10">
                <div className="p-4 border-b flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                    <h3 className="font-semibold text-sm">作者列表</h3>
                    <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={onStartCreate}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {personas.map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => setSelectedPersonaId(p.id)}
                            className={`p-3 rounded-lg border cursor-pointer hover:bg-background/80 hover:shadow-sm transition-all flex items-center gap-3 ${selectedPersonaId === p.id ? "bg-background shadow-sm border-primary/50 ring-1 ring-primary/20" : "bg-transparent border-transparent hover:border-border/50"}`}
                        >
                            <Avatar className="w-8 h-8 border">
                                <AvatarImage src={p.avatar} />
                                <AvatarFallback>{p.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="font-medium truncate text-sm flex-1">{p.displayName}</div>
                        </div>
                    ))}
                    
                    {personas.length === 0 && (
                        <div className="text-center text-muted-foreground p-8 text-sm">
                            尚無作者身分
                            <Button variant="link" size="sm" onClick={onStartCreate} className="mt-2 text-xs">立即建立</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Main: Editor */}
            <div className="flex-1 flex flex-col overflow-hidden bg-card">
                <div className="p-4 border-b flex justify-between items-center bg-background/50 backdrop-blur-sm h-[57px]">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">{viewMode === "create" ? "建立新身份" : "編輯身份"}</h2>
                    </div>
                    {viewMode === "edit" && selectedPersonaId && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/author/${selectedPersonaId}`)}
                        >
                            查看作者頁
                        </Button>
                    )}
                    {viewMode === "edit" && selectedPersonaId && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10 h-8 text-xs"
                            onClick={handleDeletePersona}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> 刪除身分
                        </Button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-2xl mx-auto space-y-8 pb-20">
                        {(viewMode === "create" || selectedPersonaId) ? (
                            <>
                                <div className="flex flex-col sm:flex-row gap-6 items-start">
                                    <div className="flex flex-col items-center gap-3 min-w-[120px]">
                                        <Avatar className="w-28 h-28 border-4 border-muted/30 shadow-sm">
                                            <AvatarImage src={personaDraft.avatar || "https://github.com/shadcn.png"} />
                                            <AvatarFallback className="text-2xl text-muted-foreground">IMG</AvatarFallback>
                                        </Avatar>
                                        <Input
                                            id="persona-avatar-url"
                                            name="personaAvatarUrl"
                                            value={personaDraft.avatar}
                                            onChange={e => setPersonaDraft({ ...personaDraft, avatar: e.target.value })}
                                            placeholder="頭像網址..."
                                            className="text-xs h-8 text-center bg-muted/20 border-transparent hover:border-border focus:border-primary transition-colors"
                                        />
                                        <Input
                                            id="persona-banner-url"
                                            name="personaBannerUrl"
                                            value={personaDraft.bannerUrl || ""}
                                            onChange={e => setPersonaDraft({ ...personaDraft, bannerUrl: e.target.value })}
                                            placeholder="橫幅圖片網址..."
                                            className="text-xs h-8 text-center bg-muted/20 border-transparent hover:border-border focus:border-primary transition-colors"
                                        />
                                    </div>
                                    
                                    <div className="flex-1 space-y-4 w-full">
                                        <div className="grid gap-1.5">
                                            <label className="text-sm font-medium" htmlFor="persona-display-name">顯示名稱 <span className="text-destructive">*</span></label>
                                            <Input 
                                                id="persona-display-name"
                                                name="personaDisplayName"
                                                value={personaDraft.displayName} 
                                                onChange={e => setPersonaDraft({ ...personaDraft, displayName: e.target.value })}
                                                placeholder="e.g. 筆名"
                                                className="font-medium"
                                            />
                                        </div>
                                        
                                        <div className="grid gap-1.5">
                                            <label className="text-sm font-medium" htmlFor="persona-bio">個人簡介</label>
                                            <Textarea 
                                                id="persona-bio"
                                                name="personaBio"
                                                value={personaDraft.bio}
                                                onChange={e => setPersonaDraft({ ...personaDraft, bio: e.target.value })}
                                                placeholder="簡單介紹..."
                                                className="min-h-[80px] resize-none"
                                            />
                                        </div>

                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium" htmlFor="persona-website">個人網站</label>
                                    <Input 
                                        id="persona-website"
                                        name="personaWebsite"
                                        value={personaDraft.website} 
                                        onChange={e => setPersonaDraft({ ...personaDraft, website: e.target.value })} 
                                        placeholder="https://" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">自訂連結</label>
                                            <div className="border rounded-md p-4 bg-muted/10 space-y-3">
                                                {safeLinks.length === 0 && (
                                                    <div className="text-sm text-muted-foreground">尚未新增連結</div>
                                                )}
                                    {safeLinks.map((link, idx) => (
                                        <div key={`link-${idx}`} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-center">
                                            <Input
                                                id={`persona-link-label-${idx}`}
                                                name={`persona-link-label-${idx}`}
                                                aria-label="連結名稱"
                                                placeholder="顯示名稱"
                                                value={link.label || ""}
                                                onChange={(e) => {
                                                    const next = [...safeLinks];
                                                    next[idx] = { ...next[idx], label: e.target.value };
                                                    setPersonaDraft({ ...personaDraft, links: next });
                                                }}
                                            />
                                            <Input
                                                id={`persona-link-url-${idx}`}
                                                name={`persona-link-url-${idx}`}
                                                aria-label="連結網址"
                                                placeholder="https://"
                                                value={link.url || ""}
                                                onChange={(e) => {
                                                    const next = [...safeLinks];
                                                    next[idx] = { ...next[idx], url: e.target.value };
                                                    setPersonaDraft({ ...personaDraft, links: next });
                                                }}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const next = safeLinks.filter((_, i) => i !== idx);
                                                    setPersonaDraft({ ...personaDraft, links: next });
                                                }}
                                            >
                                                移除
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const next = [...safeLinks, { label: "", url: "" }];
                                            setPersonaDraft({ ...personaDraft, links: next });
                                        }}
                                    >
                                        新增連結
                                    </Button>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium">所屬組織（需申請通過後才會出現）</label>
                                <div className="flex flex-wrap gap-2">
                                            {orgs.length === 0 ? (
                                                <div className="text-sm text-muted-foreground italic px-2">尚未建立任何組織。</div>
                                            ) : (
                                                orgs.map(org => {
                                                    const checked = (personaDraft.organizationIds || []).includes(org.id);
                                                    return (
                                                        <label 
                                                            key={org.id} 
                                                            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border cursor-pointer transition-all ${checked ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-transparent hover:bg-muted"}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                id={`persona-org-${org.id}`}
                                                                name={`personaOrg-${org.id}`}
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    const next = e.target.checked
                                                                        ? [...(personaDraft.organizationIds || []), org.id]
                                                                        : (personaDraft.organizationIds || []).filter(id => id !== org.id);
                                                                    setPersonaDraft({ ...personaDraft, organizationIds: next });
                                                                }}
                                                                className="sr-only"
                                                            />
                                                            <span className="font-medium">{org.name}</span>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <div className="mt-2 border rounded-md p-3 bg-muted/10 space-y-2">
                                            <div className="text-xs text-muted-foreground">搜尋其他組織並送出申請</div>
                                            <Input
                                                id="org-search-query"
                                                name="orgSearchQuery"
                                                placeholder="輸入組織名稱搜尋"
                                                aria-label="搜尋組織名稱"
                                                value={orgSearchQuery}
                                                onChange={(e) => setOrgSearchQuery(e.target.value)}
                                            />
                                            {isOrgSearching && (
                                                <div className="text-xs text-muted-foreground">搜尋中...</div>
                                            )}
                                            {orgSearchResults.length > 0 && (
                                                <div className="space-y-2">
                                                    {orgSearchResults.map(org => (
                                                        <div key={org.id} className="flex items-center justify-between text-sm">
                                                            <span>{org.name}</span>
                                                            <Button size="sm" variant="outline" onClick={() => handleRequestJoinOrg(org.id)}>
                                                                送出申請
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium">標籤 (Tags)</label>
                                        <div className="border rounded-md p-4 bg-muted/10 space-y-3">
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
                                                                style={getTagStyle(tag)}
                                                                onRemove={() => {
                                                                    setPersonaDraft({
                                                                        ...personaDraft,
                                                                        tags: (personaDraft.tags || []).filter(t => t !== tag),
                                                                    });
                                                                }}
                                                            />
                                                        ))}
                                                        {(personaDraft.tags || []).length === 0 && (
                                                            <span className="text-sm text-muted-foreground">輸入下方欄位新增標籤...</span>
                                                        )}
                                                    </div>
                                                </SortableContext>
                                            </DndContext>
                                            
                                            <Popover open={tagOpen} onOpenChange={setTagOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button type="button" variant="outline" size="sm" className="w-fit">
                                                        新增標籤
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[90vw] sm:w-80 p-2" align="start">
                                                    <div className="p-2">
                                                        <Input
                                                            id="persona-tag-input"
                                                            name="personaTagInput"
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
                                                                    setTagOpen(false);
                                                                }
                                                            }}
                                                            placeholder="搜尋或新增標籤..."
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <div className="max-h-56 overflow-y-auto px-1 pb-1">
                                                        {personaTagInput.trim() && (
                                                            <button
                                                                type="button"
                                                                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent"
                                                                onClick={() => {
                                                                    const incoming = parseTags(personaTagInput);
                                                                    if (incoming.length === 0) return;
                                                                    setPersonaDraft({
                                                                        ...personaDraft,
                                                                        tags: addTags(personaDraft.tags || [], incoming),
                                                                    });
                                                                    setPersonaTagInput("");
                                                                    setTagOpen(false);
                                                                }}
                                                            >
                                                                新增「{personaTagInput.trim()}」
                                                            </button>
                                                        )}
                                                        {filteredTagOptions.map(name => {
                                                            const selected = (personaDraft.tags || []).includes(name);
                                                            return (
                                                            <button
                                                                key={name}
                                                                type="button"
                                                                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-accent ${
                                                                    selected ? "bg-accent/50" : ""
                                                                }`}
                                                                onClick={() => {
                                                                    if (selected) {
                                                                        setPersonaDraft({
                                                                            ...personaDraft,
                                                                            tags: (personaDraft.tags || []).filter(t => t !== name),
                                                                        });
                                                                    } else {
                                                                        setPersonaDraft({
                                                                            ...personaDraft,
                                                                            tags: addTags(personaDraft.tags || [], [name]),
                                                                        });
                                                                    }
                                                                    setPersonaTagInput("");
                                                                }}
                                                            >
                                                                <span className="truncate">{name}</span>
                                                                <span
                                                                    className="inline-block h-2 w-2 rounded-full"
                                                                    style={{ backgroundColor: getTagStyle(name)?.backgroundColor || "#CBD5E1" }}
                                                                />
                                                            </button>
                                                            );
                                                        })}
                                                        {personaTagInput.trim() && filteredTagOptions.length === 0 && (
                                                            <div className="px-3 py-2 text-xs text-muted-foreground">沒有符合的標籤</div>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </div>

                                {/* Default License Configuration */}
                                <div className="border-t pt-6">
                                    <h3 className="text-sm font-medium mb-4">預設授權設定</h3>
                                    <div className="rounded-lg border bg-muted/10 p-4">
                                        <MetadataLicenseTab 
                                            license={personaDraft.defaultLicense}
                                            setLicense={(v) => setPersonaDraft(prev => ({ ...prev, defaultLicense: v }))}
                                            licenseUrl={personaDraft.defaultLicenseUrl}
                                            setLicenseUrl={(v) => setPersonaDraft(prev => ({ ...prev, defaultLicenseUrl: v }))}
                                            licenseTerms={personaDraft.defaultLicenseTerms}
                                            setLicenseTerms={(v) => setPersonaDraft(prev => ({ ...prev, defaultLicenseTerms: v }))}
                                            copyright={""} 
                                            setCopyright={() => {}} 
                                        />
                                        <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
                                            <span className="inline-block w-1 h-1 rounded-full bg-primary/50"></span>
                                            日後以此身分新建劇本時，將自動套用此設定。
                                        </p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                                    <Plus className="w-8 h-8 text-muted-foreground/30" />
                                </div>
                                <p className="mb-2">請選擇一個身分進行編輯</p>
                                <Button variant="outline" onClick={onStartCreate}>或 建立新身分</Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-background/50 backdrop-blur-sm flex justify-end">
                     <Button 
                        onClick={viewMode === "create" ? handleCreatePersona : handleSaveProfile} 
                        disabled={(viewMode === "create" ? isCreatingPersona : isSavingProfile) || !personaDraft.displayName.trim()}
                        className="min-w-[100px]"
                    >
                        {(viewMode === "create" ? isCreatingPersona : isSavingProfile) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {viewMode === "create" ? "建立身分" : "儲存變更"}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
