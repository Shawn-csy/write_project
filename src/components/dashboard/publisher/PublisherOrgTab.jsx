import React from 'react';
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Trash2, Building2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../../ui/card";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableTag } from "./SortableTag";

export function PublisherOrgTab({
    orgs,
    selectedOrgId, setSelectedOrgId,
    handleCreateOrg, isCreatingOrg,
    handleDeleteOrg,
    orgDraft, setOrgDraft,
    handleSaveOrg, isSavingOrg,
    orgTagInput, setOrgTagInput,
    parseTags, addTags, getSuggestions, getTagStyle,
    orgMembers,
    orgInvites,
    orgRequests,
    isOrgOwner,
    inviteSearchQuery,
    setInviteSearchQuery,
    inviteSearchResults,
    isInviteSearching,
    handleInviteMember,
    handleAcceptRequest,
    handleDeclineRequest
}) {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = React.useState("edit");

    // Reset draft when selecting a new org
    React.useEffect(() => {
        if (selectedOrgId) {
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
                setViewMode("edit");
            }
        }
    }, [selectedOrgId, orgs]);

    const onStartCreate = () => {
        setSelectedOrgId(null);
        setOrgDraft({ id: "", name: "", description: "", website: "", logoUrl: "", bannerUrl: "", tags: [] });
        setViewMode("create");
    };

    return (
        <Card className="flex flex-col md:flex-row h-[calc(100vh-220px)] min-h-[500px] overflow-hidden border">
            {/* Left Sidebar: List */}
            <div className="w-full md:w-[280px] border-r flex flex-col bg-muted/10">
                <div className="p-4 border-b flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                    <h3 className="font-semibold text-sm">組織列表</h3>
                    <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={onStartCreate}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {orgs.map(o => (
                        <div 
                            key={o.id} 
                            onClick={() => setSelectedOrgId(o.id)}
                            className={`p-3 rounded-lg border cursor-pointer hover:bg-background/80 hover:shadow-sm transition-all flex items-center gap-3 ${selectedOrgId === o.id ? "bg-background shadow-sm border-primary/50 ring-1 ring-primary/20" : "bg-transparent border-transparent hover:border-border/50"}`}
                        >
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
                                <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <div className="font-medium truncate text-sm flex-1">{o.name}</div>
                        </div>
                    ))}
                    
                    {orgs.length === 0 && (
                        <div className="text-center text-muted-foreground p-8 text-sm">
                            尚無組織
                            <Button variant="link" size="sm" onClick={onStartCreate} className="mt-2 text-xs">立即建立</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Main: Editor */}
            <div className="flex-1 flex flex-col overflow-hidden bg-card">
                 <div className="p-4 border-b flex justify-between items-center bg-background/50 backdrop-blur-sm h-[57px]">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">{viewMode === "create" ? "建立組織" : "編輯組織"}</h2>
                    </div>
                    {viewMode === "edit" && selectedOrgId && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => navigate(`/org/${selectedOrgId}`)}
                        >
                            查看組織頁
                        </Button>
                    )}
                    {viewMode === "edit" && selectedOrgId && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10 h-8 text-xs"
                            onClick={handleDeleteOrg}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> 刪除組織
                        </Button>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                     <div className="max-w-2xl mx-auto space-y-8 pb-20">
                        {(viewMode === "create" || selectedOrgId) ? (
                            <>
                                {/* Basic Info */}
                                <div className="space-y-6">
                                    <div className="grid gap-4">
                                        <div className="grid gap-1.5">
                                            <label className="text-sm font-medium" htmlFor="org-name">組織名稱 <span className="text-destructive">*</span></label>
                                            <Input 
                                                id="org-name"
                                                name="orgName"
                                                value={orgDraft.name} 
                                                onChange={e => setOrgDraft({ ...orgDraft, name: e.target.value })}
                                                placeholder="e.g. 某某工作室"
                                                className="font-medium"
                                            />
                                        </div>

                                        <div className="grid gap-1.5">
                                            <label className="text-sm font-medium" htmlFor="org-description">描述</label>
                                            <Input 
                                                id="org-description"
                                                name="orgDescription"
                                                value={orgDraft.description} 
                                                onChange={e => setOrgDraft({ ...orgDraft, description: e.target.value })}
                                                placeholder="關於這個組織..."
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-1.5">
                                                <label className="text-sm font-medium" htmlFor="org-website">網站</label>
                                                <Input 
                                                    id="org-website"
                                                    name="orgWebsite"
                                                    value={orgDraft.website} 
                                                    onChange={e => setOrgDraft({ ...orgDraft, website: e.target.value })}
                                                    placeholder="https://"
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <label className="text-sm font-medium" htmlFor="org-logo-url">Logo 圖片網址</label>
                                                <Input 
                                                    id="org-logo-url"
                                                    name="orgLogoUrl"
                                                    value={orgDraft.logoUrl} 
                                                    onChange={e => setOrgDraft({ ...orgDraft, logoUrl: e.target.value })}
                                                    placeholder="https://"
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <label className="text-sm font-medium" htmlFor="org-banner-url">橫幅圖片網址</label>
                                                <Input 
                                                    id="org-banner-url"
                                                    name="orgBannerUrl"
                                                    value={orgDraft.bannerUrl || ""} 
                                                    onChange={e => setOrgDraft({ ...orgDraft, bannerUrl: e.target.value })}
                                                    placeholder="https://"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium" htmlFor="org-tag-input">組織標籤</label>
                                            <div className="border rounded-md p-4 bg-muted/10 space-y-3">
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
                                                                style={getTagStyle(tag)}
                                                                onRemove={() => {
                                                                    setOrgDraft({
                                                                        ...orgDraft,
                                                                        tags: (orgDraft.tags || []).filter(t => t !== tag),
                                                                    });
                                                                }}
                                                            />
                                                        ))}
                                                        {(orgDraft.tags || []).length === 0 && (
                                                            <span className="text-sm text-muted-foreground">輸入下方欄位新增標籤...</span>
                                                        )}
                                                    </div>
                                                </SortableContext>
                                            </DndContext>
                                            <div className="relative">
                                                <Input
                                                    id="org-tag-input"
                                                    name="orgTagInput"
                                                    aria-label="新增組織標籤"
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
                                                    placeholder="輸入新標籤..."
                                                    className="bg-transparent"
                                                />
                                                {orgTagInput.trim() && (
                                                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg p-2 flex flex-wrap gap-2 animate-in fade-in zoom-in-95 duration-200">
                                                        {getSuggestions(orgTagInput, orgDraft.tags || []).map(tag => (
                                                            <button
                                                                key={tag.id}
                                                                type="button"
                                                                className="text-xs px-2 py-1 rounded-full border hover:bg-accent transition-colors"
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
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">成員</label>
                                            <div className="border rounded-md p-4 bg-muted/10 space-y-4">
                                                <div className="text-xs text-muted-foreground">
                                                    使用者 {orgMembers?.users?.length || 0} 人 · 作者 {orgMembers?.personas?.length || 0} 人
                                                </div>
                                                {(orgMembers?.users?.length || 0) === 0 && (orgMembers?.personas?.length || 0) === 0 ? (
                                                    <div className="text-sm text-muted-foreground">尚無成員</div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {(orgMembers?.users || []).map(u => (
                                                            <div key={`u-${u.id}`} className="flex items-center justify-between text-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                                                                        {(u.displayName || u.handle || "?")[0]?.toUpperCase?.() || "?"}
                                                                    </div>
                                                                    <span>{u.displayName || u.handle || u.email || "User"}</span>
                                                                </div>
                                                                <Badge variant="outline">使用者</Badge>
                                                            </div>
                                                        ))}
                                                        {(orgMembers?.personas || []).map(p => (
                                                            <div key={`p-${p.id}`} className="flex items-center justify-between text-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                                                                        {(p.displayName || "?")[0]?.toUpperCase?.() || "?"}
                                                                    </div>
                                                                    <span>{p.displayName || "Persona"}</span>
                                                                </div>
                                                                <Badge variant="secondary">作者</Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {isOrgOwner && (
                                            <>
                                                <div className="grid gap-2">
                                                    <label className="text-sm font-medium" htmlFor="org-invite-search">邀請成員</label>
                                                    <div className="border rounded-md p-4 bg-muted/10 space-y-3">
                                                        <Input
                                                            id="org-invite-search"
                                                            name="orgInviteSearch"
                                                            aria-label="邀請成員搜尋"
                                                            placeholder="輸入 Email / 暱稱 / ID 搜尋"
                                                            value={inviteSearchQuery}
                                                            onChange={(e) => setInviteSearchQuery(e.target.value)}
                                                        />
                                                        {isInviteSearching && (
                                                            <div className="text-xs text-muted-foreground">搜尋中...</div>
                                                        )}
                                                        {inviteSearchResults?.length > 0 && (
                                                            <div className="space-y-2">
                                                                {inviteSearchResults.map(u => (
                                                                    <div key={u.id} className="flex items-center justify-between text-sm">
                                                                        <span>{u.displayName || u.handle || u.email || u.id}</span>
                                                                        <Button size="sm" onClick={() => handleInviteMember(u.id)}>邀請</Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid gap-2">
                                                    <label className="text-sm font-medium">待處理申請</label>
                                                    <div className="border rounded-md p-4 bg-muted/10 space-y-2">
                                                        {(orgRequests || []).length === 0 ? (
                                                            <div className="text-sm text-muted-foreground">目前沒有申請</div>
                                                        ) : (
                                                    (orgRequests || []).map(req => (
                                                        <div key={req.id} className="flex items-center justify-between text-sm">
                                                            <span>申請者：{req.requester?.email || req.requester?.displayName || req.requesterUserId}</span>
                                                            <div className="flex gap-2">
                                                                <Button size="sm" onClick={() => handleAcceptRequest(req.id)}>同意</Button>
                                                                <Button size="sm" variant="ghost" onClick={() => handleDeclineRequest(req.id)}>拒絕</Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid gap-2">
                                                    <label className="text-sm font-medium">已發出邀請</label>
                                                    <div className="border rounded-md p-4 bg-muted/10 space-y-2">
                                                        {(orgInvites || []).length === 0 ? (
                                                            <div className="text-sm text-muted-foreground">目前沒有邀請</div>
                                                        ) : (
                                                    (orgInvites || []).map(inv => (
                                                        <div key={inv.id} className="flex items-center justify-between text-sm">
                                                            <span>邀請：{inv.invitedUser?.email || inv.invitedUser?.displayName || inv.invitedUserId}</span>
                                                            <Badge variant="outline">{inv.status}</Badge>
                                                        </div>
                                                    ))
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Members */}
                                <div className="space-y-4 pt-6 border-t">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">成員管理</h3>
                                        <Button variant="outline" size="sm" disabled className="h-8">
                                            <Plus className="w-3 h-3 mr-1.5" /> 邀請成員
                                        </Button>
                                    </div>
                                    <div className="p-12 text-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                        <div className="w-12 h-12 rounded-full bg-muted/30 mx-auto mb-3 flex items-center justify-center">
                                            <Building2 className="w-6 h-6 opacity-30" />
                                        </div>
                                        <p className="text-sm">多人協作功能即將推出</p>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="p-4 border-t bg-background/50 backdrop-blur-sm flex justify-end sticky bottom-0 -mx-6 -mb-6 md:-mx-8 md:-mb-8 mt-4">
                                    <Button 
                                        onClick={viewMode === "create" ? handleCreateOrg : handleSaveOrg} 
                                        disabled={(viewMode === "create" ? isCreatingOrg : isSavingOrg) || !orgDraft.name.trim()}
                                        className="min-w-[100px]"
                                    >
                                        {(viewMode === "create" ? isCreatingOrg : isSavingOrg) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {viewMode === "create" ? "建立組織" : "儲存變更"}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                                    <Plus className="w-8 h-8 text-muted-foreground/30" />
                                </div>
                                <p className="mb-2">請選擇一個組織進行編輯</p>
                                <Button variant="outline" onClick={onStartCreate}>或 建立新組織</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
