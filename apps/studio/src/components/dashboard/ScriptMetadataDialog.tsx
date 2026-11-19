import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2, Circle, Eye, FilePenLine, Loader2, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { ScriptMetadataDialogProvider, ScriptMetadataDialogProps, useFormContext, useUIContext, useStatusContext, useChecklistContext } from "./metadata/ScriptMetadataDialogContext";
import { StatusPill } from "../studio/StatusPill";
import { useStudioShell } from "../studio/StudioShellContext";
import { cn } from "../../lib/utils";
import { ScriptMetadataDialogHeader } from "./metadata/ScriptMetadataDialogHeader";
import { ScriptMetadataDialogBody } from "./metadata/ScriptMetadataDialogBody";
import { METADATA_SECTIONS } from "./metadata/metadataSections";
import { ScriptMetadataDialogOverlays } from "./metadata/ScriptMetadataDialogOverlays";
import { PublicReaderLayout } from "../reader/PublicReaderLayout";
import { buildPrefaceItemsFromSections, buildPublicReaderProjection } from "../../lib/publicReaderProjection";
import { useReaderPreferences } from "../../hooks/useReaderPreferences";
import { useSettings } from "../../contexts/SettingsContext";
import { getScript } from "../../lib/api/scripts";
import { getPublicThemes } from "../../lib/api/public";
import { normalizeMarkerConfigsSchema } from "../../lib/markerThemeCodec";
import { defaultMarkerConfigs } from "../../constants/defaultMarkerRules";

export { buildPublishChecklist } from "./metadata/ScriptMetadataDialogContext";

export const ACTIVE_TAB_TO_SECTION = Object.freeze({
    basic: "basic",
    publish: "publish",
    exposure: "exposure",
    activity: "activity",
    demo: "demo",
    advanced: "advanced",
});

export const CHECKLIST_ITEM_TO_SECTION = Object.freeze({
    title: "basic",
    identity: "basic",
    audience: "publish",
    rating: "publish",
    license: "publish",
    cover: "exposure",
    synopsis: "basic",
    tags: "exposure",
});

export function getCollapsedSectionsAfterTabSync(
    collapsedSections: Record<string, boolean>,
    activeTab: string,
    shouldExpand: boolean
) {
    if (!shouldExpand) return collapsedSections;
    const target = ACTIVE_TAB_TO_SECTION[activeTab as keyof typeof ACTIVE_TAB_TO_SECTION];
    if (!target) return collapsedSections;
    if (!collapsedSections[target]) return collapsedSections;
    return { ...collapsedSections, [target]: false };
}

const VIEWPORT_OPTIONS = [
    { value: "desktop" as const, label: "桌機" },
    { value: "mobile" as const, label: "手機" },
];

function ScriptMetadataPreviewDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
    const { t } = useUIContext();
    const {
        title,
        previewContent: previewContentFromContext,
        previewScriptId,
        synopsis,
        outline,
        roleSetting,
        backgroundInfo,
        performanceInstruction,
        openingIntro,
        chapterSettings,
        coverUrl,
        author,
        authorDisplayMode,
        identity,
        personas,
        orgs,
        selectedOrgId,
        currentTags,
        contactFields,
        customFields,
        targetAudience,
        contentRating,
        licenseCommercial,
        licenseDerivative,
        licenseNotify,
        licenseSpecialTerms,
        activityName,
        activityContent,
        activityBannerUrl,
        activityDemoLinks,
        activityWorkUrl,
        markerThemeId,
    } = useFormContext();
    const [viewport, setViewport] = React.useState<"desktop" | "mobile">("desktop");
    const readerPreferences = useReaderPreferences();
    const { markerThemes: globalMarkerThemes, presentationLayoutConfig } = useSettings();

    const [resolvedMarkerConfigs, setResolvedMarkerConfigs] = React.useState(
        () => normalizeMarkerConfigsSchema(defaultMarkerConfigs)
    );

    React.useEffect(() => {
        if (!open) return;
        let cancelled = false;

        const resolve = async () => {
            const base = normalizeMarkerConfigsSchema(defaultMarkerConfigs);
            if (!markerThemeId || markerThemeId === "default") {
                setResolvedMarkerConfigs(base);
                return;
            }
            // 1. Check embedded theme in globalMarkerThemes (user's own themes, already loaded)
            const localTheme = globalMarkerThemes.find((t) => t.id === markerThemeId);
            if (Array.isArray(localTheme?.configs) && localTheme.configs.length > 0) {
                setResolvedMarkerConfigs(normalizeMarkerConfigsSchema(localTheme.configs));
                return;
            }
            // 2. Fetch from public themes API (same as Next /read/[id] page)
            try {
                const themes = await getPublicThemes();
                if (cancelled) return;
                const matched = themes.find((theme) => String((theme as { id?: unknown })?.id || "") === markerThemeId);
                if (matched?.configs) {
                    const normalized = normalizeMarkerConfigsSchema(matched.configs);
                    if (normalized.length > 0) { setResolvedMarkerConfigs(normalized); return; }
                }
            } catch {}
            if (!cancelled) setResolvedMarkerConfigs(base);
        };

        resolve();
        return () => { cancelled = true; };
    }, [open, markerThemeId, globalMarkerThemes]);

    const [fetchedContent, setFetchedContent] = React.useState<string | null>(null);
    React.useEffect(() => {
        if (previewContentFromContext || !previewScriptId) return;
        let cancelled = false;
        getScript(previewScriptId).then((s) => {
            if (!cancelled) setFetchedContent(String(s?.content || ""));
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [previewScriptId, previewContentFromContext]);
    const previewContent = previewContentFromContext || fetchedContent || "";

    const resolvedTags = React.useMemo(
        () => (Array.isArray(currentTags) ? currentTags.map((tag) => String(tag?.name || "").trim()).filter(Boolean) : []),
        [currentTags]
    );

    const resolvedAuthor = React.useMemo(() => {
        const authorStr = String(author || "").trim();
        const useOverride = String(authorDisplayMode || "").toLowerCase() === "override" && Boolean(authorStr);
        if (useOverride) {
            return { id: "override-author", displayName: authorStr, avatarUrl: "" };
        }
        // Resolve from identity (persona:id or org:id)
        if (identity && identity.startsWith("persona:")) {
            const personaId = identity.slice("persona:".length);
            const persona = (personas as Array<{ id: string; displayName?: string; avatarUrl?: string }>)
                .find((p) => p.id === personaId);
            if (persona) {
                const orgId = selectedOrgId;
                const org = orgId
                    ? (orgs as Array<{ id: string; name?: string; logoUrl?: string }>).find((o) => o.id === orgId)
                    : null;
                return {
                    id: persona.id,
                    displayName: String(persona.displayName || "Unknown"),
                    avatarUrl: String(persona.avatarUrl || ""),
                    organization: org ? { id: org.id, name: String(org.name || "") } : null,
                };
            }
        }
        if (authorStr) {
            return { id: "header-author-fallback", displayName: authorStr, avatarUrl: "" };
        }
        return null;
    }, [author, authorDisplayMode, identity, personas, orgs, selectedOrgId]);

    const normalizedLicenseSpecialTerms = React.useMemo(
        () =>
            (Array.isArray(licenseSpecialTerms) ? licenseSpecialTerms : [])
                .map((item) => String((item as { text?: string } | null)?.text || item || "").trim())
                .filter(Boolean),
        [licenseSpecialTerms]
    );

    const normalizedContactFields = React.useMemo(
        () =>
            (Array.isArray(contactFields) ? contactFields : [])
                .map((field) => ({
                    label: String((field as { label?: string } | null)?.label || "").trim(),
                    value: String((field as { value?: string } | null)?.value || "").trim(),
                }))
                .filter((field) => field.label || field.value),
        [contactFields]
    );

    const normalizedCustomFields = React.useMemo(
        () =>
            (Array.isArray(customFields) ? customFields : [])
                .map((field) => ({
                    type: String((field as { type?: string } | null)?.type || "text"),
                    label: String((field as { label?: string } | null)?.label || "").trim(),
                    value: String((field as { value?: string } | null)?.value || "").trim(),
                }))
                .filter((field) => field.type === "divider" || field.label || field.value),
        [customFields]
    );

    const previewPrefaceItems = React.useMemo(
        () => buildPrefaceItemsFromSections({
            outline,
            roleSetting,
            backgroundInfo,
            performanceInstruction,
            openingIntro,
            chapterSettings,
        }, normalizedCustomFields),
        [outline, roleSetting, backgroundInfo, performanceInstruction, openingIntro, chapterSettings, normalizedCustomFields]
    );

    const previewContact = React.useMemo(
        () => Object.fromEntries(normalizedContactFields.map((field, index) => [field.label || `聯絡方式${index + 1}`, field.value])),
        [normalizedContactFields]
    );

    const previewScript = React.useMemo(
        () => buildPublicReaderProjection({
            title: title || "未命名劇本",
            synopsis: synopsis || "",
            coverUrl: coverUrl || "",
            author: resolvedAuthor,
            organization: null,
            tags: resolvedTags,
            targetAudience: targetAudience || "",
            contentRating: contentRating || "",
            customFields: normalizedCustomFields
                .filter((field) => field.type !== "divider")
                .map((field) => ({
                    key: field.label || "",
                    value: field.value || "",
                })),
            prefaceItems: previewPrefaceItems,
            contact: previewContact,
            commercialUse: licenseCommercial || "",
            derivativeUse: licenseDerivative || "",
            notifyOnModify: licenseNotify || "",
            licenseSpecialTerms: normalizedLicenseSpecialTerms,
            activity: {
                name: activityName || "",
                bannerUrl: activityBannerUrl || "",
                content: activityContent || "",
                workUrl: activityWorkUrl || "",
                demoLinks: activityDemoLinks,
            },
            showMarkerLegend: false,
            content: previewContent || "",
        }),
        [
            title, synopsis, coverUrl, resolvedAuthor,
            resolvedTags, targetAudience, contentRating, normalizedCustomFields,
            previewPrefaceItems, previewContact,
            licenseCommercial, licenseDerivative, licenseNotify, normalizedLicenseSpecialTerms,
            activityName, activityBannerUrl, activityContent, activityWorkUrl, activityDemoLinks,
            previewContent,
        ]
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] w-[95vw] overflow-y-auto p-0 sm:max-w-[900px]">
                <DialogTitle className="sr-only">公開頁預覽</DialogTitle>
                <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">公開頁預覽</div>
                        <div className="inline-flex items-center gap-1 rounded-md border bg-background p-1">
                            {VIEWPORT_OPTIONS.map((opt) => (
                                <Button
                                    key={opt.value}
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className={`h-7 px-2 text-xs ${viewport === opt.value ? "border-primary text-primary" : ""}`}
                                    onClick={() => setViewport(opt.value)}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">預覽使用目前尚未儲存的填寫內容，正式公開以實際儲存資料為準。</p>
                </div>

                <div className="relative overflow-hidden bg-background px-4 py-5 sm:px-6">
                    <div className={`mx-auto h-[72vh] overflow-hidden rounded-2xl border ${viewport === "mobile" ? "max-w-[390px]" : "max-w-[860px]"}`}>
                        <PublicReaderLayout
                            script={previewScript}
                            isLoading={false}
                            relatedSeriesScripts={[]}
                            onOpenRelatedScript={() => {}}
                            onOpenSeries={() => {}}
                            onBack={() => {}}
                            onShare={() => {}}
                            validMarkerConfigs={resolvedMarkerConfigs}
                            hiddenMarkerIds={[]}
                            onToggleMarker={() => {}}
                            viewerProps={{
                                displayPreferences: readerPreferences,
                                usePresentationRenderer: readerPreferences.presentation.enabled,
                                presentationLayoutConfig,
                                markerConfigs: resolvedMarkerConfigs,
                            }}
                            embeddedPreview
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ScriptMetadataDialogInner() {
    const { open, onOpenChange, isSaving, handleSave, t } = useUIContext();
    const [previewOpen, setPreviewOpen] = React.useState(false);
    const { status } = useStatusContext();

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="studio-density flex max-h-[92vh] w-[95vw] flex-col overflow-hidden gap-0 rounded-lg bg-background p-0 sm:max-w-[760px] lg:max-w-[980px] xl:max-w-[1120px]"
                >
                    <ScriptMetadataDialogHeader />
                    <ScriptMetadataDialogBody />
                    <DialogFooter className="flex-row flex-wrap gap-2 space-x-0 border-t bg-background px-4 py-2 sm:px-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
                            預覽
                        </Button>
                        <Button type="button" onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {status === "Public" ? "儲存並更新公開頁" : "儲存為私人"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {previewOpen && <ScriptMetadataPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />}
            <ScriptMetadataDialogOverlays />
        </>
    );
}

export function ScriptMetadataDialog(props: ScriptMetadataDialogProps) {
    return (
        <ScriptMetadataDialogProvider {...props}>
            <ScriptMetadataDialogInner />
        </ScriptMetadataDialogProvider>
    );
}


interface ScriptMetadataPageExtraProps {
    /** Whether the work is currently live on the public site (saved state, not the pending choice). */
    isPublished: boolean;
    backTo: string;
    editHref?: string | null;
}

/**
 * Pre-publish check as one vertical flow: required steps first (they decide
 * whether the work can go public), recommended steps after. Progress counts
 * required items only.
 */
export function PublishChecklistPanel() {
    const { status } = useStatusContext();
    const {
        requiredChecklist = [], recommendedChecklist = [],
        completedChecklistItems, totalChecklistItems, completionPercent,
        completedRecommendedItems = 0, totalRecommendedItems = 0,
        handleJumpToChecklistItem,
    } = useChecklistContext();
    const missingRequired = requiredChecklist.filter((item) => !item.ok);
    const allRequiredDone = missingRequired.length === 0;
    const heading = !allRequiredDone ? `還差 ${missingRequired.length} 項必填` : status === "Public" ? "資料完整，儲存後公開" : "必填資料已完成";

    const renderStep = (item: { key: string; label: string; ok?: boolean }, index: number, required: boolean) => (
        <li key={item.key}>
            <button
                type="button"
                onClick={() => handleJumpToChecklistItem(item.key)}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
            >
                {item.ok ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[hsl(var(--status-live-fg))]" aria-hidden="true" />
                ) : required ? (
                    <AlertCircle className="h-5 w-5 shrink-0 text-[hsl(var(--status-ready-fg))]" aria-hidden="true" />
                ) : (
                    <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">
                    <span className="text-muted-foreground tabular-nums">{index + 1}. </span>
                    <span className={cn(item.ok && "text-muted-foreground")}>{item.label}</span>
                </span>
                <span className={cn("shrink-0 text-xs", item.ok ? "text-muted-foreground" : "font-semibold text-primary")}>
                    {item.ok ? "已完成" : "前往填寫"}
                </span>
            </button>
        </li>
    );

    return (
        <section aria-labelledby="publish-check-title" className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 id="publish-check-title" className="text-base font-semibold">發布前檢查</h2>
                <span className="text-xs text-muted-foreground">
                    {status === "Public" ? "儲存後會立即更新公開頁" : "目前為私人，儲存後不會出現在公開站"}
                </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
                <strong className={cn("text-sm", allRequiredDone ? "text-[hsl(var(--status-live-fg))]" : "text-foreground")}>{heading}</strong>
                <span className="text-xs tabular-nums text-muted-foreground" aria-label={`必填 ${completedChecklistItems} / ${totalChecklistItems}`}>
                    必填 {completedChecklistItems} / {totalChecklistItems}
                </span>
            </div>
            <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={completionPercent}
                aria-label="必填資料完成度"
            >
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPercent}%` }} />
            </div>

            <ol className="mt-3 space-y-0.5" aria-label="必填項目">
                {requiredChecklist.map((item, index) => renderStep(item, index, true))}
            </ol>

            {recommendedChecklist.length > 0 ? (
                <div className="mt-4 border-t border-border pt-3">
                    <div className="flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
                        <span>建議補充（不影響公開）</span>
                        <span className="tabular-nums">{completedRecommendedItems} / {totalRecommendedItems}</span>
                    </div>
                    <ol className="mt-1 space-y-0.5" aria-label="建議項目">
                        {recommendedChecklist.map((item, index) => renderStep(item, requiredChecklist.length + index, false))}
                    </ol>
                </div>
            ) : null}
        </section>
    );
}

/** Sticky section chips: the only navigation, on every viewport. */
function SectionChipNav() {
    const { t } = useUIContext();
    const { activeTab } = useStatusContext();
    const { handleFocusSection, missingRequiredMap } = useChecklistContext();
    const missingBySection = React.useMemo(() => {
        const counts: Record<string, number> = {};
        Object.keys(missingRequiredMap || {}).forEach((key) => {
            const section = CHECKLIST_ITEM_TO_SECTION[key as keyof typeof CHECKLIST_ITEM_TO_SECTION];
            if (section) counts[section] = (counts[section] || 0) + 1;
        });
        return counts;
    }, [missingRequiredMap]);

    return (
        <nav aria-label="表單區段" className="sticky top-0 z-20 shrink-0 border-b border-border bg-background/95 backdrop-blur">
            <ul className="flex gap-1.5 overflow-x-auto px-4 py-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 lg:px-10 [&::-webkit-scrollbar]:hidden">
                {METADATA_SECTIONS.map((section, index) => {
                    const active = activeTab === section.key;
                    const missing = missingBySection[section.key] || 0;
                    return (
                        <li key={section.key} className="shrink-0">
                            <button
                                type="button"
                                onClick={() => handleFocusSection(section.key)}
                                aria-current={active ? "true" : undefined}
                                className={cn(
                                    "inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] transition-colors sm:h-8",
                                    active
                                        ? "border-primary bg-primary/10 font-semibold text-primary"
                                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <span className="tabular-nums text-muted-foreground">{index + 1}</span>
                                {t(section.i18nKey, section.fallback)}
                                {missing > 0 ? (
                                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--status-ready-bg))] px-1 text-[10px] font-semibold text-[hsl(var(--status-ready-fg))]" aria-label={`${missing} 項必填未完成`}>
                                        {missing}
                                    </span>
                                ) : null}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

function ScriptMetadataPageInner({ isPublished, backTo, editHref }: ScriptMetadataPageExtraProps) {
    const { isSaving, handleSave } = useUIContext();
    const { status } = useStatusContext();
    const { title } = useFormContext();
    const { openMobileMenu } = useStudioShell();
    const [previewOpen, setPreviewOpen] = React.useState(false);

    return (
        <div className="studio-density flex h-full min-h-0 flex-col bg-background">
            <header className="shrink-0 border-b border-border px-4 pb-4 pt-3 sm:px-6 lg:px-10 lg:pt-5">
                <div className="flex items-center gap-1">
                    <button type="button" onClick={openMobileMenu} className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:hidden" aria-label="開啟選單">
                        <Menu className="h-5 w-5" />
                    </button>
                    <Link to={backTo} className="inline-flex h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:h-auto">
                        <ArrowLeft className="h-4 w-4" />作品
                    </Link>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                        <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight">{title || "未命名作品"}</h1>
                        <StatusPill status={isPublished ? "live" : "draft"}>{isPublished ? "已公開" : "未公開"}</StatusPill>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {editHref ? (
                            <Button variant="outline" asChild>
                                <Link to={editHref}><FilePenLine className="h-4 w-4" />編輯正文</Link>
                            </Button>
                        ) : null}
                        <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
                            <Eye className="h-4 w-4" />預覽公開頁
                        </Button>
                    </div>
                </div>
            </header>

            <SectionChipNav />

            <ScriptMetadataDialogBody
                stepNumbers
                leading={<PublishChecklistPanel />}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 lg:px-10"
            />

            <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-border bg-background px-4 py-3 sm:px-6 lg:px-10">
                <span className="hidden text-xs text-muted-foreground sm:inline">
                    儲存後：{status === "Public" ? "公開" : "私人"}
                </span>
                <div className="ml-auto flex gap-2 max-sm:w-full">
                    <Button type="button" variant="outline" className="max-sm:flex-1" asChild>
                        <Link to={backTo}>返回作品</Link>
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={isSaving} className="min-w-[140px] max-sm:flex-1">
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {status === "Public" ? "儲存並更新公開頁" : "儲存為私人"}
                    </Button>
                </div>
            </footer>
            {previewOpen && <ScriptMetadataPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />}
            <ScriptMetadataDialogOverlays />
        </div>
    );
}

/**
 * Full-page variant of the publish-information form. Shares the provider,
 * sections, validation and save path with the dialog; only the frame differs.
 */
export function ScriptMetadataPage(props: Omit<ScriptMetadataDialogProps, "open" | "onOpenChange"> & ScriptMetadataPageExtraProps) {
    const { isPublished, backTo, editHref, ...providerProps } = props;
    // The form stays on screen after saving, so closing requests are ignored here.
    const noopOpenChange = React.useCallback(() => {}, []);
    return (
        <ScriptMetadataDialogProvider {...providerProps} open onOpenChange={noopOpenChange}>
            <ScriptMetadataPageInner isPublished={isPublished} backTo={backTo} editHref={editHref} />
        </ScriptMetadataDialogProvider>
    );
}
