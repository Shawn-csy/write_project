import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { FileText, ArrowRightLeft, Building2, Plus, Search, UserCircle, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { 
    createOrganization, transferOrganizationOwnership, getOrganizations, 
    getUserScripts, transferScriptOwnership, 
    getPersonas, transferPersonaOwnership, 
    searchUsers 
} from "../lib/db";

export default function SuperAdminPage() {
    const { t } = useI18n();
    const { currentUser } = useAuth();
    const apiBaseUrl =
        (typeof window !== "undefined" && window.__ENV__ && window.__ENV__.VITE_API_URL) ||
        import.meta.env.VITE_API_URL ||
        "/api";
    
    // Data States
    const [orgs, setOrgs] = useState([]);
    const [scripts, setScripts] = useState([]);
    const [personas, setPersonas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Transfer Modal States
    const [transferType, setTransferType] = useState(null); // 'org', 'script', 'persona'
    const [selectedItem, setSelectedItem] = useState(null);
    const [transferTarget, setTransferTarget] = useState("");
    const [targetUser, setTargetUser] = useState(null); // The resolved user object
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    const [sourceQuery, setSourceQuery] = useState("");
    const [sourceResults, setSourceResults] = useState([]);
    const [isSourceSearching, setIsSourceSearching] = useState(false);
    const [sourceUser, setSourceUser] = useState(null);

    // Create Org State
    const [newOrgName, setNewOrgName] = useState("");

    // Load Data
    useEffect(() => {
        if (!currentUser) return;
        loadAllData();
    }, [currentUser, sourceUser]);

    const loadAllData = async () => {
        setIsLoading(true);
        try {
            const sourceOwnerId = sourceUser?.id;
            const [oData, sData, pData] = await Promise.all([
                getOrganizations(sourceOwnerId),
                getUserScripts(sourceOwnerId),
                getPersonas(sourceOwnerId)
            ]);
            setOrgs(oData || []);
            setScripts(sData || []);
            setPersonas(pData || []);
        } catch (e) {
            console.error("Failed to load admin data", e);
        } finally {
            setIsLoading(false);
        }
    };

    // User Search
    useEffect(() => {
        if (!searchQuery) {
            setSearchResults([]);
            return;
        }
        const delay = setTimeout(async () => {
             setIsSearching(true);
             try {
                 const results = await searchUsers(searchQuery);
                 setSearchResults(results || []);
             } catch (e) {
                 console.error(e);
             } finally {
                 setIsSearching(false);
             }
        }, 500);
        return () => clearTimeout(delay);
    }, [searchQuery]);

    useEffect(() => {
        if (!sourceQuery) {
            setSourceResults([]);
            return;
        }
        const delay = setTimeout(async () => {
            setIsSourceSearching(true);
            try {
                const results = await searchUsers(sourceQuery);
                setSourceResults(results || []);
            } catch (e) {
                console.error(e);
            } finally {
                setIsSourceSearching(false);
            }
        }, 400);
        return () => clearTimeout(delay);
    }, [sourceQuery]);

    const handleCreateOrg = async () => {
        if (!newOrgName) return;
        try {
            await createOrganization({ name: newOrgName, description: "Created via Admin Console" });
            setNewOrgName("");
            loadAllData(); // Refresh list
        } catch (error) {
            console.error("Failed to create org:", error);
            alert(t("transferAdmin.alertCreateFailed"));
        }
    };

    const handleOpenTransfer = (type, item) => {
        setTransferType(type);
        setSelectedItem(item);
        setTransferTarget("");
        setSearchQuery("");
        setTargetUser(null);
        setShowTransferModal(true);
    };

    const confirmTransfer = async () => {
        if (!selectedItem || !targetUser) return;
        setIsTransferring(true);
        
        try {
            let res = null;
            if (transferType === 'org') {
                res = await transferOrganizationOwnership(selectedItem.id, targetUser.id);
            } else if (transferType === 'script') {
                res = await transferScriptOwnership(selectedItem.id, targetUser.id);
            } else if (transferType === 'persona') {
                res = await transferPersonaOwnership(selectedItem.id, targetUser.id);
            }
            if (res?.newOwnerId && res.newOwnerId !== targetUser.id) {
                alert(t("transferAdmin.alertMismatch"));
            } else {
                alert(t("transferAdmin.alertTransferSuccess"));
            }
            setShowTransferModal(false);
            setSelectedItem(null);
            setTargetUser(null);
            loadAllData(); // Refresh all lists
        } catch (error) {
            console.error("Transfer failed:", error);
            alert(t("transferAdmin.alertTransferFailed"));
        } finally {
            setIsTransferring(false);
        }
    };

    const transferTypeLabel =
        transferType === "org"
            ? t("transferAdmin.typeOrg")
            : transferType === "persona"
                ? t("transferAdmin.typePersona")
                : t("transferAdmin.typeScript");

    return (
        <div className="container mx-auto p-4 sm:p-8 max-w-6xl h-full overflow-y-auto">
            <header className="mb-8 border-b pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif mb-2">{t("transferAdmin.title")}</h1>
                    <p className="text-muted-foreground">{t("transferAdmin.subtitle")}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Debug: API Base = {apiBaseUrl}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                     <Badge variant="outline" className="text-xs">{t("transferAdmin.loggedInAs")}：{currentUser?.displayName || "Admin"}</Badge>
                </div>
            </header>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="text-lg">{t("transferAdmin.sourceUserTitle")}</CardTitle>
                    <CardDescription>{t("transferAdmin.sourceUserDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Input
                        placeholder={t("transferAdmin.sourceSearchPlaceholder")}
                        value={sourceQuery}
                        onChange={(e) => setSourceQuery(e.target.value)}
                    />
                    {isSourceSearching && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {t("transferAdmin.searching")}
                        </div>
                    )}
                    {sourceResults.length > 0 && (
                        <div className="space-y-2">
                            {sourceResults.map(u => (
                                <button
                                    key={`source-${u.id}`}
                                    className="w-full text-left border rounded-md px-3 py-2 hover:bg-muted"
                                    onClick={() => {
                                        setSourceUser(u);
                                        setSourceQuery("");
                                        setSourceResults([]);
                                    }}
                                >
                                    <div className="text-sm font-medium">{u.displayName || u.handle || u.email}</div>
                                    <div className="text-xs text-muted-foreground">{u.email || u.id}</div>
                                </button>
                            ))}
                        </div>
                    )}
                    {sourceUser && (
                        <div className="text-sm text-muted-foreground">
                            {t("transferAdmin.currentSource")}：{sourceUser.displayName || sourceUser.handle || sourceUser.email}（{sourceUser.email || sourceUser.id}）
                        </div>
                    )}
                </CardContent>
            </Card>

            <Tabs defaultValue="orgs" className="space-y-6">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 max-w-md gap-1 h-auto sm:h-9">
                    <TabsTrigger value="orgs">{t("transferAdmin.orgTab")}</TabsTrigger>
                    <TabsTrigger value="personas">{t("transferAdmin.personaTab")}</TabsTrigger>
                    <TabsTrigger value="scripts">{t("transferAdmin.scriptTab")}</TabsTrigger>
                </TabsList>

                {/* --- Organizations --- */}
                <TabsContent value="orgs" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Create Panel */}
                        <Card className="md:col-span-1 h-fit">
                            <CardHeader>
                                <CardTitle className="text-lg">{t("transferAdmin.createOrgTitle")}</CardTitle>
                                <CardDescription>{t("transferAdmin.createOrgDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t("transferAdmin.orgName")}</label>
                                    <Input 
                                        placeholder={t("transferAdmin.orgNamePlaceholder")} 
                                        value={newOrgName}
                                        onChange={(e) => setNewOrgName(e.target.value)}
                                    />
                                </div>
                                <Button className="w-full" onClick={handleCreateOrg} disabled={!newOrgName}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    {t("transferAdmin.createOrg")}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* List Panel */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-lg">{t("transferAdmin.myOrgsTitle")}</CardTitle>
                                <CardDescription>{t("transferAdmin.myOrgsDesc").replace("{count}", String(orgs.length))}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                                ) : orgs.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">{t("transferAdmin.noOrgs")}</div>
                                ) : (
                                    <div className="space-y-4">
                                        {orgs.map(org => (
                                            <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                        <Building2 className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold">{org.name}</h3>
                                                        <p className="text-xs text-muted-foreground">{org.description || t("transferAdmin.noDescription")}</p>
                                                    </div>
                                                </div>
                                                
                                                <Button 
                                                    variant="outline" size="sm" 
                                                    onClick={() => handleOpenTransfer('org', org)}
                                                >
                                                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                                                    {t("transferAdmin.transfer")}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- Personas --- */}
                <TabsContent value="personas">
                    <Card>
                        <CardHeader>
                             <CardTitle>{t("transferAdmin.personaTitle")}</CardTitle>
                             <CardDescription>{t("transferAdmin.personaDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                            ) : personas.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">{t("transferAdmin.noPersona")}</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {personas.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                 <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                                     {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <UserCircle />}
                                                 </div>
                                                 <div>
                                                     <div className="font-semibold">{p.displayName}</div>
                                                     <div className="text-xs text-muted-foreground truncate max-w-[150px]">{p.bio || t("transferAdmin.noBio")}</div>
                                                 </div>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => handleOpenTransfer('persona', p)}>
                                                <ArrowRightLeft className="w-4 h-4 mr-2" />
                                                {t("transferAdmin.transfer")}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- Scripts --- */}
                <TabsContent value="scripts">
                     <Card>
                        <CardHeader>
                             <CardTitle>{t("transferAdmin.scriptTitle")}</CardTitle>
                             <CardDescription>{t("transferAdmin.scriptDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                            ) : scripts.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">{t("transferAdmin.noScripts")}</div>
                            ) : (
                                <div className="space-y-2">
                                    {scripts.filter(s => s.type !== 'folder').map(s => (
                                        <div key={s.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-4 h-4 text-muted-foreground" />
                                                <span className="font-medium">{s.title}</span>
                                                {s.status === "Public" && <Badge variant="secondary" className="text-[10px] h-5">{t("transferAdmin.publicBadge")}</Badge>}
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenTransfer('script', s)}>
                                                <ArrowRightLeft className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Transfer Modal */}
            {showTransferModal && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <CardHeader>
                            <CardTitle>{t("transferAdmin.modalTitle")}</CardTitle>
                            <CardDescription>
                                {t("transferAdmin.transferring")} 
                                <span className="font-bold text-foreground mx-1">
                                    {selectedItem.name || selectedItem.displayName || selectedItem.title}
                                </span>
                                ({transferTypeLabel})
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Search Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t("transferAdmin.searchTargetLabel")}</label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        className="pl-9"
                                        placeholder={t("transferAdmin.targetSearchPlaceholder")} 
                                        value={searchQuery} 
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                        autoFocus
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-2.5">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                                
                                {/* Search Results */}
                                {searchQuery && (
                                    <div className="border rounded-md mt-2 max-h-40 overflow-y-auto bg-popover text-popover-foreground shadow-sm">
                                        {searchResults.length === 0 && !isSearching ? (
                                            <div className="p-3 text-xs text-muted-foreground text-center">{t("transferAdmin.noUsers")}</div>
                                        ) : (
                                            searchResults.map(user => (
                                                <div 
                                                    key={user.id}
                                                    className={`p-2 text-sm cursor-pointer hover:bg-muted flex items-center gap-2 ${targetUser?.id === user.id ? 'bg-secondary' : ''}`}
                                                    onClick={() => {
                                                        setTargetUser(user);
                                                        setSearchQuery(""); // Optional: keep query or clear? User might want to see what they picked.
                                                        // Actually better to keep the selection visible below and clear search results visual
                                                        setSearchResults([]); 
                                                    }}
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                                                        {(user.displayName || user.handle || "?")[0].toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 truncate">
                                                        <span className="font-medium">{user.displayName || t("transferAdmin.noNickname")}</span>
                                                        <span className="text-xs text-muted-foreground ml-2">@{user.handle || user.id.slice(0,6)}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Selected Target */}
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

                            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded text-amber-600 dark:text-amber-400 text-xs flex gap-2 items-start">
                                <span className="mt-0.5">⚠️</span>
                                <span>{t("transferAdmin.irreversibleWarning")}</span>
                            </div>

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
