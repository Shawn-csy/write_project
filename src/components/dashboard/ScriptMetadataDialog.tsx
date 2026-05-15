import React from "react";
import { Dialog, DialogContent, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Loader2 } from "lucide-react";
import { ScriptMetadataDialogProvider, ScriptMetadataDialogProps, useFormContext, useStatusContext, useUIContext } from "./metadata/ScriptMetadataDialogContext";
import { ScriptMetadataDialogHeader } from "./metadata/ScriptMetadataDialogHeader";
import { ScriptMetadataDialogBody } from "./metadata/ScriptMetadataDialogBody";
import { ScriptMetadataDialogOverlays } from "./metadata/ScriptMetadataDialogOverlays";
import { PublicScriptInfoOverlay } from "../reader/PublicScriptInfoOverlay";
import { ActivitySection } from "../reader/ActivitySection";

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

function ScriptMetadataDialogInner() {
    const { open, onOpenChange, showGuide, isSaving, handleSave, t } = useUIContext();
    const { status } = useStatusContext();
    const {
        title,
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
    const [previewOpen, setPreviewOpen] = React.useState(false);
    const [previewViewport, setPreviewViewport] = React.useState<"desktop" | "mobile">("desktop");

    const resolvedTags = React.useMemo(
        () => (Array.isArray(currentTags) ? currentTags.map((tag) => String(tag?.name || "").trim()).filter(Boolean) : []),
        [currentTags]
    );

    const statusText = status === "Public"
        ? t("metadataBasic.public", "公開")
        : t("metadataBasic.private", "私人");

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
        () =>
            (Array.isArray(activityDemoLinks) ? activityDemoLinks : [])
                .map((item) => ({
                    id: String((item as { id?: string } | null)?.id || "").trim(),
                    name: String((item as { name?: string } | null)?.name || "").trim(),
                    url: String((item as { url?: string } | null)?.url || "").trim(),
                    cast: String((item as { cast?: string } | null)?.cast || "").trim(),
                    description: String((item as { description?: string } | null)?.description || "").trim(),
                }))
                .filter((item) => item.url || item.name || item.cast || item.description),
        [activityDemoLinks]
    );

    const previewPrefaceItems = React.useMemo(
        () => [
            { id: "outline", title: "大綱", value: String(outline || "").trim() },
            { id: "rolesetting", title: "角色設定", value: String(roleSetting || "").trim() },
            { id: "backgroundinfo", title: "背景資訊", value: String(backgroundInfo || "").trim() },
            { id: "performanceinstruction", title: "演出指示", value: String(performanceInstruction || "").trim() },
            { id: "openingintro", title: "開場引導", value: String(openingIntro || "").trim() },
            { id: "chaptersettings", title: "章節設定", value: String(chapterSettings || "").trim() },
            ...normalizedCustomFields
                .filter((field) => field.type !== "divider")
                .map((field, idx) => ({
                    id: `custom-${idx + 1}`,
                    title: field.label || `自訂欄位 ${idx + 1}`,
                    value: field.value,
                })),
        ].filter((item) => item.value),
        [
            outline,
            roleSetting,
            backgroundInfo,
            performanceInstruction,
            openingIntro,
            chapterSettings,
            normalizedCustomFields,
        ]
    );

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
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                            預覽
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("scriptMetadataDialog.confirmSave")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-h-[92vh] w-[95vw] overflow-y-auto p-0 sm:max-w-[900px]">
                    <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold">公開頁預覽</div>
                            <div className="inline-flex items-center gap-1 rounded-md border bg-background p-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className={`h-7 px-2 text-xs ${previewViewport === "desktop" ? "border-primary text-primary" : ""}`}
                                    onClick={() => setPreviewViewport("desktop")}
                                >
                                    桌機
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className={`h-7 px-2 text-xs ${previewViewport === "mobile" ? "border-primary text-primary" : ""}`}
                                    onClick={() => setPreviewViewport("mobile")}
                                >
                                    手機
                                </Button>
                            </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">預覽使用目前尚未儲存的填寫內容，正式公開以實際儲存資料為準。</p>
                    </div>

                    <div className="bg-muted/20 px-4 py-5 sm:px-6">
                        <div className={`mx-auto ${previewViewport === "mobile" ? "max-w-[390px]" : "max-w-[860px]"}`}>
                            <div className="mb-3 flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-xs">
                                <span className="text-muted-foreground">公開狀態</span>
                                <Badge
                                    variant="outline"
                                    className={status === "Public"
                                        ? "border-emerald-300 bg-emerald-50/90 text-emerald-700"
                                        : "border-slate-300 bg-slate-50/90 text-slate-700"}
                                >
                                    {statusText}
                                </Badge>
                            </div>
                            <div className="rounded-2xl border bg-background/40 backdrop-blur-sm">
                                <PublicScriptInfoOverlay
                                    title={title || "未命名劇本"}
                                    synopsis={synopsis || ""}
                                    coverUrl={coverUrl || ""}
                                    author={{ id: "override-author", displayName: author?.trim() || "尚未填寫" }}
                                    organization={null}
                                    prefaceItems={previewPrefaceItems}
                                    demoLinks={normalizedDemoLinks}
                                    commercialUse={licenseCommercial || ""}
                                    derivativeUse={licenseDerivative || ""}
                                    notifyOnModify={licenseNotify || ""}
                                    licenseSpecialTerms={normalizedLicenseSpecialTerms}
                                />
                            </div>

                            {(activityName?.trim() || activityContent?.trim() || activityBannerUrl?.trim() || activityWorkUrl?.trim()) ? (
                                <div className="mt-4 rounded-2xl border bg-background/40 py-3 backdrop-blur-sm">
                                    <ActivitySection
                                        name={activityName || ""}
                                        bannerUrl={activityBannerUrl || ""}
                                        content={activityContent || ""}
                                        workUrl={activityWorkUrl || ""}
                                    />
                                </div>
                            ) : null}

                            <section className="mt-4 rounded-xl border bg-background p-4">
                                <h4 className="text-sm font-semibold">詳細資料側欄預覽</h4>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    <div className="rounded-lg border bg-muted/20 p-3">
                                        <div className="text-xs text-muted-foreground">觀眾取向</div>
                                        <div className="mt-1 text-sm font-medium">{targetAudience?.trim() || "未設定"}</div>
                                    </div>
                                    <div className="rounded-lg border bg-muted/20 p-3">
                                        <div className="text-xs text-muted-foreground">內容分級</div>
                                        <div className="mt-1 text-sm font-medium">{contentRating?.trim() || "未設定"}</div>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="text-xs text-muted-foreground">標籤</div>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {resolvedTags.length > 0 ? resolvedTags.map((tag) => (
                                            <Badge key={tag} variant="secondary">{tag}</Badge>
                                        )) : <span className="text-sm text-muted-foreground">尚未設定標籤</span>}
                                    </div>
                                </div>
                                {normalizedContactFields.length > 0 ? (
                                    <div className="mt-3 rounded-lg border p-3">
                                        <div className="text-xs text-muted-foreground">聯絡資訊</div>
                                        <div className="mt-2 space-y-1.5">
                                            {normalizedContactFields.map((field, idx) => (
                                                <div key={`${field.label}-${idx}`} className="text-sm">
                                                    <span className="font-medium">{field.label || "欄位"}：</span>
                                                    <span className="text-muted-foreground">{field.value || "未填寫"}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </section>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
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
