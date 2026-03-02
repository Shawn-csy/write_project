import React from "react";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { useI18n } from "../../../contexts/I18nContext";
import { Button } from "../../ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

export function MetadataBasicTab({
    title, setTitle,
    identity, setIdentity,
    currentUser,
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
    environmentInfo = "", setEnvironmentInfo,
    situationInfo = "", setSituationInfo,
    requiredErrors = {},
    recommendedErrors = {},
    layout = "cards",
    requiredHighlights = {},
    rowLabelTones = {}
}) {
    const { t } = useI18n();
    const isRowLayout = layout === "rows";
    const panelClass = "grid gap-3 rounded-xl border border-border/70 bg-background p-4 shadow-sm";
    const rowLabelBaseClass = "p-4 text-sm font-medium text-foreground";
    const rowLabelToneClass = {
        required: "border-l-4 border-sky-500/50 bg-sky-50/40 dark:bg-sky-950/20",
        recommended: "border-l-4 border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/20",
        advanced: "border-l-4 border-fuchsia-500/50 bg-fuchsia-50/40 dark:bg-fuchsia-950/20",
    };
    const getRowLabelClass = (tone = "recommended", missing = false) =>
        `${rowLabelBaseClass} ${rowLabelToneClass[tone] || rowLabelToneClass.recommended} ${
            missing ? "border-l-[6px] border-destructive bg-destructive/20 ring-2 ring-inset ring-destructive/55 dark:bg-destructive/30" : ""
        }`;
    const renderRowLabel = (label, tone = "recommended", missing = false) => (
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
    const [showExtendedFields, setShowExtendedFields] = React.useState(false);
    const [heroEntries, setHeroEntries] = React.useState([
        { id: "hero-1", name: "", role: "", performance: "" }
    ]);
    const internalSyncRef = React.useRef(false);

    const parseMulti = React.useCallback((raw) => {
        try {
            const parsed = JSON.parse(String(raw || ""));
            if (parsed?.mode !== "multi" || !Array.isArray(parsed.items)) return null;
            return parsed.items.map((item, idx) => ({
                id: `hero-${idx + 1}`,
                name: String(item?.name || ""),
                text: String(item?.text || ""),
            }));
        } catch {
            return null;
        }
    }, []);

    React.useEffect(() => {
        if (internalSyncRef.current) {
            internalSyncRef.current = false;
            return;
        }
        const roleItems = parseMulti(roleSetting);
        const performanceItems = parseMulti(performanceInstruction);
        const next = roleItems || performanceItems
            ? Array.from({ length: Math.max(1, roleItems?.length || 0, performanceItems?.length || 0) }).map((_, idx) => ({
                id: `hero-${idx + 1}`,
                name: roleItems?.[idx]?.name || performanceItems?.[idx]?.name || "",
                role: roleItems?.[idx]?.text || "",
                performance: performanceItems?.[idx]?.text || "",
            }))
            : [{
                id: "hero-1",
                name: "",
                role: String(roleSetting || ""),
                performance: String(performanceInstruction || ""),
            }];
        const prevKey = JSON.stringify(heroEntries.map(({ name, role, performance }) => ({ name, role, performance })));
        const nextKey = JSON.stringify(next.map(({ name, role, performance }) => ({ name, role, performance })));
        if (prevKey !== nextKey) setHeroEntries(next);
    }, [roleSetting, performanceInstruction, parseMulti, heroEntries]);

    React.useEffect(() => {
        const compact = heroEntries.filter((item) => item.name.trim() || item.role.trim() || item.performance.trim());
        const normalized = compact.length > 0 ? compact : heroEntries;
        if (normalized.length <= 1 && !String(normalized[0]?.name || "").trim()) {
            const nextRole = String(normalized[0]?.role || "");
            const nextPerformance = String(normalized[0]?.performance || "");
            if (nextRole !== String(roleSetting || "")) setRoleSetting?.(nextRole);
            if (nextPerformance !== String(performanceInstruction || "")) setPerformanceInstruction?.(nextPerformance);
            return;
        }
        const roleItemsPayload = normalized.map((item) => ({
            name: item.name.trim(),
            text: item.role,
        }));
        const perfItemsPayload = normalized.map((item) => ({
            name: item.name.trim(),
            text: item.performance,
        }));
        const nextRole = JSON.stringify({ mode: "multi", items: roleItemsPayload });
        const nextPerformance = JSON.stringify({ mode: "multi", items: perfItemsPayload });
        if (nextRole !== String(roleSetting || "")) {
            internalSyncRef.current = true;
            setRoleSetting?.(nextRole);
        }
        if (nextPerformance !== String(performanceInstruction || "")) {
            internalSyncRef.current = true;
            setPerformanceInstruction?.(nextPerformance);
        }
    }, [heroEntries, setRoleSetting, setPerformanceInstruction, roleSetting, performanceInstruction]);

    const addHeroEntry = () => {
        setHeroEntries((prev) => [
            ...prev,
            { id: `hero-${Date.now()}-${prev.length + 1}`, name: "", role: "", performance: "" }
        ]);
    };

    const updateHeroEntry = (idx, field, value) => {
        setHeroEntries((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
    };

    const removeHeroEntry = (idx) => {
        setHeroEntries((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
    };

    return (
        <div className="space-y-5 h-full">
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
                            {requiredErrors.identity && <p className="text-xs text-destructive">{t("metadataBasic.errIdentity")}</p>}
                            {identity.startsWith("persona:") && (
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
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                        {renderRowLabel(t("metadataBasic.status"), rowLabelTones.status || "required", Boolean(requiredHighlights.status))}
                        <div className="grid gap-2 p-4 sm:grid-cols-2">
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("metadataBasic.statusPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Private">{t("metadataBasic.private")}</SelectItem>
                                    <SelectItem value="Public">{t("metadataBasic.public")}</SelectItem>
                                </SelectContent>
                            </Select>
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
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className={panelClass}>
                        <label className="text-sm font-medium" htmlFor="metadata-title">{t("metadataBasic.title")}</label>
                        <Input id="metadata-title" name="metadataTitle" value={title} onChange={e => setTitle(e.target.value)} placeholder={t("metadataBasic.titlePlaceholder")} />
                        {requiredErrors.title && (
                            <p className="text-xs text-destructive">{t("metadataBasic.errTitle")}</p>
                        )}
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
                        {identity.startsWith("persona:") && (
                            <>
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
                            </>
                        )}
                    </div>

                    <div className={panelClass}>
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
                        <label className="text-sm font-medium" htmlFor="metadata-date">{t("metadataBasic.date")}</label>
                        <Input id="metadata-date" name="metadataDate" type="date" value={date} onChange={e => setDate(e.target.value)} />
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDate(today)}>今天</Button>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDate("")}>清空</Button>
                        </div>
                    </div>

                    <div className="grid gap-2 rounded-xl border border-border/70 bg-background p-4 shadow-sm">
                        <label className="text-sm font-medium" htmlFor="metadata-synopsis">{t("metadataBasic.synopsis")}</label>
                        <Textarea
                            id="metadata-synopsis"
                            name="metadataSynopsis"
                            value={synopsis}
                            onChange={(e) => setSynopsis(e.target.value)}
                            placeholder={t("metadataBasic.synopsisPlaceholder")}
                            className="h-40"
                        />
                        {recommendedErrors.synopsis && (
                            <p className="text-xs text-amber-700 dark:text-amber-300">{t("metadataBasic.tipSynopsis")}</p>
                        )}
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-border/70 bg-background p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <p className="text-sm font-medium">進階內容欄位</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowExtendedFields((prev) => !prev)}>
                        {showExtendedFields ? (
                            <>
                                收合 <ChevronUp className="ml-1 h-4 w-4" />
                            </>
                        ) : (
                            <>
                                展開 <ChevronDown className="ml-1 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
                {showExtendedFields && (
                    isRowLayout ? (
                        <div className="mt-3 rounded-lg border border-border/70 bg-background">
                            <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                <div className={getRowLabelClass(rowLabelTones.outline || "advanced")}>{t("metadataBasic.outline", "大綱")}</div>
                                <div className="p-4">
                                    <Textarea
                                        id="metadata-outline"
                                        name="metadataOutline"
                                        value={outline}
                                        onChange={(e) => setOutline?.(e.target.value)}
                                        placeholder={t("metadataBasic.outlinePlaceholder", "作品核心內容大綱")}
                                        className="h-28"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                <div className={getRowLabelClass(rowLabelTones.roleSetting || "advanced")}>角色設定</div>
                                <div className="space-y-3 p-4">
                                    <div className="flex justify-end">
                                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addHeroEntry}>
                                            新增主角
                                        </Button>
                                    </div>
                                    {heroEntries.map((entry, idx) => (
                                        <div key={entry.id} className="rounded-lg border border-border/70 bg-background p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">角色設定 角色{idx + 1}</div>
                                                <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => removeHeroEntry(idx)}>
                                                    移除
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div className="grid gap-2 sm:col-span-2">
                                                    <label className="text-xs text-muted-foreground">角色名稱</label>
                                                    <Input
                                                        value={entry.name}
                                                        onChange={(e) => updateHeroEntry(idx, "name", e.target.value)}
                                                        placeholder="例如：林默、陳安"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <label className="text-xs text-muted-foreground">角色設定</label>
                                                    <Textarea
                                                        value={entry.role}
                                                        onChange={(e) => updateHeroEntry(idx, "role", e.target.value)}
                                                        placeholder={t("metadataBasic.roleSettingPlaceholder", "角色關係、定位與演出重點")}
                                                        className="h-24"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <label className="text-xs text-muted-foreground">演繹指示</label>
                                                    <Textarea
                                                        value={entry.performance}
                                                        onChange={(e) => updateHeroEntry(idx, "performance", e.target.value)}
                                                        placeholder={t("metadataBasic.performanceInstructionPlaceholder", "節奏、口氣、情緒與鏡位指示")}
                                                        className="h-24"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                <div className={getRowLabelClass(rowLabelTones.backgroundInfo || "advanced")}>{t("metadataBasic.backgroundInfo", "背景資訊")}</div>
                                <div className="p-4">
                                    <Textarea
                                        id="metadata-background-info"
                                        name="metadataBackgroundInfo"
                                        value={backgroundInfo}
                                        onChange={(e) => setBackgroundInfo?.(e.target.value)}
                                        placeholder={t("metadataBasic.backgroundInfoPlaceholder", "時代、前情提要、世界觀背景")}
                                        className="h-28"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                <div className={getRowLabelClass(rowLabelTones.openingIntro || "advanced")}>{t("metadataBasic.openingIntro", "作品的開頭引言")}</div>
                                <div className="p-4">
                                    <Textarea
                                        id="metadata-opening-intro"
                                        name="metadataOpeningIntro"
                                        value={openingIntro}
                                        onChange={(e) => setOpeningIntro?.(e.target.value)}
                                        placeholder={t("metadataBasic.openingIntroPlaceholder", "給讀者的開場引言")}
                                        className="h-28"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                <div className={getRowLabelClass(rowLabelTones.environmentInfo || "advanced")}>{t("metadataBasic.environmentInfo", "環境")}</div>
                                <div className="p-4">
                                    <Textarea
                                        id="metadata-environment-info"
                                        name="metadataEnvironmentInfo"
                                        value={environmentInfo}
                                        onChange={(e) => setEnvironmentInfo?.(e.target.value)}
                                        placeholder={t("metadataBasic.environmentInfoPlaceholder", "場景空間、氣候、聲音、光線")}
                                        className="h-28"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                                <div className={getRowLabelClass(rowLabelTones.situationInfo || "advanced")}>{t("metadataBasic.situationInfo", "狀況")}</div>
                                <div className="p-4">
                                    <Textarea
                                        id="metadata-situation-info"
                                        name="metadataSituationInfo"
                                        value={situationInfo}
                                        onChange={(e) => setSituationInfo?.(e.target.value)}
                                        placeholder={t("metadataBasic.situationInfoPlaceholder", "開場時角色所處的當前狀況")}
                                        className="h-28"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" htmlFor="metadata-outline">{t("metadataBasic.outline", "大綱")}</label>
                                <Textarea
                                    id="metadata-outline"
                                    name="metadataOutline"
                                    value={outline}
                                    onChange={(e) => setOutline?.(e.target.value)}
                                    placeholder={t("metadataBasic.outlinePlaceholder", "作品核心內容大綱")}
                                    className="h-28"
                                />
                            </div>
                            <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/10 p-3 sm:col-span-2">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-sm font-medium">角色設定</label>
                                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addHeroEntry}>
                                        新增主角
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {heroEntries.map((entry, idx) => (
                                        <div key={entry.id} className="rounded-lg border border-border/70 bg-background p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">角色設定 角色{idx + 1}</div>
                                                <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => removeHeroEntry(idx)}>
                                                    移除
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div className="grid gap-2 sm:col-span-2">
                                                    <label className="text-xs text-muted-foreground">角色名稱</label>
                                                    <Input
                                                        value={entry.name}
                                                        onChange={(e) => updateHeroEntry(idx, "name", e.target.value)}
                                                        placeholder="例如：林默、陳安"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <label className="text-xs text-muted-foreground">角色設定</label>
                                                    <Textarea
                                                        value={entry.role}
                                                        onChange={(e) => updateHeroEntry(idx, "role", e.target.value)}
                                                        placeholder={t("metadataBasic.roleSettingPlaceholder", "角色關係、定位與演出重點")}
                                                        className="h-24"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <label className="text-xs text-muted-foreground">演繹指示</label>
                                                    <Textarea
                                                        value={entry.performance}
                                                        onChange={(e) => updateHeroEntry(idx, "performance", e.target.value)}
                                                        placeholder={t("metadataBasic.performanceInstructionPlaceholder", "節奏、口氣、情緒與鏡位指示")}
                                                        className="h-24"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" htmlFor="metadata-background-info">{t("metadataBasic.backgroundInfo", "背景資訊")}</label>
                                <Textarea
                                    id="metadata-background-info"
                                    name="metadataBackgroundInfo"
                                    value={backgroundInfo}
                                    onChange={(e) => setBackgroundInfo?.(e.target.value)}
                                    placeholder={t("metadataBasic.backgroundInfoPlaceholder", "時代、前情提要、世界觀背景")}
                                    className="h-28"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" htmlFor="metadata-opening-intro">{t("metadataBasic.openingIntro", "作品的開頭引言")}</label>
                                <Textarea
                                    id="metadata-opening-intro"
                                    name="metadataOpeningIntro"
                                    value={openingIntro}
                                    onChange={(e) => setOpeningIntro?.(e.target.value)}
                                    placeholder={t("metadataBasic.openingIntroPlaceholder", "給讀者的開場引言")}
                                    className="h-28"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" htmlFor="metadata-environment-info">{t("metadataBasic.environmentInfo", "環境")}</label>
                                <Textarea
                                    id="metadata-environment-info"
                                    name="metadataEnvironmentInfo"
                                    value={environmentInfo}
                                    onChange={(e) => setEnvironmentInfo?.(e.target.value)}
                                    placeholder={t("metadataBasic.environmentInfoPlaceholder", "場景空間、氣候、聲音、光線")}
                                    className="h-28"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" htmlFor="metadata-situation-info">{t("metadataBasic.situationInfo", "狀況")}</label>
                                <Textarea
                                    id="metadata-situation-info"
                                    name="metadataSituationInfo"
                                    value={situationInfo}
                                    onChange={(e) => setSituationInfo?.(e.target.value)}
                                    placeholder={t("metadataBasic.situationInfoPlaceholder", "開場時角色所處的當前狀況")}
                                    className="h-28"
                                />
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
