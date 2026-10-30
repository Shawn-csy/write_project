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


const PAGE_SECTIONS = [
    { key: "basic", label: "基本資料" },
    { key: "publish", label: "發布設定" },
    { key: "exposure", label: "展示與分類" },
    { key: "activity", label: "活動宣傳" },
    { key: "demo", label: "試聽範例" },
    { key: "advanced", label: "進階設定" },
] as const;

interface ScriptMetadataPageExtraProps {
    /** Whether the work is currently live on the public site (saved state, not the pending choice). */
    isPublished: boolean;
    backTo: string;
    editHref?: string | null;
}

function PublishChecklistPanel({ compact = false }: { compact?: boolean }) {
    const { status } = useStatusContext();
    const { checklistChipItems, completedChecklistItems, totalChecklistItems, completionPercent, handleJumpToChecklistItem } = useChecklistContext();
    const required = checklistChipItems.filter((item) => item.type === "required");
    const recommended = checklistChipItems.filter((item) => item.type !== "required");
    const heading = required.length > 0 ? `還差 ${required.length} 項必填` : status === "Public" ? "資料完整，儲存後公開" : "必填資料已完成";

    if (compact) {
        if (required.length === 0) return null;
        return (
            <button
                type="button"
                onClick={() => handleJumpToChecklistItem(required[0].key)}
                className="flex w-full items-center gap-2.5 rounded-[10px] border border-[hsl(var(--status-ready-fg))]/25 bg-[hsl(var(--status-ready-bg))] px-3.5 py-3 text-left text-sm text-[hsl(var(--status-ready-fg))]"
            >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="flex-1">還差 {required.length} 項必填：{required.map((item) => item.label).join("、")}</span>
                <span className="font-semibold">前往</span>
            </button>
        );
    }

    return (
        <div className="rounded-[10px] border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
                <strong className="text-[15px]">{heading}</strong>
                <span className="text-xs tabular-nums text-muted-foreground">{completedChecklistItems} / {totalChecklistItems}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPercent}%` }} />
            </div>
            {required.length > 0 ? (
                <div className="mt-3">
                    <div className="px-2 text-xs font-semibold text-[hsl(var(--status-ready-fg))]">必填</div>
                    {required.map((item) => (
                        <button key={item.key} type="button" onClick={() => handleJumpToChecklistItem(item.key)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] hover:bg-muted">
                            <AlertCircle className="h-4 w-4 shrink-0 text-[hsl(var(--status-ready-fg))]" />
                            <span className="flex-1">{item.label}</span>
                            <span className="text-primary">前往</span>
                        </button>
                    ))}
                </div>
            ) : null}
            {recommended.length > 0 ? (
                <div className="mt-2">
                    <div className="px-2 text-xs font-semibold text-muted-foreground">建議</div>
                    {recommended.map((item) => (
                        <button key={item.key} type="button" onClick={() => handleJumpToChecklistItem(item.key)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] hover:bg-muted">
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1">{item.label}</span>
                            <span className="text-primary">前往</span>
                        </button>
                    ))}
                </div>
            ) : null}
            {checklistChipItems.length === 0 ? (
                <p className="mt-3 flex items-center gap-2 text-[13px] text-[hsl(var(--status-live-fg))]">
                    <CheckCircle2 className="h-4 w-4" />所有檢查項目已完成
                </p>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">
                {status === "Public" ? "儲存後會立即更新公開頁。" : "目前設定為私人，儲存後不會出現在公開站。"}
            </p>
        </div>
    );
}

function ScriptMetadataPageInner({ isPublished, backTo, editHref }: ScriptMetadataPageExtraProps) {
    const { isSaving, handleSave } = useUIContext();
    const { status, activeTab } = useStatusContext();
    const { title } = useFormContext();
    const { handleFocusSection } = useChecklistContext();
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

            <div className="flex min-h-0 flex-1">
                <nav aria-label="表單區段" className="hidden w-48 shrink-0 flex-col gap-0.5 overflow-y-auto py-6 pl-10 pr-2 lg:flex">
                    {PAGE_SECTIONS.map((section) => (
                        <button
                            key={section.key}
                            type="button"
                            onClick={() => handleFocusSection(section.key)}
                            aria-current={activeTab === section.key ? "true" : undefined}
                            className={cn(
                                "rounded-md px-3 py-2 text-left text-[13px] transition-colors",
                                activeTab === section.key ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            )}
                        >
                            {section.label}
                        </button>
                    ))}
                </nav>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <div className="px-4 pt-4 sm:px-6 xl:hidden"><PublishChecklistPanel compact /></div>
                    <ScriptMetadataDialogBody className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8" />
                </div>
                <aside aria-label="發布檢查" className="hidden w-80 shrink-0 overflow-y-auto py-6 pl-2 pr-10 xl:block">
                    <PublishChecklistPanel />
                </aside>
            </div>

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
