import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { FileText, ArrowRightLeft, Building2, Plus, Search, UserCircle, Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { ScriptMetadataDialog } from "../components/dashboard/ScriptMetadataDialog";
import { AdminUserManagementCard } from "../components/admin/AdminUserManagementCard";
import { TermsAcceptanceTable } from "../components/admin/TermsAcceptanceTable";
import { HomepageBannerSection } from "../components/admin/HomepageBannerSection";
import { AdminTransferModal } from "../components/admin/AdminTransferModal";
import { useAdminPageState } from "../hooks/useAdminPageState";

interface CollapsibleSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, description, defaultOpen = false, children }: CollapsibleSectionProps): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  return (
    <div className="rounded-xl border border-border/70 bg-background shadow-sm mb-4">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors rounded-xl"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div className="font-semibold text-sm">{title}</div>
          {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

export default function SuperAdminPage() {
  const s = useAdminPageState();

  if (!s.profile?.isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">沒有超級管理員權限</CardTitle>
            <CardDescription>請使用已列入 ADMIN_USER_EMAILS 或超管名單的帳號登入。</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-8 max-w-6xl h-full overflow-y-auto">
      <header className="mb-6 border-b pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif mb-1">平台管理中心</h1>
          <p className="text-sm text-muted-foreground">超級管理員可管理全站資料與劇本設定（不含內容檢視）。</p>
        </div>
        <Badge variant="outline" className="text-xs">{s.t("transferAdmin.loggedInAs")}：{s.currentUser?.displayName || "Admin"}</Badge>
      </header>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "使用者", value: s.users.length },
          { label: "組織", value: s.orgs.length },
          { label: "作者", value: s.personas.length },
          { label: "劇本", value: s.scripts.filter((sc) => sc.type !== "folder").length },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-3">
              <div className="text-[11px] text-muted-foreground">{label}</div>
              <div className="text-2xl font-bold leading-tight">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Global search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-2 items-center rounded-xl border border-border/70 bg-background px-4 py-3 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          className="border-0 shadow-none focus-visible:ring-0 px-0"
          placeholder="全域搜尋（名稱 / ID / owner）"
          value={s.listQuery}
          onChange={(e) => s.setListQuery(e.target.value)}
        />
        <Button variant="outline" size="sm" onClick={() => s.loadAllData(s.listQuery.trim())}>
          {s.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "重新載入"}
        </Button>
      </div>

      <CollapsibleSection title="超管帳號管理" description="新增或移除平台超管帳號">
        <AdminUserManagementCard />
      </CollapsibleSection>
      <CollapsibleSection title="授權條款簽署紀錄" description="公開頁簽署紀錄查詢">
        <TermsAcceptanceTable />
      </CollapsibleSection>
      <CollapsibleSection title="首頁 Banner 設定" description="管理首頁輪播 Banner 內容">
        <HomepageBannerSection />
      </CollapsibleSection>

      <Tabs defaultValue="scripts" className="space-y-4 mt-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-2xl gap-1 h-auto sm:h-9">
          <TabsTrigger value="scripts">
            {s.t("transferAdmin.scriptTab")}
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{s.scripts.filter((sc) => sc.type !== "folder").length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="orgs">
            {s.t("transferAdmin.orgTab")}
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{s.orgs.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="personas">
            {s.t("transferAdmin.personaTab")}
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{s.personas.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="users">
            使用者
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{s.users.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Scripts */}
        <TabsContent value="scripts">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>所有劇本</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Input placeholder="篩選名稱或 owner..." value={s.scriptFilter} onChange={(e) => s.setScriptFilter(e.target.value)} className="h-8 text-sm" />
                <div className="inline-flex rounded-md border bg-background p-0.5 gap-0.5 shrink-0">
                  {["all", "Public", "Private"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`h-7 px-3 text-xs rounded transition-colors ${s.scriptStatusFilter === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                      onClick={() => s.setScriptStatusFilter(opt)}
                    >
                      {opt === "all" ? "全部" : opt === "Public" ? "公開" : "私人"}
                    </button>
                  ))}
                </div>
              </div>
              <CardDescription className="mt-1">顯示 {s.filteredScripts.length} / {s.scripts.filter((sc) => sc.type !== "folder").length} 部</CardDescription>
            </CardHeader>
            <CardContent>
              {s.isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : s.filteredScripts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">無符合結果</div>
              ) : (
                <div className="space-y-1.5">
                  {s.filteredScripts.map((sc) => (
                    <div key={sc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate text-sm">{sc.title || "(無標題)"}</div>
                          <div className="text-xs text-muted-foreground truncate">owner: {s.getOwnerLabel(sc.ownerId)}</div>
                        </div>
                        {sc.status === "Public" && (
                          <Badge variant="secondary" className="text-[10px] h-5 shrink-0">{s.t("transferAdmin.publicBadge")}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => s.handleOpenScriptSettings(sc)}>設定</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => s.handleOpenTransfer("script", sc)}>
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="destructive" size="sm" className="h-7" disabled={s.isDeleting} onClick={() => s.handleDeleteScript(sc)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orgs */}
        <TabsContent value="orgs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1 h-fit">
              <CardHeader>
                <CardTitle className="text-base">{s.t("transferAdmin.createOrgTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder={s.t("transferAdmin.orgNamePlaceholder")} value={s.newOrgName} onChange={(e) => s.setNewOrgName(e.target.value)} />
                <Button className="w-full" onClick={s.handleCreateOrg} disabled={!s.newOrgName}>
                  <Plus className="w-4 h-4 mr-2" />{s.t("transferAdmin.createOrg")}
                </Button>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">所有組織</CardTitle>
                <Input placeholder="篩選名稱或 owner..." value={s.orgFilter} onChange={(e) => s.setOrgFilter(e.target.value)} className="h-8 text-sm mt-2" />
                <CardDescription>顯示 {s.filteredOrgs.length} / {s.orgs.length} 個</CardDescription>
              </CardHeader>
              <CardContent>
                {s.isLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : s.filteredOrgs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">無符合結果</div>
                ) : (
                  <div className="space-y-2">
                    {s.filteredOrgs.map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{org.name}</div>
                            <div className="text-xs text-muted-foreground">owner: {s.getOwnerLabel(org.ownerId)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => s.handleOpenTransfer("org", org)}>
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="destructive" size="sm" className="h-7" disabled={s.isDeleting} onClick={() => s.handleDeleteOrg(org)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Personas */}
        <TabsContent value="personas">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>所有作者</CardTitle>
              <Input placeholder="篩選名稱或 owner..." value={s.personaFilter} onChange={(e) => s.setPersonaFilter(e.target.value)} className="h-8 text-sm mt-2" />
              <CardDescription>顯示 {s.filteredPersonas.length} / {s.personas.length} 位</CardDescription>
            </CardHeader>
            <CardContent>
              {s.isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : s.filteredPersonas.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">無符合結果</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {s.filteredPersonas.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                          {p.avatar ? <img src={p.avatar} alt={p.displayName || p.id} className="w-full h-full object-cover" /> : <UserCircle className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{p.displayName}</div>
                          <div className="text-xs text-muted-foreground truncate">owner: {s.getOwnerLabel(p.ownerId)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => s.handleOpenTransfer("persona", p)}>
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="destructive" size="sm" className="h-7" disabled={s.isDeleting} onClick={() => s.handleDeletePersona(p)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>所有使用者</CardTitle>
              <Input placeholder="篩選名稱 / email / ID..." value={s.userFilter} onChange={(e) => s.setUserFilter(e.target.value)} className="h-8 text-sm mt-2" />
              <CardDescription>顯示 {s.filteredUsers.length} / {s.users.length} 位</CardDescription>
            </CardHeader>
            <CardContent>
              {s.isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : s.filteredUsers.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">無符合結果</div>
              ) : (
                <div className="space-y-1.5">
                  {s.filteredUsers.map((u) => (
                    <div key={u.id} className="rounded border px-3 py-2.5 text-sm flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{u.displayName || u.handle || "-"}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email || "-"} ｜ {u.id}</div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 shrink-0"
                        disabled={s.isDeleting || u.id === s.currentUser?.uid}
                        onClick={() => s.handleDeleteUser(u)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {s.showTransferModal && s.selectedItem && (
        <AdminTransferModal
          selectedItem={s.selectedItem}
          selectedItemLabel={s.selectedItemLabel}
          transferTypeLabel={s.transferTypeLabel}
          targetUser={s.targetUser}
          setTargetUser={s.setTargetUser}
          searchQuery={s.searchQuery}
          setSearchQuery={s.setSearchQuery}
          searchResults={s.searchResults}
          isSearching={s.isSearching}
          searchError={s.searchError}
          isTransferring={s.isTransferring}
          onCancel={() => s.setShowTransferModal(false)}
          onConfirm={s.confirmTransfer}
        />
      )}

      {s.showScriptSettingsModal && s.selectedScriptSettings && (
        <ScriptMetadataDialog
          open={s.showScriptSettingsModal}
          onOpenChange={(open) => {
            s.setShowScriptSettingsModal(open);
            if (!open) s.setSelectedScriptSettings(null);
          }}
          script={s.selectedScriptSettings}
          fetchFullScript={false}
          preserveAuthorInternalData
          saveScript={s.handleSaveScriptSettings}
          onSave={() => {
            s.loadAllData(s.listQuery.trim());
          }}
        />
      )}
    </div>
  );
}
