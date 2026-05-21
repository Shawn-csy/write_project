import React from "react";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { useI18n } from "../../../contexts/I18nContext";
import { Button } from "../../ui/button";
import { Globe2, Lock } from "lucide-react";
import { MetadataExtendedFields } from "./MetadataExtendedFields";

interface PersonaOption {
    id: string;
    displayName?: string;
    organizationIds?: string[];
    __fallback?: boolean;
}

interface OrgOption {
    id: string;
    name: string;
}

type RowTone = "required" | "recommended" | "advanced";

interface MetadataBasicTabProps {
    title: string;
    setTitle: (value: string) => void;
    identity: string;
    setIdentity: (value: string) => void;
    identityDisplayName?: string;
    currentUser?: { uid?: string } | null;
    personas: PersonaOption[];
    orgs: OrgOption[];
    selectedOrgId: string;
    setSelectedOrgId: (value: string) => void;
    status: string;
    setStatus: (value: string) => void;
    date: string;
    setDate: (value: string) => void;
    synopsis: string;
    setSynopsis: (value: string) => void;
    outline?: string;
    setOutline: (value: string) => void;
    roleSetting?: string;
    setRoleSetting?: (value: string) => void;
    backgroundInfo?: string;
    setBackgroundInfo: (value: string) => void;
    performanceInstruction?: string;
    setPerformanceInstruction?: (value: string) => void;
    openingIntro?: string;
    setOpeningIntro: (value: string) => void;
    chapterSettings?: string;
    setChapterSettings?: (value: string) => void;
    requiredErrors?: Record<string, string | boolean | undefined>;
    recommendedErrors?: Record<string, string | boolean | undefined>;
    layout?: "cards" | "rows";
    requiredHighlights?: Record<string, boolean | undefined>;
    rowLabelTones?: Record<string, RowTone | undefined>;
}

export function MetadataBasicTab({
    title, setTitle,
    identity, setIdentity,
    identityDisplayName = "",
    personas,
    orgs,
    selectedOrgId, setSelectedOrgId,
    status, setStatus,
    date, setDate,
    synopsis, setSynopsis,
    outline = "", setOutline,
    roleSetting = "", setRoleSetting,
    backgroundInfo = "", setBackgroundInfo,
    performanceInstruction = "", setPerformanceInstruction,
    openingIntro = "", setOpeningIntro,
    chapterSettings = "", setChapterSettings,
    requiredErrors = {},
    recommendedErrors = {},
    layout = "cards",
    requiredHighlights = {},
    rowLabelTones = {}
}: MetadataBasicTabProps): React.JSX.Element {
    const { t } = useI18n();
    const isRowLayout = layout === "rows";
    const panelClass = "grid gap-3 rounded-xl border border-border/70 bg-background p-4 shadow-sm";
    const rowLabelBaseClass = "p-4 text-sm font-medium text-foreground";
    const rowLabelToneClass = {
        required: "border-l-[5px] border-primary bg-primary/12 text-primary dark:bg-primary/20 dark:text-foreground",
        recommended: "border-l-[5px] border-[color:var(--license-term-border)] bg-[color:var(--license-term-bg)] text-[color:var(--license-term-fg)]",
        advanced: "border-l-[5px] border-muted-foreground/50 bg-muted/35 text-foreground dark:bg-muted/45 dark:text-foreground",
    };
    const getRowLabelClass = (tone: RowTone = "recommended", missing = false) =>
        `${rowLabelBaseClass} ${rowLabelToneClass[tone] || rowLabelToneClass.recommended} ${
            missing ? "border-l-[6px] border-destructive bg-destructive/20 ring-2 ring-inset ring-destructive/55 dark:bg-destructive/30" : ""
        }`;
    const renderRowLabel = (label: string, tone: RowTone = "recommended", missing = false) => (
        <div className={getRowLabelClass(tone, missing)}>
            <div className="flex items-center gap-2">
                <span>{label}</span>
                {missing && (
                    <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-destructive-foreground">
                        必填未完成
                    </span>
                )}
            </div>
        </div>
    );
    const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
    const isPublicStatus = status === "Public";
    const safePersonas = React.useMemo(() => (Array.isArray(personas) ? personas : []), [personas]);
    const identityPersonaId = React.useMemo(
        () => (identity && identity.startsWith("persona:") ? identity.split(":")[1] : ""),
        [identity]
    );
    const selectedPersona = React.useMemo(
        () => safePersonas.find((item) => item.id === identityPersonaId),
        [safePersonas, identityPersonaId]
    );
    const identityOptions = React.useMemo(() => {
        if (!identityPersonaId || selectedPersona) return safePersonas;
        return [
            { id: identityPersonaId, displayName: String(identityDisplayName || "").trim() || t("metadataBasic.currentIdentityFallback", "目前作品身分"), organizationIds: [], __fallback: true },
            ...safePersonas,
        ];
    }, [identityDisplayName, identityPersonaId, selectedPersona, safePersonas, t]);

    const statusButtonClass = (active: boolean, type: "public" | "private") =>
        `flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-all ${
            active
                ? type === "public"
                    ? "border-emerald-600/60 bg-emerald-500/15 text-emerald-800 ring-2 ring-emerald-500/40 dark:text-emerald-300"
                    : "border-slate-600/60 bg-slate-500/15 text-slate-800 ring-2 ring-slate-500/40 dark:text-slate-200"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
        }`;

    const identitySelect = (
        <Select value={identity || "none"} onValueChange={(val) => setIdentity(val === "none" ? "" : val)}>
            <SelectTrigger id="metadata-identity-trigger">
                <SelectValue placeholder={t("metadataBasic.identityPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none">{t("common.none", "不指定")}</SelectItem>
                {identityOptions.length > 0 && (
                    <SelectGroup>
                        <SelectLabel>{t("metadataBasic.personaGroup")}</SelectLabel>
                        {identityOptions.map((p) => (
                            <SelectItem key={p.id} value={`persona:${p.id}`}>
                                {p.__fallback ? `${p.displayName}` : (p.displayName || p.id)}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}
            </SelectContent>
        </Select>
    );

    const orgSelect = identity.startsWith("persona:") ? (
        <Select value={selectedOrgId || "none"} onValueChange={(val) => setSelectedOrgId(val === "none" ? "" : val)}>
            <SelectTrigger><SelectValue placeholder={t("common.none")} /></SelectTrigger>
            <SelectContent>
                <SelectItem value="none">{t("common.none")}</SelectItem>
                {(() => {
                    const personaId = identity.split(":")[1];
                    const persona = safePersonas.find(p => p.id === personaId);
                    return (orgs).filter(o => (persona?.organizationIds || []).includes(o.id)).map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ));
                })()}
            </SelectContent>
        </Select>
    ) : null;

    const statusButtons = (
        <div className="grid grid-cols-2 gap-2">
            <button type="button" className={statusButtonClass(status === "Private", "private")} onClick={() => setStatus("Private")}>
                <Lock className="h-4 w-4 shrink-0" /><span>{t("metadataBasic.private")}</span>
            </button>
            <button type="button" className={statusButtonClass(status === "Public", "public")} onClick={() => setStatus("Public")}>
                <Globe2 className="h-4 w-4 shrink-0" /><span>{t("metadataBasic.public")}</span>
            </button>
        </div>
    );

    const statusHint = (
        <p className={`rounded-md px-2 py-1 text-xs ${isPublicStatus ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-slate-500/10 text-slate-700 dark:text-slate-300"}`}>
            {isPublicStatus ? t("metadataBasic.statusPublicHint", "目前為公開狀態，會顯示在公開台本。") : t("metadataBasic.statusPrivateHint", "目前為私有狀態，只有你可見。")}
        </p>
    );

    return (
        <div className="space-y-5 h-full">
            <div>
                <div className="text-sm font-semibold text-foreground">公開頁主資訊</div>
                <p className="mt-1 text-xs text-muted-foreground">這些內容會影響公開頁標題、作者身分、簡介與發布狀態。</p>
            </div>
            {isRowLayout ? (
                <div className="rounded-xl border border-border/70 bg-background shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                        {renderRowLabel(t("metadataBasic.title"), rowLabelTones.title || "required", Boolean(requiredHighlights.title))}
                        <div className="space-y-2 p-4">
                            <Input id="metadata-title" name="metadataTitle" value={title} onChange={e => setTitle(e.target.value)} placeholder={t("metadataBasic.titlePlaceholder")} />
                            {requiredErrors.title && <p className="text-xs text-destructive">{t("metadataBasic.errTitle")}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                        {renderRowLabel(t("metadataBasic.identity"), rowLabelTones.identity || "required", Boolean(requiredHighlights.identity))}
                        <div className="space-y-2 p-4">
                            {identitySelect}
                            {requiredErrors.identity && <p className="text-xs text-destructive">{t("metadataBasic.errIdentity")}</p>}
                            {orgSelect}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                        {renderRowLabel(t("metadataBasic.status"), rowLabelTones.status || "required", Boolean(requiredHighlights.status))}
                        <div className="grid gap-2 p-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                {statusButtons}
                                {statusHint}
                            </div>
                            <div className="space-y-1">
                                <Input id="metadata-date" name="metadataDate" type="date" value={date} onChange={e => setDate(e.target.value)} />
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDate(today)}>今天</Button>
                                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDate("")}>清空</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                        {renderRowLabel(t("metadataBasic.synopsis"), rowLabelTones.synopsis || "recommended", Boolean(requiredHighlights.synopsis))}
                        <div className="space-y-2 p-4">
                            <Textarea id="metadata-synopsis" name="metadataSynopsis" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder={t("metadataBasic.synopsisPlaceholder")} className="h-32" />
                            {recommendedErrors.synopsis && <p className="text-xs text-[color:var(--license-term-fg)]">{t("metadataBasic.tipSynopsis")}</p>}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className={panelClass}>
                        <label className="text-sm font-medium" htmlFor="metadata-title">{t("metadataBasic.title")}</label>
                        <Input id="metadata-title" name="metadataTitle" value={title} onChange={e => setTitle(e.target.value)} placeholder={t("metadataBasic.titlePlaceholder")} />
                        {requiredErrors.title && <p className="text-xs text-destructive">{t("metadataBasic.errTitle")}</p>}
                        <label className="text-sm font-medium">{t("metadataBasic.identity")}</label>
                        {identitySelect}
                        {requiredErrors.identity && <p className="text-xs text-destructive">{t("metadataBasic.errIdentity")}</p>}
                        {identity.startsWith("persona:") && (
                            <>
                                <label className="text-sm font-medium">{t("metadataBasic.org")}</label>
                                {orgSelect}
                            </>
                        )}
                    </div>
                    <div className={panelClass}>
                        <label className="text-sm font-medium">{t("metadataBasic.status")}</label>
                        {statusButtons}
                        {statusHint}
                        <label className="text-sm font-medium" htmlFor="metadata-date">{t("metadataBasic.date")}</label>
                        <Input id="metadata-date" name="metadataDate" type="date" value={date} onChange={e => setDate(e.target.value)} />
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDate(today)}>今天</Button>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDate("")}>清空</Button>
                        </div>
                    </div>
                    <div className="grid gap-2 rounded-xl border border-border/70 bg-background p-4 shadow-sm">
                        <label className="text-sm font-medium" htmlFor="metadata-synopsis">{t("metadataBasic.synopsis")}</label>
                        <Textarea id="metadata-synopsis" name="metadataSynopsis" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder={t("metadataBasic.synopsisPlaceholder")} className="h-40" />
                        {recommendedErrors.synopsis && <p className="text-xs text-[color:var(--license-term-fg)]">{t("metadataBasic.tipSynopsis")}</p>}
                    </div>
                </div>
            )}

            <div className="border-t border-border/70 pt-4">
                <div className="text-sm font-semibold text-foreground">劇本前置內容</div>
                <p className="mt-1 text-xs text-muted-foreground">選填內容，公開頁會收合在前置資訊區，讀者可展開查看。</p>
            </div>
            <MetadataExtendedFields
                layout={layout}
                outline={outline} setOutline={setOutline}
                roleSetting={roleSetting} setRoleSetting={setRoleSetting}
                performanceInstruction={performanceInstruction} setPerformanceInstruction={setPerformanceInstruction}
                backgroundInfo={backgroundInfo} setBackgroundInfo={setBackgroundInfo}
                openingIntro={openingIntro} setOpeningIntro={setOpeningIntro}
                chapterSettings={chapterSettings} setChapterSettings={setChapterSettings}
                rowLabelTones={rowLabelTones}
                getRowLabelClass={getRowLabelClass}
            />
        </div>
    );
}
