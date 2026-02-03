import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Users, ArrowRightLeft, Building2, Plus, Search } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { createOrganization, transferOrganizationOwnership, getOrganization } from "../lib/db";

// Mock Data for Admin
const MOCK_ORGS = [
    { id: "org-1", name: "Dramatic Arts Society", owner: "admin-uid", scriptCount: 4, memberCount: 1 },
    { id: "org-2", name: "Indie Film Group", owner: "user-123", scriptCount: 2, memberCount: 3 },
];

export default function SuperAdminPage() {
    const { currentUser } = useAuth();
    const [orgs, setOrgs] = useState(MOCK_ORGS);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [transferTarget, setTransferTarget] = useState("");
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");

    // Simple Role Guard (Mock)
    // if (currentUser?.email !== "admin@example.com") {
    //    return <div className="p-8 text-center">Access Denied. Super Admin Only.</div>;
    // }

    const handleCreateOrg = async () => {
        if (!newOrgName) return;
        
        try {
            // Optimistic UI update or wait for API
            const tempId = `org-${Date.now()}`;
            const newOrg = {
                id: tempId,
                name: newOrgName,
                owner: currentUser?.uid || "admin-uid",
                scriptCount: 0,
                memberCount: 1
            };
            setOrgs([...orgs, newOrg]);
            setNewOrgName("");

            // Real API Call
            await createOrganization({ name: newOrgName, description: "Created via Admin Console" });
            // In real app, we'd fetch the list again to get the real ID
        } catch (error) {
            console.error("Failed to create org:", error);
            alert("建立組織失敗");
        }
    };

    const handleOpenTransfer = (org) => {
        setSelectedOrg(org);
        setShowTransferModal(true);
    };

    const confirmTransfer = async () => {
        if (!selectedOrg || !transferTarget) return;
        
        try {
            await transferOrganizationOwnership(selectedOrg.id, transferTarget);
            
            // Update local state to reflect transfer
            setOrgs(orgs.map(o => 
                o.id === selectedOrg.id 
                ? { ...o, owner: transferTarget } 
                : o
            ));
            
            alert(`成功將 "${selectedOrg.name}" 及其所有劇本移轉給 "${transferTarget}"`);
            setShowTransferModal(false);
            setSelectedOrg(null);
            setTransferTarget("");
        } catch (error) {
            console.error("Transfer failed:", error);
            alert("移轉失敗，請檢查使用者 ID 是否正確");
        }
    };

    return (
        <div className="container mx-auto p-8 max-w-5xl">
            <header className="mb-8 border-b pb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-serif mb-2">超級管理員控制台</h1>
                    <p className="text-muted-foreground">管理組織與資產所有權。</p>
                </div>
                <div className="flex items-center gap-2">
                     <Badge variant="outline" className="text-xs">已登入身分：{currentUser?.displayName || "Admin"}</Badge>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Create Org Panel */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">建立新組織</CardTitle>
                        <CardDescription>為新團隊預先配置工作空間。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">組織名稱</label>
                            <Input 
                                placeholder="例如：台大話劇社" 
                                value={newOrgName}
                                onChange={(e) => setNewOrgName(e.target.value)}
                            />
                        </div>
                        <Button className="w-full" onClick={handleCreateOrg} disabled={!newOrgName}>
                            <Plus className="w-4 h-4 mr-2" />
                            建立組織
                        </Button>
                    </CardContent>
                </Card>

                {/* Org List Panel */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg">組織名錄</CardTitle>
                        <CardDescription>管理現有組織與移轉請求。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {orgs.map(org => (
                                <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{org.name}</h3>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                <span>{org.scriptCount} 個劇本</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {org.memberCount} 位成員
                                                </span>
                                                <span>•</span>
                                                <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                                                    擁有者: {org.owner === (currentUser?.uid || "admin-uid") ? "您" : org.owner}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleOpenTransfer(org)}
                                        disabled={org.owner !== (currentUser?.uid || "admin-uid")}
                                        title={org.owner !== (currentUser?.uid || "admin-uid") ? "您已不再擁有此組織" : "移轉擁有權"}
                                    >
                                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                                        移轉
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transfer Modal (Simple Overlay) */}
            {showTransferModal && selectedOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl">
                        <CardHeader>
                            <CardTitle>移轉擁有權</CardTitle>
                            <CardDescription>
                                即將轉移 <strong>{selectedOrg.name}</strong> 及其所屬的 {selectedOrg.scriptCount} 個劇本。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">新擁有者 (User ID 或 Email)</label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        className="pl-9"
                                        placeholder="搜尋使用者..." 
                                        value={transferTarget} 
                                        onChange={(e) => setTransferTarget(e.target.value)} 
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    ⚠️ 此動作無法復原。您將失去此組織的管理權限。
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setShowTransferModal(false)}>取消</Button>
                                <Button variant="destructive" onClick={confirmTransfer} disabled={!transferTarget}>
                                    確認移轉
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
