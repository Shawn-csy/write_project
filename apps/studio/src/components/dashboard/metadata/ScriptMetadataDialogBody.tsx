import { FormSkeleton } from "../../studio/StudioSkeleton";
import { MetadataSectionBlock } from "./MetadataSectionBlock";
import { ScriptMetadataBasicSection } from "./ScriptMetadataBasicSection";
import { ScriptMetadataPublishSection } from "./ScriptMetadataPublishSection";
import { ScriptMetadataExposureSection } from "./ScriptMetadataExposureSection";
import { ScriptMetadataActivitySection } from "./ScriptMetadataActivitySection";
import { ScriptMetadataDemoSection } from "./ScriptMetadataDemoSection";
import { ScriptMetadataAdvancedSection } from "./ScriptMetadataAdvancedSection";
import { useUIContext, useStatusContext } from "./ScriptMetadataDialogContext";
import { METADATA_SECTIONS } from "./metadataSections";
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

export function ScriptMetadataDialogBody({ className, leading, stepNumbers = false }: { className?: string; leading?: React.ReactNode; stepNumbers?: boolean } = {}) {
    const { t } = useUIContext();
    const { isInitializing, contentScrollRef } = useStatusContext();
    const titleOf = (key: string, index: number) => {
        const meta = METADATA_SECTIONS.find((item) => item.key === key)!;
        const label = t(meta.i18nKey, meta.fallback);
        return stepNumbers ? `${index + 1}. ${label}` : label;
    };

    return (
        <div
            ref={contentScrollRef}
            className={className || "min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-muted/10 px-4 py-4 sm:px-6 sm:py-5"}
        >
            <div className={leading ? "mx-auto w-full max-w-3xl space-y-4" : undefined}>
                {leading}
                {isInitializing ? (
                    <FormSkeleton blocks={4} label="載入作品資料中" />
                ) : (
                    <div className="space-y-4">
                        <SectionBlock sectionKey="basic" title={titleOf("basic", 0)} sectionId="metadata-section-basic">
                            <ScriptMetadataBasicSection sectionId={undefined} showTitle={false} />
                        </SectionBlock>

                        <SectionBlock sectionKey="publish" title={titleOf("publish", 1)} sectionId="metadata-section-publish">
                            <ScriptMetadataPublishSection sectionId={undefined} showTitle={false} />
                        </SectionBlock>

                        <SectionBlock sectionKey="exposure" title={titleOf("exposure", 2)} sectionId="metadata-section-exposure">
                            <ScriptMetadataExposureSection sectionId={undefined} showTitle={false} />
                        </SectionBlock>

                        <SectionBlock sectionKey="activity" title={titleOf("activity", 3)} sectionId="metadata-section-activity">
                            <ScriptMetadataActivitySection sectionId={undefined} showTitle={false} />
                        </SectionBlock>

                        <SectionBlock sectionKey="demo" title={titleOf("demo", 4)} sectionId="metadata-section-demo">
                            <ScriptMetadataDemoSection sectionId={undefined} showTitle={false} />
                        </SectionBlock>

                        <SectionBlock sectionKey="advanced" title={titleOf("advanced", 5)} sectionId="metadata-section-advanced">
                            <ScriptMetadataAdvancedSection sectionId={undefined} showTitle={false} />
                        </SectionBlock>
                    </div>
                )}
            </div>
        </div>
    );
}
