
import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { getPersonas, createPersona, deletePersona, getOrganizations, createOrganization, deleteOrganization } from "../../lib/db";
import { Loader2, Plus, Trash2, User, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Textarea } from "../ui/textarea";

export function ProfileTab() {
    return (
        <div className="container mx-auto max-w-4xl py-6 space-y-8">
            <PersonaManager />
            <OrganizationManager />
        </div>
    );
}

function PersonaManager() {
    const [personas, setPersonas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
    // Form
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");

    const load = async () => {
        setIsLoading(true);
        try {
            const data = await getPersonas();
            setPersonas(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        if (!name) return;
        setIsCreating(true);
        try {
            await createPersona({ displayName: name, bio });
            setIsOpen(false);
            setName("");
            setBio("");
            load();
        } catch (e) {
            alert("Failed to create persona");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this persona?")) return;
        await deletePersona(id);
        load();
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>作者身分 (Personas)</CardTitle>
                        <CardDescription>管理您的筆名與作者身分。發布劇本時可選擇使用這些身分。</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setIsOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> 新增身分
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : personas.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">尚未建立任何身分</div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {personas.map(p => (
                            <div key={p.id} className="flex items-start justify-between p-4 border rounded-lg bg-card">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                        {p.avatar ? <img src={p.avatar} className="w-full h-full rounded-full object-cover" /> : <User className="w-5 h-5 text-muted-foreground" />}
                                    </div>
                                    <div>
                                        <div className="font-medium">{p.displayName}</div>
                                        <div className="text-xs text-muted-foreground line-clamp-1">{p.bio || "No bio"}</div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive/90">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>新增作者身分</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>顯示名稱 (Display Name)</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 筆名" />
                        </div>
                        <div className="grid gap-2">
                            <Label>簡介 (Bio)</Label>
                            <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="簡單介紹..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>取消</Button>
                        <Button onClick={handleCreate} disabled={isCreating || !name}>建立</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function OrganizationManager() {
    const [orgs, setOrgs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");

    const load = async () => {
        setIsLoading(true);
        try {
            const data = await getOrganizations(); // This returns orgs I own
            setOrgs(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        if (!name) return;
        setIsCreating(true);
        try {
            await createOrganization({ name, description: desc });
            setIsOpen(false);
            setName("");
            setDesc("");
            load();
        } catch (e) {
            alert("Failed to create organization");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this organization? This will unlink all scripts.")) return;
        await deleteOrganization(id);
        load();
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>組織管理 (Organizations)</CardTitle>
                        <CardDescription>建立組織以管理團隊成員與協作劇本。</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setIsOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> 建立組織
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : orgs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">尚未建立任何組織</div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {orgs.map(org => (
                            <div key={org.id} className="flex items-start justify-between p-4 border rounded-lg bg-card">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{org.name}</div>
                                        <div className="text-xs text-muted-foreground line-clamp-1">{org.description || "No description"}</div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(org.id)} className="text-destructive hover:text-destructive/90">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>建立新組織</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>組織名稱</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 某某工作室" />
                        </div>
                        <div className="grid gap-2">
                            <Label>描述</Label>
                            <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="關於這個組織..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>取消</Button>
                        <Button onClick={handleCreate} disabled={isCreating || !name}>建立</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
