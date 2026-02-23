import React from "react";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { useI18n } from "../../../contexts/I18nContext";

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
    synopsis, setSynopsis,
    requiredErrors = {},
    recommendedErrors = {}
}) {
    const { t } = useI18n();
    return (
        <div className="space-y-4 h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="metadata-title">{t("metadataBasic.title")}</label>
                    <Input id="metadata-title" name="metadataTitle" value={title} onChange={e => setTitle(e.target.value)} placeholder={t("metadataBasic.titlePlaceholder")} />
                    {requiredErrors.title && (
                        <p className="text-xs text-destructive">{t("metadataBasic.errTitle")}</p>
                    )}
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium">{t("metadataBasic.identity")}</label>
                    <Select value={identity} onValueChange={setIdentity}>
                        <SelectTrigger id="metadata-identity-trigger">
                            <SelectValue placeholder={t("metadataBasic.identityPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            {personas.length > 0 && (
                                <SelectGroup>
                                    <SelectLabel>{t("metadataBasic.personaGroup")}</SelectLabel>
                                    {personas.map(p => (
                                        <SelectItem key={p.id} value={`persona:${p.id}`}>{p.displayName}</SelectItem>
                                    ))}
                                </SelectGroup>
                            )}
                        </SelectContent>
                    </Select>
                    {requiredErrors.identity && (
                        <p className="text-xs text-destructive">{t("metadataBasic.errIdentity")}</p>
                    )}
                </div>
            </div>
            
            {identity.startsWith("persona:") && (
                <div className="grid gap-2">
                    <label className="text-sm font-medium">{t("metadataBasic.org")}</label>
                    <Select value={selectedOrgId || "none"} onValueChange={(val) => setSelectedOrgId(val === "none" ? "" : val)}>
                        <SelectTrigger>
                            <SelectValue placeholder={t("common.none")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">{t("common.none")}</SelectItem>
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
                    <label className="text-sm font-medium">{t("metadataBasic.status")}</label>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                            <SelectValue placeholder={t("metadataBasic.statusPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Private">{t("metadataBasic.private")}</SelectItem>
                            <SelectItem value="Public">{t("metadataBasic.public")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="metadata-date">{t("metadataBasic.date")}</label>
                    <Input id="metadata-date" name="metadataDate" value={date} onChange={e => setDate(e.target.value)} placeholder={t("metadataBasic.datePlaceholder")} />
                </div>
            </div>
            
            <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="metadata-source">{t("metadataBasic.source")}</label>
                <Input id="metadata-source" name="metadataSource" value={source} onChange={e => setSource(e.target.value)} placeholder={t("metadataBasic.sourcePlaceholder")} />
            </div>

            <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="metadata-synopsis">{t("metadataBasic.synopsis")}</label>
                <Textarea
                    id="metadata-synopsis"
                    name="metadataSynopsis"
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    placeholder={t("metadataBasic.synopsisPlaceholder")}
                    className="h-32"
                />
                {recommendedErrors.synopsis && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">{t("metadataBasic.tipSynopsis")}</p>
                )}
            </div>
        </div>
    );
}
