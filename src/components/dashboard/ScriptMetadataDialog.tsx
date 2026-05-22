import React from "react";
import { Dialog, DialogContent, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Loader2 } from "lucide-react";
import { ScriptMetadataDialogProvider, ScriptMetadataDialogProps, useFormContext, useUIContext } from "./metadata/ScriptMetadataDialogContext";
import { ScriptMetadataDialogHeader } from "./metadata/ScriptMetadataDialogHeader";
import { ScriptMetadataDialogBody } from "./metadata/ScriptMetadataDialogBody";
import { ScriptMetadataDialogOverlays } from "./metadata/ScriptMetadataDialogOverlays";
import { PublicReaderLayout } from "../reader/PublicReaderLayout";
import { normalizeActivityDemoLinks } from "../../lib/activityDemoLinks";

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
        previewContent,
        synopsis,
        outline,
        roleSetting,
        backgroundInfo,
        performanceInstruction,
        openingIntro,
        chapterSettings,
        coverUrl,
        author,
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
    } = useFormContext();
    const [viewport, setViewport] = React.useState<"desktop" | "mobile">("desktop");

    const resolvedTags = React.useMemo(
        () => (Array.isArray(currentTags) ? currentTags.map((tag) => String(tag?.name || "").trim()).filter(Boolean) : []),
        [currentTags]
    );

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

    const normalizedDemoLinks = React.useMemo(
        () => normalizeActivityDemoLinks(activityDemoLinks),
        [activityDemoLinks]
    );

    const previewPrefaceItems = React.useMemo(
        () => [
            { id: "outline", title: "大綱", value: String(outline || "").trim() },
            { id: "rolesetting", title: "角色設定", value: String(roleSetting || "").trim() },
            { id: "backgroundinfo", title: "背景資訊", value: String(backgroundInfo || "").trim() },
            { id: "performanceinstruction", title: "演繹指示", value: String(performanceInstruction || "").trim() },
            { id: "openingintro", title: "作品的開頭引言", value: String(openingIntro || "").trim() },
            { id: "chaptersettings", title: "章節", value: String(chapterSettings || "").trim() },
            ...normalizedCustomFields
                .filter((field) => field.type !== "divider")
                .map((field, idx) => ({
                    id: `custom-${idx + 1}`,
                    title: field.label || `自訂欄位 ${idx + 1}`,
                    value: field.value,
                })),
        ].filter((item) => item.value),
        [outline, roleSetting, backgroundInfo, performanceInstruction, openingIntro, chapterSettings, normalizedCustomFields]
    );

    const previewContact = React.useMemo(
        () => Object.fromEntries(normalizedContactFields.map((field, index) => [field.label || `聯絡方式${index + 1}`, field.value])),
        [normalizedContactFields]
    );

    const previewScript = React.useMemo(
        () => ({
            title: title || "未命名劇本",
            synopsis: synopsis || "",
            coverUrl: coverUrl || "",
            author: { id: "override-author", displayName: author?.trim() || "尚未填寫" },
            organization: null,
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
                demoLinks: normalizedDemoLinks,
            },
            showMarkerLegend: false,
            content: previewContent || "",
        }),
        [
            title,
            synopsis,
            coverUrl,
            author,
            previewPrefaceItems,
            previewContact,
            licenseCommercial,
            licenseDerivative,
            licenseNotify,
            normalizedLicenseSpecialTerms,
            activityName,
            activityBannerUrl,
            activityContent,
            activityWorkUrl,
            normalizedDemoLinks,
            previewContent,
        ]
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] w-[95vw] overflow-y-auto p-0 sm:max-w-[900px]">
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
                        <div className="border-b bg-background px-3 py-2 text-xs text-muted-foreground">
                            觀眾取向：{targetAudience?.trim() || "未設定"} ｜ 內容分級：{contentRating?.trim() || "未設定"}
                        </div>
                        {resolvedTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 border-b bg-background px-3 py-2">
                                {resolvedTags.map((tag) => (
                                    <Badge key={tag} variant="secondary">{tag}</Badge>
                                ))}
                            </div>
                        )}
                        <PublicReaderLayout
                            script={previewScript}
                            isLoading={false}
                            relatedSeriesScripts={[]}
                            onOpenRelatedScript={() => {}}
                            onOpenSeries={() => {}}
                            onBack={() => {}}
                            onShare={() => {}}
                            validMarkerConfigs={[]}
                            hiddenMarkerIds={[]}
                            onToggleMarker={() => {}}
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
                    className="flex max-h-[92vh] w-[95vw] flex-col overflow-hidden gap-0 bg-background p-0 sm:max-w-[760px] lg:max-w-[980px] xl:max-w-[1120px]"
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
