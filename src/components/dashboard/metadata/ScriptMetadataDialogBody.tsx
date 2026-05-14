import { Loader2 } from "lucide-react";
import { MetadataSectionBlock } from "./MetadataSectionBlock";
import { ScriptMetadataBasicSection } from "./ScriptMetadataBasicSection";
import { ScriptMetadataPublishSection } from "./ScriptMetadataPublishSection";
import { ScriptMetadataExposureSection } from "./ScriptMetadataExposureSection";
import { ScriptMetadataActivitySection } from "./ScriptMetadataActivitySection";
import { ScriptMetadataDemoSection } from "./ScriptMetadataDemoSection";
import { ScriptMetadataAdvancedSection } from "./ScriptMetadataAdvancedSection";
import { useScriptMetadataDialogContext } from "./ScriptMetadataDialogContext";
import type React from "react";

function SectionBlock({ sectionKey, title, sectionId, children }: {
    sectionKey: string;
    title: string;
    sectionId: string;
    children: React.ReactNode;
}) {
    const { collapsedSections, toggleSection } = useScriptMetadataDialogContext();
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
    const {
        t,
        isInitializing,
        contentScrollRef,
        // basic
        title, setTitle,
        identity, setIdentity,
        author, setAuthorWithTracking,
        authorDisplayMode, setAuthorDisplayModeWithTracking,
        currentUser, personas, orgs,
        selectedOrgId, setSelectedOrgId,
        status,
        date, setDate,
        synopsis, setSynopsis,
        outline, setOutline,
        roleSetting, setRoleSetting,
        backgroundInfo, setBackgroundInfo,
        performanceInstruction, setPerformanceInstruction,
        openingIntro, setOpeningIntro,
        chapterSettings, setChapterSettings,
        requiredErrorMap, recommendedErrorMap, missingRequiredMap,
        // publish
        handleSetTargetAudience, targetAudience,
        handleSetContentRating, contentRating,
        licenseCommercial, setLicenseCommercial,
        licenseDerivative, setLicenseDerivative,
        licenseNotify, setLicenseNotify,
        publishNewTerm, setPublishNewTerm,
        addLicenseSpecialTerm, licenseSpecialTerms, removeLicenseSpecialTerm,
        renderRowLabel,
        // exposure
        coverUrl, setCoverUrl,
        handleCoverUpload, openCoverMediaPicker,
        coverUploadError, coverUploadWarning, coverPreviewFailed, setCoverPreviewFailed,
        seriesExpanded, setSeriesExpanded,
        seriesId, setSeriesId,
        seriesName, setSeriesName,
        seriesOrder, setSeriesOrder,
        quickSeriesName, setQuickSeriesName,
        setShowSeriesQuickCreate, showSeriesQuickCreate,
        focusSeriesSelect, handleQuickCreateSeries, isCreatingSeries,
        newTagInput, setNewTagInput,
        handleAddTag, currentTags, handleRemoveTag,
        getRowLabelClass,
        // activity
        activityName, setActivityName,
        activityBannerUrl, setActivityBannerUrl,
        handleActivityBannerUpload, openActivityBannerMediaPicker,
        activityBannerPreviewFailed, setActivityBannerPreviewFailed,
        activityBannerUploadError, activityBannerUploadWarning,
        activityContent, setActivityContent,
        activityWorkUrl, setActivityWorkUrl,
        // demo
        activityDemoLinks,
        handleAddActivityDemoLink, handleUpdateActivityDemoLink, handleRemoveActivityDemoLink,
        // advanced
        markerThemeId, setMarkerThemeId,
        markerThemes,
        showMarkerLegend, setShowMarkerLegend,
        disableCopy, setDisableCopy,
        metadataDetailsCommonProps,
        jsonMode, setJsonMode,
        jsonText, setJsonText,
        jsonError,
        applyJson,
        setIsMediaPickerOpen,
    } = useScriptMetadataDialogContext();

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
                            <ScriptMetadataBasicSection
                                sectionId={undefined}
                                showTitle={false}
                                t={t}
                                title={title}
                                setTitle={setTitle}
                                identity={identity}
                                setIdentity={setIdentity}
                                identityDisplayName={author}
                                currentUser={currentUser}
                                personas={personas}
                                orgs={orgs}
                                selectedOrgId={selectedOrgId}
                                setSelectedOrgId={setSelectedOrgId}
                                status={status}
                                setStatus={() => {}}
                                date={date}
                                setDate={setDate}
                                synopsis={synopsis}
                                setSynopsis={setSynopsis}
                                outline={outline}
                                setOutline={setOutline}
                                roleSetting={roleSetting}
                                setRoleSetting={setRoleSetting}
                                backgroundInfo={backgroundInfo}
                                setBackgroundInfo={setBackgroundInfo}
                                performanceInstruction={performanceInstruction}
                                setPerformanceInstruction={setPerformanceInstruction}
                                openingIntro={openingIntro}
                                setOpeningIntro={setOpeningIntro}
                                chapterSettings={chapterSettings}
                                setChapterSettings={setChapterSettings}
                                requiredErrorMap={requiredErrorMap}
                                recommendedErrorMap={recommendedErrorMap}
                                missingRequiredMap={missingRequiredMap}
                            />
                        </SectionBlock>

                        <SectionBlock sectionKey="publish" title={t("scriptMetadataDialog.tabPublish", "發布設定")} sectionId="metadata-section-publish">
                            <ScriptMetadataPublishSection
                                sectionId={undefined}
                                showTitle={false}
                                t={t}
                                missingRequiredMap={missingRequiredMap}
                                requiredErrorMap={requiredErrorMap}
                                targetAudience={targetAudience}
                                handleSetTargetAudience={handleSetTargetAudience}
                                contentRating={contentRating}
                                handleSetContentRating={handleSetContentRating}
                                licenseCommercial={licenseCommercial}
                                setLicenseCommercial={setLicenseCommercial}
                                licenseDerivative={licenseDerivative}
                                setLicenseDerivative={setLicenseDerivative}
                                licenseNotify={licenseNotify}
                                setLicenseNotify={setLicenseNotify}
                                publishNewTerm={publishNewTerm}
                                setPublishNewTerm={setPublishNewTerm}
                                addLicenseSpecialTerm={addLicenseSpecialTerm}
                                licenseSpecialTerms={licenseSpecialTerms}
                                removeLicenseSpecialTerm={removeLicenseSpecialTerm}
                                renderRowLabel={renderRowLabel}
                            />
                        </SectionBlock>

                        <SectionBlock sectionKey="exposure" title={t("scriptMetadataDialog.tabExposure", "曝光資訊")} sectionId="metadata-section-exposure">
                            <ScriptMetadataExposureSection
                                sectionId={undefined}
                                showTitle={false}
                                t={t}
                                title={title}
                                author={author}
                                setAuthor={setAuthorWithTracking}
                                authorDisplayMode={authorDisplayMode}
                                setAuthorDisplayMode={setAuthorDisplayModeWithTracking}
                                getRowLabelClass={getRowLabelClass}
                                coverUrl={coverUrl}
                                setCoverUrl={setCoverUrl}
                                handleCoverUpload={handleCoverUpload}
                                setIsMediaPickerOpen={(open: boolean) => {
                                    if (open) openCoverMediaPicker();
                                    else setIsMediaPickerOpen(false);
                                }}
                                coverUploadError={coverUploadError}
                                coverUploadWarning={coverUploadWarning}
                                coverPreviewFailed={coverPreviewFailed}
                                setCoverPreviewFailed={setCoverPreviewFailed}
                                recommendedErrorMap={recommendedErrorMap}
                                seriesExpanded={seriesExpanded}
                                setSeriesExpanded={setSeriesExpanded}
                                setSeriesId={setSeriesId}
                                setSeriesName={setSeriesName}
                                setSeriesOrder={setSeriesOrder}
                                setQuickSeriesName={setQuickSeriesName}
                                setShowSeriesQuickCreate={setShowSeriesQuickCreate}
                                focusSeriesSelect={focusSeriesSelect}
                                seriesId={seriesId}
                                seriesOptions={[]}
                                showSeriesQuickCreate={showSeriesQuickCreate}
                                quickSeriesName={quickSeriesName}
                                handleQuickCreateSeries={handleQuickCreateSeries}
                                isCreatingSeries={isCreatingSeries}
                                seriesOrder={seriesOrder}
                                newTagInput={newTagInput}
                                setNewTagInput={setNewTagInput}
                                handleAddTag={handleAddTag}
                                currentTags={currentTags}
                                handleRemoveTag={handleRemoveTag}
                            />
                        </SectionBlock>

                        <SectionBlock sectionKey="activity" title={t("scriptMetadataDialog.tabActivity", "活動宣傳")} sectionId="metadata-section-activity">
                            <ScriptMetadataActivitySection
                                sectionId={undefined}
                                showTitle={false}
                                t={t}
                                getRowLabelClass={getRowLabelClass}
                                activityName={activityName}
                                setActivityName={setActivityName}
                                activityBannerUrl={activityBannerUrl}
                                setActivityBannerUrl={setActivityBannerUrl}
                                handleActivityBannerUpload={handleActivityBannerUpload}
                                onOpenActivityBannerMediaPicker={openActivityBannerMediaPicker}
                                activityBannerPreviewFailed={activityBannerPreviewFailed}
                                setActivityBannerPreviewFailed={setActivityBannerPreviewFailed}
                                activityBannerUploadError={activityBannerUploadError}
                                activityBannerUploadWarning={activityBannerUploadWarning}
                                activityContent={activityContent}
                                setActivityContent={setActivityContent}
                                activityWorkUrl={activityWorkUrl}
                                setActivityWorkUrl={setActivityWorkUrl}
                            />
                        </SectionBlock>

                        <SectionBlock sectionKey="demo" title="試聽範例" sectionId="metadata-section-demo">
                            <ScriptMetadataDemoSection
                                sectionId={undefined}
                                showTitle={false}
                                getRowLabelClass={getRowLabelClass}
                                activityDemoLinks={activityDemoLinks}
                                onAddActivityDemoLink={handleAddActivityDemoLink}
                                onUpdateActivityDemoLink={handleUpdateActivityDemoLink}
                                onRemoveActivityDemoLink={handleRemoveActivityDemoLink}
                            />
                        </SectionBlock>

                        <SectionBlock sectionKey="advanced" title={t("scriptMetadataDialog.tabAdvanced", "進階設定")} sectionId="metadata-section-advanced">
                            <ScriptMetadataAdvancedSection
                                sectionId={undefined}
                                showTitle={false}
                                t={t}
                                getRowLabelClass={getRowLabelClass}
                                markerThemeId={markerThemeId}
                                setMarkerThemeId={setMarkerThemeId}
                                markerThemes={markerThemes}
                                showMarkerLegend={showMarkerLegend}
                                setShowMarkerLegend={setShowMarkerLegend}
                                disableCopy={disableCopy}
                                setDisableCopy={setDisableCopy}
                                metadataDetailsCommonProps={metadataDetailsCommonProps}
                                jsonMode={jsonMode}
                                setJsonMode={setJsonMode}
                                jsonText={jsonText}
                                setJsonText={setJsonText}
                                jsonError={jsonError}
                                applyJson={applyJson}
                            />
                        </SectionBlock>
                    </div>
                )}
            </div>
        </div>
    );
}
