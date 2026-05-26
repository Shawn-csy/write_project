import { Loader2 } from "lucide-react";
import { MetadataSectionBlock } from "./MetadataSectionBlock";
import { ScriptMetadataBasicSection } from "./ScriptMetadataBasicSection";
import { ScriptMetadataPublishSection } from "./ScriptMetadataPublishSection";
import { ScriptMetadataExposureSection } from "./ScriptMetadataExposureSection";
import { ScriptMetadataActivitySection } from "./ScriptMetadataActivitySection";
import { ScriptMetadataDemoSection } from "./ScriptMetadataDemoSection";
import { ScriptMetadataAdvancedSection } from "./ScriptMetadataAdvancedSection";
import { useUIContext, useStatusContext } from "./ScriptMetadataDialogContext";
import type React from "react";

function SectionBlock({ sectionKey, title, sectionId, children }: {
    sectionKey: string;
    title: string;
    sectionId: string;
    children: React.ReactNode;
}) {
    const { collapsedSections, toggleSection } = useStatusContext();
    return (
        <MetadataSectionBlock
            sectionId={sectionId}
            title={title}
            collapsed={Boolean(collapsedSections[sectionKey as keyof typeof collapsedSections])}
            onToggle={() => toggleSection(sectionKey)}
        >
            {children}
        </MetadataSectionBlock>
    );
}

export function ScriptMetadataDialogBody() {
    const { t } = useUIContext();
    const { isInitializing, contentScrollRef, status } = useStatusContext();

    return (
        <div
            ref={contentScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-muted/10 px-4 py-4 sm:px-6 sm:py-5"
        >
            <div className="rounded-xl border border-border/70 bg-background p-4 shadow-sm sm:p-5">
                {isInitializing ? (
                    <div className="flex min-h-[320px] items-center justify-center">
                        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            載入劇本資訊中...
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <SectionBlock sectionKey="basic" title={t("scriptMetadataDialog.tabBasic", "基本資料")} sectionId="metadata-section-basic">
                            <ScriptMetadataBasicSection sectionId={undefined} showTitle={false} />
                        </SectionBlock>

                        <SectionBlock sectionKey="publish" title={t("scriptMetadataDialog.tabPublish", "發布設定")} sectionId="metadata-section-publish">
                            <ScriptMetadataPublishSection sectionId={undefined} showTitle={false} />
                        </SectionBlock>

                        <SectionBlock sectionKey="exposure" title={t("scriptMetadataDialog.tabExposure", "展示與分類")} sectionId="metadata-section-exposure">
                            <ScriptMetadataExposureSection sectionId={undefined} showTitle={false} />
                        </SectionBlock>

                        <SectionBlock sectionKey="activity" title={t("scriptMetadataDialog.tabActivity", "活動宣傳")} sectionId="metadata-section-activity">
                            <ScriptMetadataActivitySection sectionId={undefined} showTitle={false} />
                        </SectionBlock>

                        <SectionBlock sectionKey="demo" title="試聽範例" sectionId="metadata-section-demo">
                            <ScriptMetadataDemoSection sectionId={undefined} showTitle={false} />
                        </SectionBlock>

                        <SectionBlock sectionKey="advanced" title={t("scriptMetadataDialog.tabAdvanced", "進階設定")} sectionId="metadata-section-advanced">
                            <ScriptMetadataAdvancedSection sectionId={undefined} showTitle={false} />
                        </SectionBlock>
                    </div>
                )}
            </div>
        </div>
    );
}
