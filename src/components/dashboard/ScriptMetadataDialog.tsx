import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { ScriptMetadataDialogProvider, ScriptMetadataDialogProps, useFormContext, useUIContext } from "./metadata/ScriptMetadataDialogContext";
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
    const { markerThemes: globalMarkerThemes } = useSettings();

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
                            viewerProps={{ ...readerPreferences, markerConfigs: resolvedMarkerConfigs }}
                            embeddedPreview
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ScriptMetadataDialogInner() {
    const { open, onOpenChange, showGuide, isSaving, handleSave, t } = useUIContext();
    const [previewOpen, setPreviewOpen] = React.useState(false);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="flex max-h-[92vh] w-[95vw] flex-col overflow-hidden gap-0 rounded-lg bg-background p-0 sm:max-w-[760px] lg:max-w-[980px] xl:max-w-[1120px]"
                    onInteractOutside={(e) => {
                        if (showGuide) e.preventDefault();
                    }}
                    onEscapeKeyDown={(e) => {
                        if (showGuide) e.preventDefault();
                    }}
                >
                    <ScriptMetadataDialogHeader />
                    <ScriptMetadataDialogBody />
                    <DialogFooter className="border-t bg-background px-4 py-3 sm:px-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
                            預覽
                        </Button>
                        <Button type="button" onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("scriptMetadataDialog.confirmSave")}
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
