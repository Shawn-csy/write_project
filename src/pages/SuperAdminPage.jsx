import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { FileText, ArrowRightLeft, Building2, Plus, Search, UserCircle, Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { ScriptMetadataDialog } from "../components/dashboard/ScriptMetadataDialog";
import { createOrganization, transferOrganizationOwnership } from "../lib/api/organizations";
import { transferScriptOwnership } from "../lib/api/scripts";
import { transferPersonaOwnership } from "../lib/api/personas";
import {
  searchUsers,
  getAllUsersAdmin,
  getAllOrganizationsAdmin,
  getAllPersonasAdmin,
  getAllScriptsAdmin,
  getScriptMetadataAdmin,
  updateScriptMetadataAdmin,
  deleteUserAdmin,
  deleteOrganizationAdmin,
  deletePersonaAdmin,
  deleteScriptAdmin,
} from "../lib/api/admin";
import { AdminUserManagementCard } from "../components/admin/AdminUserManagementCard";
import { TermsAcceptanceTable } from "../components/admin/TermsAcceptanceTable";
import { HomepageBannerSection } from "../components/admin/HomepageBannerSection";

function CollapsibleSection({ title, description, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
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
  const { t } = useI18n();
  const { currentUser, profile } = useAuth();

  const [orgs, setOrgs] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listQuery, setListQuery] = useState("");

  const [transferType, setTransferType] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const [newOrgName, setNewOrgName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showScriptSettingsModal, setShowScriptSettingsModal] = useState(false);
  const [selectedScriptSettings, setSelectedScriptSettings] = useState(null);

  // per-tab filter state
  const [scriptFilter, setScriptFilter] = useState("");
  const [scriptStatusFilter, setScriptStatusFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("");
  const [personaFilter, setPersonaFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");

  const transferTypeLabel =
    transferType === "org"
      ? t("transferAdmin.typeOrg")
      : transferType === "persona"
        ? t("transferAdmin.typePersona")
        : t("transferAdmin.typeScript");

  const loadAllData = async (queryText = "") => {
    setIsLoading(true);
    try {
      const [uData, oData, sData, pData] = await Promise.all([
        getAllUsersAdmin({ q: queryText, limit: 300 }),
        getAllOrganizationsAdmin({ q: queryText, limit: 300 }),
        getAllScriptsAdmin({ q: queryText, limit: 600 }),
        getAllPersonasAdmin({ q: queryText, limit: 300 }),
      ]);
      setUsers(uData || []);
      setOrgs(oData || []);
      setScripts(sData || []);
      setPersonas(pData || []);
    } catch (e) {
      console.error("Failed to load admin data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser || !profile?.isAdmin) return;
    loadAllData("");
  }, [currentUser, profile?.isAdmin]);

  useEffect(() => {
    const normalized = listQuery.trim();
    if (!currentUser || !profile?.isAdmin) return;
    const timer = setTimeout(() => {
      loadAllData(normalized);
    }, 350);
    return () => clearTimeout(timer);
  }, [listQuery, currentUser, profile?.isAdmin]);

  useEffect(() => {
    const normalizedQuery = searchQuery.trim();
    if (!normalizedQuery) {
      setSearchResults([]);
      setSearchError("");
      return;
    }
    const delay = setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const results = await searchUsers(normalizedQuery);
        setSearchResults(results || []);
      } catch (e) {
        console.error(e);
        setSearchResults([]);
        setSearchError(
          e?.status === 403
            ? t("transferAdmin.searchPermissionDenied")
            : t("transferAdmin.searchFailed")
        );
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(delay);
  }, [searchQuery, t]);

  const handleCreateOrg = async () => {
    if (!newOrgName) return;
    try {
      await createOrganization({ name: newOrgName, description: "Created via Admin Console" });
      setNewOrgName("");
      loadAllData(listQuery.trim());
    } catch (error) {
      console.error("Failed to create org:", error);
      alert(t("transferAdmin.alertCreateFailed"));
    }
  };

  const handleOpenTransfer = (type, item) => {
    setTransferType(type);
    setSelectedItem(item);
    setSearchQuery("");
    setTargetUser(null);
    setSearchError("");
    setShowTransferModal(true);
  };

  const confirmTransfer = async () => {
    if (!selectedItem || !targetUser) return;
    setIsTransferring(true);
    try {
      let res = null;
      if (transferType === "org") res = await transferOrganizationOwnership(selectedItem.id, targetUser.id);
      else if (transferType === "script") res = await transferScriptOwnership(selectedItem.id, targetUser.id);
      else if (transferType === "persona") res = await transferPersonaOwnership(selectedItem.id, targetUser.id);

      if (res?.newOwnerId && res.newOwnerId !== targetUser.id) alert(t("transferAdmin.alertMismatch"));
      else alert(t("transferAdmin.alertTransferSuccess"));

      setShowTransferModal(false);
      setSelectedItem(null);
      setTargetUser(null);
      loadAllData(listQuery.trim());
    } catch (error) {
      console.error("Transfer failed:", error);
      alert(t("transferAdmin.alertTransferFailed"));
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDeleteOrg = async (org) => {
    if (!org?.id) return;
    if (!window.confirm(`確定刪除組織「${org.name || org.id}」？`)) return;
    setIsDeleting(true);
    try {
      await deleteOrganizationAdmin(org.id);
      loadAllData(listQuery.trim());
    } catch (error) {
      alert(error?.message || "刪除組織失敗");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!user?.id) return;
    if (user.id === currentUser?.uid) {
      alert("不能刪除目前登入中的超管帳號");
      return;
    }
    if (!window.confirm(`確定刪除使用者「${user.displayName || user.email || user.id}」？此動作會清除其擁有的資料。`)) return;
    setIsDeleting(true);
    try {
      await deleteUserAdmin(user.id);
      loadAllData(listQuery.trim());
    } catch (error) {
      alert(error?.message || "刪除使用者失敗");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletePersona = async (persona) => {
    if (!persona?.id) return;
    if (!window.confirm(`確定刪除作者「${persona.displayName || persona.id}」？`)) return;
    setIsDeleting(true);
    try {
      await deletePersonaAdmin(persona.id);
      loadAllData(listQuery.trim());
    } catch (error) {
      alert(error?.message || "刪除作者失敗");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteScript = async (script) => {
    if (!script?.id) return;
    if (!window.confirm(`確定刪除劇本「${script.title || script.id}」？`)) return;
    setIsDeleting(true);
    try {
      await deleteScriptAdmin(script.id);
      loadAllData(listQuery.trim());
    } catch (error) {
      alert(error?.message || "刪除劇本失敗");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenScriptSettings = async (script) => {
    if (!script?.id) return;
    try {
      const latest = await getScriptMetadataAdmin(script.id);
      setSelectedScriptSettings(latest || script);
      setShowScriptSettingsModal(true);
    } catch (error) {
      console.error("Failed to load script metadata", error);
      setSelectedScriptSettings(script);
      setShowScriptSettingsModal(true);
    }
  };

  const userById = useMemo(() => {
    const map = new Map();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const getOwnerLabel = (ownerId) => {
    if (!ownerId) return "-";
    const owner = userById.get(ownerId);
    if (!owner) return ownerId;
    return owner.displayName || owner.email || owner.handle || ownerId;
  };

  const filteredScripts = useMemo(() => {
    const q = scriptFilter.toLowerCase();
    return scripts
      .filter((s) => s.type !== "folder")
      .filter((s) => scriptStatusFilter === "all" || s.status === scriptStatusFilter)
      .filter((s) => !q || (s.title || "").toLowerCase().includes(q) || getOwnerLabel(s.ownerId).toLowerCase().includes(q));
  }, [scripts, scriptFilter, scriptStatusFilter, userById]);

  const filteredOrgs = useMemo(() => {
    const q = orgFilter.toLowerCase();
    return !q ? orgs : orgs.filter((o) => (o.name || "").toLowerCase().includes(q) || getOwnerLabel(o.ownerId).toLowerCase().includes(q));
  }, [orgs, orgFilter, userById]);

  const filteredPersonas = useMemo(() => {
    const q = personaFilter.toLowerCase();
    return !q ? personas : personas.filter((p) => (p.displayName || "").toLowerCase().includes(q) || getOwnerLabel(p.ownerId).toLowerCase().includes(q));
  }, [personas, personaFilter, userById]);

  const filteredUsers = useMemo(() => {
    const q = userFilter.toLowerCase();
    return !q ? users : users.filter((u) => (u.displayName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q) || u.id.toLowerCase().includes(q));
  }, [users, userFilter]);

  if (!profile?.isAdmin) {
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
        <Badge variant="outline" className="text-xs">{t("transferAdmin.loggedInAs")}：{currentUser?.displayName || "Admin"}</Badge>
      </header>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "使用者", value: users.length },
          { label: "組織", value: orgs.length },
          { label: "作者", value: personas.length },
          { label: "劇本", value: scripts.filter((s) => s.type !== "folder").length },
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
          value={listQuery}
          onChange={(e) => setListQuery(e.target.value)}
        />
        <Button variant="outline" size="sm" onClick={() => loadAllData(listQuery.trim())}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "重新載入"}
        </Button>
      </div>

      {/* Collapsible utility sections */}
      <CollapsibleSection title="超管帳號管理" description="新增或移除平台超管帳號">
        <AdminUserManagementCard />
      </CollapsibleSection>

      <CollapsibleSection title="授權條款簽署紀錄" description="公開頁簽署紀錄查詢">
        <TermsAcceptanceTable />
      </CollapsibleSection>

      <CollapsibleSection title="首頁 Banner 設定" description="管理首頁輪播 Banner 內容">
        <HomepageBannerSection />
      </CollapsibleSection>

      {/* Data tabs */}
      <Tabs defaultValue="scripts" className="space-y-4 mt-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-2xl gap-1 h-auto sm:h-9">
          <TabsTrigger value="scripts">
            {t("transferAdmin.scriptTab")}
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{scripts.filter((s) => s.type !== "folder").length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="orgs">
            {t("transferAdmin.orgTab")}
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{orgs.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="personas">
            {t("transferAdmin.personaTab")}
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{personas.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="users">
            使用者
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{users.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Scripts */}
        <TabsContent value="scripts">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>所有劇本</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Input
                  placeholder="篩選名稱或 owner..."
                  value={scriptFilter}
                  onChange={(e) => setScriptFilter(e.target.value)}
                  className="h-8 text-sm"
                />
                <div className="inline-flex rounded-md border bg-background p-0.5 gap-0.5 shrink-0">
                  {["all", "Public", "Private"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`h-7 px-3 text-xs rounded transition-colors ${scriptStatusFilter === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                      onClick={() => setScriptStatusFilter(opt)}
                    >
                      {opt === "all" ? "全部" : opt === "Public" ? "公開" : "私人"}
                    </button>
                  ))}
                </div>
              </div>
              <CardDescription className="mt-1">
                顯示 {filteredScripts.length} / {scripts.filter((s) => s.type !== "folder").length} 部
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : filteredScripts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">無符合結果</div>
              ) : (
                <div className="space-y-1.5">
                  {filteredScripts.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate text-sm">{s.title || "(無標題)"}</div>
                          <div className="text-xs text-muted-foreground truncate">owner: {getOwnerLabel(s.ownerId)}</div>
                        </div>
                        {s.status === "Public" && (
                          <Badge variant="secondary" className="text-[10px] h-5 shrink-0">{t("transferAdmin.publicBadge")}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => handleOpenScriptSettings(s)}>設定</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTransfer("script", s)}>
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="destructive" size="sm" className="h-7" disabled={isDeleting} onClick={() => handleDeleteScript(s)}>
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
                <CardTitle className="text-base">{t("transferAdmin.createOrgTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder={t("transferAdmin.orgNamePlaceholder")} value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} />
                <Button className="w-full" onClick={handleCreateOrg} disabled={!newOrgName}>
                  <Plus className="w-4 h-4 mr-2" />{t("transferAdmin.createOrg")}
                </Button>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">所有組織</CardTitle>
                <Input
                  placeholder="篩選名稱或 owner..."
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  className="h-8 text-sm mt-2"
                />
                <CardDescription>顯示 {filteredOrgs.length} / {orgs.length} 個</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : filteredOrgs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">無符合結果</div>
                ) : (
                  <div className="space-y-2">
                    {filteredOrgs.map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{org.name}</div>
                            <div className="text-xs text-muted-foreground">owner: {getOwnerLabel(org.ownerId)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTransfer("org", org)}>
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="destructive" size="sm" className="h-7" disabled={isDeleting} onClick={() => handleDeleteOrg(org)}>
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
              <Input
                placeholder="篩選名稱或 owner..."
                value={personaFilter}
                onChange={(e) => setPersonaFilter(e.target.value)}
                className="h-8 text-sm mt-2"
              />
              <CardDescription>顯示 {filteredPersonas.length} / {personas.length} 位</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : filteredPersonas.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">無符合結果</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredPersonas.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                          {p.avatar ? <img src={p.avatar} alt={p.displayName} className="w-full h-full object-cover" /> : <UserCircle className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{p.displayName}</div>
                          <div className="text-xs text-muted-foreground truncate">owner: {getOwnerLabel(p.ownerId)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTransfer("persona", p)}>
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="destructive" size="sm" className="h-7" disabled={isDeleting} onClick={() => handleDeletePersona(p)}>
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
              <Input
                placeholder="篩選名稱 / email / ID..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="h-8 text-sm mt-2"
              />
              <CardDescription>顯示 {filteredUsers.length} / {users.length} 位</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">無符合結果</div>
              ) : (
                <div className="space-y-1.5">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="rounded border px-3 py-2.5 text-sm flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{u.displayName || u.handle || "-"}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email || "-"} ｜ {u.id}</div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 shrink-0"
                        disabled={isDeleting || u.id === currentUser?.uid}
                        onClick={() => handleDeleteUser(u)}
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

      {/* Transfer modal */}
      {showTransferModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>{t("transferAdmin.modalTitle")}</CardTitle>
              <CardDescription>
                {t("transferAdmin.transferring")}{" "}
                <span className="font-bold text-foreground mx-1">{selectedItem.name || selectedItem.displayName || selectedItem.title}</span>
                ({transferTypeLabel})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("transferAdmin.searchTargetLabel")}</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder={t("transferAdmin.targetSearchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
                  {isSearching && <div className="absolute right-3 top-2.5"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                </div>
                {searchQuery && (
                  <div className="border rounded-md mt-2 max-h-40 overflow-y-auto bg-popover text-popover-foreground shadow-sm">
                    {searchError ? (
                      <div className="p-3 text-xs text-destructive text-center">{searchError}</div>
                    ) : searchResults.length === 0 && !isSearching ? (
                      <div className="p-3 text-xs text-muted-foreground text-center">{t("transferAdmin.noUsers")}</div>
                    ) : (
                      searchResults.map((user) => (
                        <div
                          key={user.id}
                          className={`p-2 text-sm cursor-pointer hover:bg-muted flex items-center gap-2 ${targetUser?.id === user.id ? "bg-secondary" : ""}`}
                          onClick={() => {
                            setTargetUser(user);
                            setSearchQuery("");
                            setSearchResults([]);
                          }}
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">{(user.displayName || user.handle || "?")[0].toUpperCase()}</div>
                          <div className="flex-1 truncate">
                            <span className="font-medium">{user.displayName || t("transferAdmin.noNickname")}</span>
                            <span className="text-xs text-muted-foreground ml-2">@{user.handle || user.id.slice(0, 6)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {targetUser && (
                <div className="bg-secondary/30 p-3 rounded-md border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      {(targetUser.displayName || targetUser.handle || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t("transferAdmin.willTransferTo")}：</div>
                      <div className="text-sm">{targetUser.displayName} <span className="text-xs text-muted-foreground">(@{targetUser.handle})</span></div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setTargetUser(null)}><Plus className="rotate-45" /></Button>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setShowTransferModal(false)}>{t("transferAdmin.cancel")}</Button>
                <Button onClick={confirmTransfer} disabled={!targetUser || isTransferring}>
                  {isTransferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("transferAdmin.confirmTransfer")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showScriptSettingsModal && selectedScriptSettings && (
        <ScriptMetadataDialog
          open={showScriptSettingsModal}
          onOpenChange={(open) => {
            setShowScriptSettingsModal(open);
            if (!open) setSelectedScriptSettings(null);
          }}
          script={selectedScriptSettings}
          fetchFullScript={false}
          preserveAuthorInternalData
          saveScript={async (scriptId, updates, context = {}) => {
            return updateScriptMetadataAdmin(scriptId, {
              ...updates,
              tags: Array.isArray(context?.tagIds) ? context.tagIds : [],
            });
          }}
          onSave={(savedScript) => {
            setScripts((prev) =>
              (prev || []).map((item) => (item.id === savedScript.id ? { ...item, ...savedScript } : item))
            );
          }}
        />
      )}
    </div>
  );
}
