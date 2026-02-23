
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
import { useI18n } from "../../contexts/I18nContext";

export function ProfileTab() {
    return (
        <div className="container mx-auto max-w-4xl py-6 space-y-8">
            <PersonaManager />
            <OrganizationManager />
        </div>
    );
}

function PersonaManager() {
    const { t } = useI18n();
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
            alert(t("profileTab.alertCreatePersonaFailed"));
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t("profileTab.confirmDeletePersona"))) return;
        await deletePersona(id);
        load();
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{t("profileTab.personaTitle")}</CardTitle>
                        <CardDescription>{t("profileTab.personaDescription")}</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setIsOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> {t("profileTab.addPersona")}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : personas.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">{t("profileTab.noPersona")}</div>
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
                                        <div className="text-xs text-muted-foreground line-clamp-1">{p.bio || t("profileTab.noBio")}</div>
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
                        <DialogTitle>{t("profileTab.addPersonaTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{t("profileTab.displayName")}</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("profileTab.displayNamePlaceholder")} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t("profileTab.bio")}</Label>
                            <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder={t("profileTab.bioPlaceholder")} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>{t("common.cancel")}</Button>
                        <Button onClick={handleCreate} disabled={isCreating || !name}>{t("profileTab.create")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function OrganizationManager() {
    const { t } = useI18n();
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
            alert(t("profileTab.alertCreateOrgFailed"));
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t("profileTab.confirmDeleteOrg"))) return;
        await deleteOrganization(id);
        load();
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{t("profileTab.organizationTitle")}</CardTitle>
                        <CardDescription>{t("profileTab.organizationDescription")}</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setIsOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> {t("profileTab.createOrganization")}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : orgs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">{t("profileTab.noOrganization")}</div>
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
                                        <div className="text-xs text-muted-foreground line-clamp-1">{org.description || t("profileTab.noDescription")}</div>
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
                        <DialogTitle>{t("profileTab.createOrganizationTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{t("profileTab.organizationName")}</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("profileTab.organizationNamePlaceholder")} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t("profileTab.description")}</Label>
                            <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder={t("profileTab.descriptionPlaceholder")} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>{t("common.cancel")}</Button>
                        <Button onClick={handleCreate} disabled={isCreating || !name}>{t("profileTab.create")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
