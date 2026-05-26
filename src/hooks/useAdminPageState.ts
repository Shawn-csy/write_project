import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
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

export interface AdminUser {
  id: string;
  displayName?: string;
  email?: string;
  handle?: string;
}

export interface AdminOrg {
  id: string;
  name?: string;
  ownerId?: string;
}

export interface AdminPersona {
  id: string;
  displayName?: string;
  ownerId?: string;
  avatar?: string;
}

export interface AdminScript {
  id: string;
  title?: string;
  ownerId?: string;
  status?: string;
  type?: string;
  [key: string]: unknown;
}

interface SaveScriptContext {
  tagIds?: string[];
}

export function useAdminPageState() {
  const { t } = useI18n();
  const { currentUser, profile } = useAuth();

  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [scripts, setScripts] = useState<AdminScript[]>([]);
  const [personas, setPersonas] = useState<AdminPersona[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [listQuery, setListQuery] = useState<string>("");

  const [transferType, setTransferType] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<AdminOrg | AdminPersona | AdminScript | null>(null);
  const [targetUser, setTargetUser] = useState<AdminUser | null>(null);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  const [newOrgName, setNewOrgName] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showScriptSettingsModal, setShowScriptSettingsModal] = useState<boolean>(false);
  const [selectedScriptSettings, setSelectedScriptSettings] = useState<AdminScript | null>(null);

  const [scriptFilter, setScriptFilter] = useState("");
  const [scriptStatusFilter, setScriptStatusFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("");
  const [personaFilter, setPersonaFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");

  const toText = (value: unknown): string => (typeof value === "string" ? value : "");

  const transferTypeLabel =
    transferType === "org"
      ? t("transferAdmin.typeOrg")
      : transferType === "persona"
        ? t("transferAdmin.typePersona")
        : t("transferAdmin.typeScript");

  const selectedItemLabel = selectedItem
    ? (("name" in selectedItem && toText(selectedItem.name)) ||
      ("displayName" in selectedItem && toText(selectedItem.displayName)) ||
      ("title" in selectedItem && toText(selectedItem.title)) ||
      selectedItem.id)
    : "";

  const loadAllData = async (queryText = "") => {
    setIsLoading(true);
    try {
      const [uData, oData, sData, pData] = await Promise.all([
        getAllUsersAdmin({ q: queryText, limit: 300 }),
        getAllOrganizationsAdmin({ q: queryText, limit: 300 }),
        getAllScriptsAdmin({ q: queryText, limit: 600 }),
        getAllPersonasAdmin({ q: queryText, limit: 300 }),
      ]);
      setUsers((uData || []) as AdminUser[]);
      setOrgs((oData || []) as AdminOrg[]);
      setScripts((sData || []) as AdminScript[]);
      setPersonas((pData || []) as AdminPersona[]);
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
    const timer = setTimeout(() => { loadAllData(normalized); }, 350);
    return () => clearTimeout(timer);
  }, [listQuery, currentUser, profile?.isAdmin]);

  useEffect(() => {
    const normalizedQuery = searchQuery.trim();
    if (!normalizedQuery) { setSearchResults([]); setSearchError(""); return; }
    const delay = setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const results = await searchUsers(normalizedQuery);
        setSearchResults(results || []);
      } catch (e: unknown) {
        console.error(e);
        setSearchResults([]);
        setSearchError(
          (e as { status?: number })?.status === 403
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

  const handleOpenTransfer = (type: "org" | "script" | "persona", item: AdminOrg | AdminPersona | AdminScript) => {
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
      let res: { newOwnerId?: unknown } | null = null;
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

  const handleDeleteOrg = async (org: AdminOrg) => {
    if (!org?.id) return;
    if (!window.confirm(`確定刪除組織「${org.name || org.id}」？`)) return;
    setIsDeleting(true);
    try {
      await deleteOrganizationAdmin(org.id);
      loadAllData(listQuery.trim());
    } catch (error) {
      alert((error as { message?: string })?.message || "刪除組織失敗");
    } finally { setIsDeleting(false); }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!user?.id) return;
    if (user.id === currentUser?.uid) { alert("不能刪除目前登入中的超管帳號"); return; }
    if (!window.confirm(`確定刪除使用者「${user.displayName || user.email || user.id}」？此動作會清除其擁有的資料。`)) return;
    setIsDeleting(true);
    try {
      await deleteUserAdmin(user.id);
      loadAllData(listQuery.trim());
    } catch (error) {
      alert((error as { message?: string })?.message || "刪除使用者失敗");
    } finally { setIsDeleting(false); }
  };

  const handleDeletePersona = async (persona: AdminPersona) => {
    if (!persona?.id) return;
    if (!window.confirm(`確定刪除作者「${persona.displayName || persona.id}」？`)) return;
    setIsDeleting(true);
    try {
      await deletePersonaAdmin(persona.id);
      loadAllData(listQuery.trim());
    } catch (error) {
      alert((error as { message?: string })?.message || "刪除作者失敗");
    } finally { setIsDeleting(false); }
  };

  const handleDeleteScript = async (script: AdminScript) => {
    if (!script?.id) return;
    if (!window.confirm(`確定刪除劇本「${script.title || script.id}」？`)) return;
    setIsDeleting(true);
    try {
      await deleteScriptAdmin(script.id);
      loadAllData(listQuery.trim());
    } catch (error) {
      alert((error as { message?: string })?.message || "刪除劇本失敗");
    } finally { setIsDeleting(false); }
  };

  const handleOpenScriptSettings = async (script: AdminScript) => {
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

  const handleSaveScriptSettings = async (scriptId: string, updates: Record<string, unknown>, context?: SaveScriptContext) => {
    return updateScriptMetadataAdmin(scriptId, {
      ...updates,
      tags: Array.isArray(context?.tagIds) ? context.tagIds : [],
    });
  };

  const userById = useMemo(() => {
    const map = new Map<string, AdminUser>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const getOwnerLabel = (ownerId?: string) => {
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
      .filter((s) => !q || toText(s.title).toLowerCase().includes(q) || getOwnerLabel(s.ownerId).toLowerCase().includes(q));
  }, [scripts, scriptFilter, scriptStatusFilter, userById]);

  const filteredOrgs = useMemo(() => {
    const q = orgFilter.toLowerCase();
    return !q ? orgs : orgs.filter((o) => toText(o.name).toLowerCase().includes(q) || getOwnerLabel(o.ownerId).toLowerCase().includes(q));
  }, [orgs, orgFilter, userById]);

  const filteredPersonas = useMemo(() => {
    const q = personaFilter.toLowerCase();
    return !q ? personas : personas.filter((p) => toText(p.displayName).toLowerCase().includes(q) || getOwnerLabel(p.ownerId).toLowerCase().includes(q));
  }, [personas, personaFilter, userById]);

  const filteredUsers = useMemo(() => {
    const q = userFilter.toLowerCase();
    return !q ? users : users.filter((u) => toText(u.displayName).toLowerCase().includes(q) || toText(u.email).toLowerCase().includes(q) || u.id.toLowerCase().includes(q));
  }, [users, userFilter]);

  return {
    t, currentUser, profile,
    // data
    orgs, scripts, personas, users,
    isLoading, listQuery, setListQuery,
    // transfer
    transferType, selectedItem, targetUser, setTargetUser,
    showTransferModal, setShowTransferModal,
    searchQuery, setSearchQuery,
    searchResults, isSearching, searchError,
    isTransferring,
    transferTypeLabel, selectedItemLabel,
    // org create
    newOrgName, setNewOrgName,
    // delete
    isDeleting,
    // script settings
    showScriptSettingsModal, setShowScriptSettingsModal,
    selectedScriptSettings, setSelectedScriptSettings,
    // filters
    scriptFilter, setScriptFilter,
    scriptStatusFilter, setScriptStatusFilter,
    orgFilter, setOrgFilter,
    personaFilter, setPersonaFilter,
    userFilter, setUserFilter,
    // computed
    filteredScripts, filteredOrgs, filteredPersonas, filteredUsers,
    getOwnerLabel,
    // handlers
    loadAllData,
    handleCreateOrg,
    handleOpenTransfer,
    confirmTransfer,
    handleDeleteOrg, handleDeleteUser, handleDeletePersona, handleDeleteScript,
    handleOpenScriptSettings, handleSaveScriptSettings,
  };
}

export type { SaveScriptContext };
