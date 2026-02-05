import React from "react";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";

export function MetadataBasicTab({
    title, setTitle,
    identity, setIdentity,
    currentUser,
    personas,
    orgs,
    selectedOrgId, setSelectedOrgId,
    status, setStatus,
    date, setDate,
    source, setSource,
    synopsis, setSynopsis
}) {
    return (
        <div className="space-y-4 h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <label className="text-sm font-medium">標題 (Title)</label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="劇本標題" />
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium">發布身分 (Publish As)</label>
                    <Select value={identity} onValueChange={setIdentity}>
                        <SelectTrigger>
                            <SelectValue placeholder="選擇身分" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="user">{currentUser?.displayName || "個人 (Me)"}</SelectItem>
                            {personas.length > 0 && (
                                <SelectGroup>
                                    <SelectLabel>作者身分 (Personas)</SelectLabel>
                                    {personas.map(p => (
                                        <SelectItem key={p.id} value={`persona:${p.id}`}>{p.displayName}</SelectItem>
                                    ))}
                                </SelectGroup>
                            )}
                            {orgs.length > 0 && (
                                <SelectGroup>
                                    <SelectLabel>組織 (Organizations)</SelectLabel>
                                    {orgs.map(o => (
                                        <SelectItem key={o.id} value={`org:${o.id}`}>{o.name}</SelectItem>
                                    ))}
                                </SelectGroup>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            {identity.startsWith("persona:") && (
                <div className="grid gap-2">
                    <label className="text-sm font-medium">所屬組織 (From Persona)</label>
                    <Select value={selectedOrgId || "none"} onValueChange={(val) => setSelectedOrgId(val === "none" ? "" : val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="不選擇" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">不選擇</SelectItem>
                            {(() => {
                                const personaId = identity.split(":")[1];
                                const persona = personas.find(p => p.id === personaId);
                                const orgIds = persona?.organizationIds || [];
                                return orgs
                                    .filter(o => orgIds.includes(o.id))
                                    .map(o => (
                                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                    ));
                            })()}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="grid gap-2">
                    <label className="text-sm font-medium">發布狀態</label>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                            <SelectValue placeholder="選擇狀態" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Private">私有 (Private)</SelectItem>
                            <SelectItem value="Public">公開 (Public)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid gap-2">
                    <label className="text-sm font-medium">日期 (Date)</label>
                    <Input value={date} onChange={e => setDate(e.target.value)} placeholder="e.g. 2024-01-01 or Draft 1" />
                </div>
            </div>
            
            <div className="grid gap-2">
                <label className="text-sm font-medium">來源 (Source)</label>
                <Input value={source} onChange={e => setSource(e.target.value)} placeholder="改編來源或其他" />
            </div>

            <div className="grid gap-2">
                <label className="text-sm font-medium">簡介 (Synopsis)</label>
                <Textarea
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    placeholder="劇本的簡介或摘要..."
                    className="h-32"
                />
            </div>
        </div>
    );
}
