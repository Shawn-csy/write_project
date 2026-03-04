import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { FileText, ArrowRightLeft, Building2, Plus, Search, UserCircle, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { createOrganization, transferOrganizationOwnership } from "../lib/api/organizations";
import { transferScriptOwnership } from "../lib/api/scripts";
import { transferPersonaOwnership } from "../lib/api/personas";
import {
  searchUsers,
  getPublicTermsAcceptances,
  getAdminUsers,
  addAdminUser,
  removeAdminUser,
  getAllUsersAdmin,
  getAllOrganizationsAdmin,
  getAllPersonasAdmin,
  getAllScriptsAdmin,
  deleteUserAdmin,
  deleteOrganizationAdmin,
  deletePersonaAdmin,
  deleteScriptAdmin,
} from "../lib/api/admin";

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

  const [termsRecords, setTermsRecords] = useState([]);
  const [termsTotal, setTermsTotal] = useState(0);
  const [termsQuery, setTermsQuery] = useState("");
  const [isTermsLoading, setIsTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState("");

  const [adminUsers, setAdminUsers] = useState([]);
  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [adminManageError, setAdminManageError] = useState("");
  const [isAdminManaging, setIsAdminManaging] = useState(false);

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

  const loadTermsRecords = async (queryText = "") => {
    setIsTermsLoading(true);
    setTermsError("");
    try {
      const result = await getPublicTermsAcceptances({
        q: queryText,
        limit: 50,
        offset: 0,
      });
      setTermsRecords(result?.items || []);
      setTermsTotal(result?.total || 0);
    } catch (error) {
      console.error("Failed to load terms acceptance records", error);
      setTermsRecords([]);
      setTermsTotal(0);
      setTermsError(
        error?.status === 403
          ? "你目前不是管理員帳號（需在後端 ADMIN_USER_IDS 內），所以無法讀取簽署紀錄。"
          : "讀取簽署紀錄失敗，請確認目前連線的 API 是否為同一個環境。"
      );
    } finally {
      setIsTermsLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    try {
      const rows = await getAdminUsers();
      setAdminUsers(rows || []);
    } catch (error) {
      console.error("Failed to load admin users", error);
    }
  };

  useEffect(() => {
    if (!currentUser || !profile?.isAdmin) return;
    loadAllData("");
    loadTermsRecords("");
    loadAdminUsers();
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

  useEffect(() => {
    if (!currentUser || !profile?.isAdmin) return;
    const delay = setTimeout(() => {
      loadTermsRecords(termsQuery.trim());
    }, 350);
    return () => clearTimeout(delay);
  }, [termsQuery, currentUser, profile?.isAdmin]);

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
      await loadAdminUsers();
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

  const handleAddAdmin = async () => {
    const email = adminEmailInput.trim().toLowerCase();
    if (!email) return;
    setIsAdminManaging(true);
    setAdminManageError("");
    try {
      await addAdminUser({ email });
      setAdminEmailInput("");
      await loadAdminUsers();
    } catch (error) {
      setAdminManageError(error?.message || "新增超管失敗");
    } finally {
      setIsAdminManaging(false);
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    if (!adminId) return;
    setIsAdminManaging(true);
    setAdminManageError("");
    try {
      await removeAdminUser(adminId);
      await loadAdminUsers();
    } catch (error) {
      setAdminManageError(error?.message || "移除超管失敗");
    } finally {
      setIsAdminManaging(false);
    }
  };

  const userCountText = useMemo(() => `${users.length} users`, [users.length]);
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
      <header className="mb-8 border-b pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif mb-2">{t("transferAdmin.title")}</h1>
          <p className="text-muted-foreground">全域超管模式：可檢視所有使用者、組織、作者、劇本並執行刪除。</p>
        </div>
        <Badge variant="outline" className="text-xs">{t("transferAdmin.loggedInAs")}：{currentUser?.displayName || "Admin"}</Badge>
      </header>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <Input
              placeholder="全域搜尋（名稱 / ID / owner）"
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
            />
            <Button variant="outline" onClick={() => loadAllData(listQuery.trim())}>
              重新載入
            </Button>
            <span className="text-xs text-muted-foreground">{userCountText}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">超管帳號管理</CardTitle>
          <CardDescription>你可以新增或移除其他超級管理員帳號（email）。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="輸入要新增的超管 email" value={adminEmailInput} onChange={(e) => setAdminEmailInput(e.target.value)} />
            <Button onClick={handleAddAdmin} disabled={!adminEmailInput.trim() || isAdminManaging}>新增超管</Button>
          </div>
          {adminManageError && <div className="text-xs text-destructive">{adminManageError}</div>}
          <div className="space-y-2">
            {(adminUsers || []).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{item.email || item.userId || item.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.id.startsWith("env-email:") ? "來自環境變數（不可在此移除）" : `建立時間：${item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}`}
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled={isAdminManaging || item.id.startsWith("env-email:")} onClick={() => handleRemoveAdmin(item.id)}>
                  移除
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">授權條款簽署紀錄</CardTitle>
          <CardDescription>記錄公開頁簽署當下的時間、IP、裝置與來源資訊。共 {termsTotal} 筆。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="搜尋 scriptId / visitorId / IP / UA" value={termsQuery} onChange={(e) => setTermsQuery(e.target.value)} />
            <Button variant="outline" onClick={() => loadTermsRecords(termsQuery.trim())}>重新整理</Button>
          </div>
          {termsError && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{termsError}</div>}
          {isTermsLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />載入簽署紀錄中...</div>
          ) : termsRecords.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4">目前沒有簽署紀錄。</div>
          ) : (
            <div className="space-y-2">
              {termsRecords.map((row) => (
                <div key={row.id} className="rounded-md border p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-foreground">
                    <span className="font-semibold">版本 {row.termsVersion}</span>
                    <span>時間：{new Date(row.acceptedAt || 0).toLocaleString()}</span>
                    <span>IP：{row.ipAddress || "-"}</span>
                    <span>visitor：{row.visitorId || "-"}</span>
                  </div>
                  <div className="mt-1 text-muted-foreground">scriptId：{row.scriptId || "-"} ｜ UA：{row.userAgent || "-"}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-2xl gap-1 h-auto sm:h-9">
          <TabsTrigger value="users">使用者</TabsTrigger>
          <TabsTrigger value="orgs">{t("transferAdmin.orgTab")}</TabsTrigger>
          <TabsTrigger value="personas">{t("transferAdmin.personaTab")}</TabsTrigger>
          <TabsTrigger value="scripts">{t("transferAdmin.scriptTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>所有使用者</CardTitle>
              <CardDescription>共 {users.length} 位</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : users.map((u) => (
                <div key={u.id} className="rounded border px-3 py-2 text-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.displayName || u.handle || "-"}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email || "-"} ｜ {u.id}</div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting || u.id === currentUser?.uid}
                    onClick={() => handleDeleteUser(u)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orgs" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="md:col-span-1 h-fit">
              <CardHeader>
                <CardTitle className="text-lg">{t("transferAdmin.createOrgTitle")}</CardTitle>
                <CardDescription>{t("transferAdmin.createOrgDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder={t("transferAdmin.orgNamePlaceholder")} value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} />
                <Button className="w-full" onClick={handleCreateOrg} disabled={!newOrgName}><Plus className="w-4 h-4 mr-2" />{t("transferAdmin.createOrg")}</Button>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">所有組織</CardTitle>
                <CardDescription>共 {orgs.length} 個</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : (
                  <div className="space-y-4">
                    {orgs.map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary"><Building2 className="w-6 h-6" /></div>
                          <div>
                            <h3 className="font-semibold">{org.name}</h3>
                            <p className="text-xs text-muted-foreground">owner: {getOwnerLabel(org.ownerId)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenTransfer("org", org)}><ArrowRightLeft className="w-4 h-4 mr-2" />{t("transferAdmin.transfer")}</Button>
                          <Button variant="destructive" size="sm" disabled={isDeleting} onClick={() => handleDeleteOrg(org)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="personas">
          <Card>
            <CardHeader>
              <CardTitle>所有作者</CardTitle>
              <CardDescription>共 {personas.length} 位</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {personas.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                          {p.avatar ? <img src={p.avatar} alt={p.displayName} className="w-full h-full object-cover" /> : <UserCircle />}
                        </div>
                        <div>
                          <div className="font-semibold">{p.displayName}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[220px]">owner: {getOwnerLabel(p.ownerId)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenTransfer("persona", p)}><ArrowRightLeft className="w-4 h-4 mr-2" />{t("transferAdmin.transfer")}</Button>
                        <Button variant="destructive" size="sm" disabled={isDeleting} onClick={() => handleDeletePersona(p)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scripts">
          <Card>
            <CardHeader>
              <CardTitle>所有劇本</CardTitle>
              <CardDescription>共 {scripts.filter((s) => s.type !== "folder").length} 部（不含資料夾）</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : (
                <div className="space-y-2">
                  {scripts.filter((s) => s.type !== "folder").map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium truncate">{s.title}</span>
                        {s.status === "Public" && <Badge variant="secondary" className="text-[10px] h-5">{t("transferAdmin.publicBadge")}</Badge>}
                        <span className="text-xs text-muted-foreground">owner: {getOwnerLabel(s.ownerId)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenTransfer("script", s)}><ArrowRightLeft className="w-4 h-4 mr-2" />{t("transferAdmin.transfer")}</Button>
                        <Button variant="destructive" size="sm" disabled={isDeleting} onClick={() => handleDeleteScript(s)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
